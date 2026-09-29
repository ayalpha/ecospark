// src/services/followService.js
// Client surface for the follow system. ALL writes go through /api/follow
// (Admin SDK — see that file for why), which makes duplicates, self-follows
// and counter drift structurally impossible. Reads are direct Firestore
// queries: the social graph is public information.

import { auth, db } from '../lib/firebase';
import {
  doc, getDoc, collection, query, where, limit as qLimit,
  getDocs, onSnapshot,
} from 'firebase/firestore';

const API_URL = ''; // same-origin: Vite dev middleware in dev, Vercel function in prod

async function api(action, body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in to continue.');
  const res = await fetch(`${API_URL}/api/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/** Follow a user. Server-side transaction: edge + both counters atomically.
    Returns { alreadyFollowing, followersCount, followingCount }. */
export async function followUser(targetUid) {
  if (!auth.currentUser) throw new Error('Sign in to continue.');
  return api('follow', { targetUid });
}

/** Unfollow. Same transactional guarantees in reverse. */
export async function unfollowUser(targetUid) {
  if (!auth.currentUser) throw new Error('Sign in to continue.');
  return api('unfollow', { targetUid });
}

/** Do I follow them? One deterministic-id read (free, no listener). */
export async function isFollowing(targetUid) {
  const uid = auth.currentUser?.uid;
  if (!uid || uid === targetUid) return false;
  const snap = await getDoc(doc(db, 'follows', `${uid}_${targetUid}`));
  return snap.exists();
}

/** Do they follow me? Same trick, mirrored id. */
export async function followsMe(targetUid) {
  const uid = auth.currentUser?.uid;
  if (!uid || uid === targetUid) return false;
  const snap = await getDoc(doc(db, 'follows', `${targetUid}_${uid}`));
  return snap.exists();
}

export async function getFollowState(profileId) {
  const [following, followedBy] = await Promise.all([isFollowing(profileId), followsMe(profileId)]);
  return { isFollowing: following, followsMe: followedBy };
}

/** Paginated follower/following lists. `dir`: 'followers' | 'following'.
    One bounded fetch (≤200 edges) + in-memory paging — no composite index,
    the same pattern as walletService.getLedger. Returns { users, nextCursor }
    where nextCursor is the next page offset, or null when exhausted. */
export async function listFollows(uid, dir = 'followers', pageSize = 20, cursor = 0) {
  const field = dir === 'followers' ? 'followingId' : 'followerId';
  const snap = await getDocs(query(
    collection(db, 'follows'),
    where(field, '==', uid),
    qLimit(200),
  ));
  const edges = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  const start = Number(cursor) || 0;
  const page = edges.slice(start, start + pageSize);
  const users = (await Promise.all(page.map(async (e) => {
    const otherId = dir === 'followers' ? e.followerId : e.followingId;
    const u = await getDoc(doc(db, 'users', otherId));
    return u.exists() ? { id: u.id, ...u.data(), _followedAt: e.createdAt } : null;
  })));
  const next = start + pageSize;
  return { users: users.filter(Boolean), nextCursor: next < edges.length ? next : null };
}

/** Live set of uids I follow (bounded listener — capped at 200). Used by the
    community Following feed and the leaderboard Following tab. No orderBy:
    the set is unordered anyway and a composite index would be required. */
export function subscribeMyFollowing(uid, callback) {
  if (!uid) { callback(new Set()); return () => {}; }
  const q = query(
    collection(db, 'follows'),
    where('followerId', '==', uid),
    qLimit(200),
  );
  return onSnapshot(q, (snap) => {
    callback(new Set(snap.docs.map((d) => d.data().followingId)));
  }, () => callback(new Set()));
}

/** Suggested people: mutuals-of-followings first (bounded fan-out), then
    top leaderboard names not already followed. Runs client-side on free
    reads only; cached per session in the caller. */
export async function getSuggestedUsers(myUid, myProfile, myFollowingSet, cap = 6) {
  if (!myUid) return [];
  const scores = new Map(); // uid -> { score, reason }

  const bump = (uid, weight, reason) => {
    if (!uid || uid === myUid || myFollowingSet.has(uid)) return;
    const cur = scores.get(uid);
    if (!cur) { scores.set(uid, { score: weight, reason }); return; }
    cur.score += weight;
    // Keep the strongest reason (first-registered wins ties).
    if (weight > cur.score - weight) cur.reason = reason;
  };

  // 1) Mutuals of my followings — bounded: at most 8 followings, 50 edges each.
  const seeds = [...myFollowingSet].slice(0, 8);
  await Promise.all(seeds.map(async (seed) => {
    const q = query(collection(db, 'follows'), where('followerId', '==', seed), qLimit(50));
    const snap = await getDocs(q).catch(() => null);
    if (!snap) return;
    snap.forEach((d) => {
      const followingId = d.data().followingId;
      // A user my followings follow who also follows me back = strong signal.
      if (!myFollowingSet.has(followingId)) bump(followingId, 3, 'Follows people you follow');
    });
  }));

  // 2) Top leaderboard names not already covered — activity proxy.
  try {
    const lb = await getDocs(query(
      collection(db, 'leaderboard'),
      orderBy('weeklyPoints', 'desc'),
      qLimit(25),
    ));
    lb.forEach((d) => {
      const x = d.data();
      if (x.userId && (x.weeklyPoints || 0) > 0) bump(x.userId, 1, 'Active this week');
    });
  } catch { /* leaderboard optional */ }

  // 3) Same-group classmates (community groups) — shared context signal.
  const groupId = myProfile?.groupId;
  if (groupId) {
    try {
      const g = await getDoc(doc(db, 'groups', groupId));
      const members = g.exists() ? (g.data().memberIds || []) : [];
      members.forEach((m) => bump(m, 2, 'In your group'));
    } catch { /* groups optional */ }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, cap)
    .map(([uid]) => uid);

  // Hydrate profiles in one round-trip each (bounded by cap).
  const users = (await Promise.all(ranked.map(async (uid) => {
    const s = await getDoc(doc(db, 'users', uid)).catch(() => null);
    return s && s.exists() && !(s.data()?.banned) ? { id: s.id, ...s.data() } : null;
  }))).filter(Boolean);

  return users;
}

/** Owner-only counter reconciliation against the live edges. */
export async function reconcileFollowCounts(uid) {
  return api('reconcile', uid ? { uid } : {});
}

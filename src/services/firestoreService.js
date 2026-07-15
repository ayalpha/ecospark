// src/services/firestoreService.js
// All Firestore reads/writes go through here — no direct db.* in components.

import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc,
  deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, increment, arrayUnion, arrayRemove,
  Timestamp, runTransaction, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── USER PROFILES ──────────────────────────────────────────────────────────

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    points: 0,
    streak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    badges: [],
    role: 'student',
    groupId: null,
    referralCode: `ECO-${uid.slice(0, 6).toUpperCase()}`,
    referredBy: null,
    referralCount: 0,
    weeklyPoints: 0,
    totalTasksCompleted: 0,
    totalCO2Saved: 0,
    totalWaterSaved: 0,
    totalWasteSaved: 0,
    notificationsEnabled: true,
    theme: 'forest',
    textSize: 'normal',
    reducedMotion: false,
    highContrast: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function getTasks() {
  // Single orderBy avoids requiring a composite Firestore index
  const snap = await getDocs(
    query(collection(db, 'tasks'), orderBy('category'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeTasks(callback) {
  return onSnapshot(
    query(collection(db, 'tasks'), orderBy('category')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────────────────

export async function createSubmission(userId, taskId, imageUrl, taskMeta = {}) {
  const ref = doc(collection(db, 'submissions'));
  await setDoc(ref, {
    id: ref.id,
    userId,
    taskId,
    imageUrl,
    status: 'pending',
    points: taskMeta.points || 50,
    co2: taskMeta.co2 || 0,
    water: taskMeta.water || 0,
    waste: taskMeta.waste || 0,
    aiVerdict: null,
    confidence: null,
    reason: null,
    flaggedAt: null,
    approvedAt: null,
    rejectedAt: null,
    reviewedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeSubmission(submissionId, callback) {
  return onSnapshot(doc(db, 'submissions', submissionId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function getUserSubmissions(userId, limitCount = 20) {
  const snap = await getDocs(
    query(
      collection(db, 'submissions'),
      where('userId', '==', userId)
    )
  );
  
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  // Sort descending by createdAt in memory to avoid Firestore composite index error
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results.slice(0, limitCount);
}

export async function getFlaggedSubmissions(groupId = null) {
  let q = query(
    collection(db, 'submissions'),
    where('status', 'in', ['flagged', 'pending'])
  );
  if (groupId) {
    q = query(
      collection(db, 'submissions'),
      where('status', 'in', ['flagged', 'pending']),
      where('groupId', '==', groupId)
    );
  }
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results;
}

export async function updateSubmissionStatus(submissionId, status, extra = {}) {
  await updateDoc(doc(db, 'submissions', submissionId), {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}

// ─── STREAKS & POINTS ─────────────────────────────────────────────────────────

export async function awardPointsAndUpdateStreak(userId, taskId, points, impact = {}) {
  const userRef = doc(db, 'users', userId);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');

    const user = userSnap.data();
    const today = new Date().toDateString();
    const lastDate = user.lastActivityDate?.toDate?.()?.toDateString?.() || null;

    let newStreak = user.streak || 0;
    let longestStreak = user.longestStreak || 0;

    if (lastDate === today) {
      // Already active today — don't increment streak
    } else if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
      // Consecutive day
      newStreak += 1;
      longestStreak = Math.max(longestStreak, newStreak);
    } else {
      // Streak broken or first ever
      newStreak = 1;
    }

    tx.update(userRef, {
      points: increment(points),
      weeklyPoints: increment(points),
      streak: newStreak,
      longestStreak,
      lastActivityDate: serverTimestamp(),
      totalTasksCompleted: increment(1),
      totalCO2Saved: increment(impact.co2 || 0),
      totalWaterSaved: increment(impact.water || 0),
      totalWasteSaved: increment(impact.waste || 0),
      updatedAt: serverTimestamp(),
    });

    // Update global leaderboard entry
    const lbRef = doc(db, 'leaderboard', userId);
    tx.set(lbRef, {
      userId,
      displayName: user.displayName,
      photoURL: user.photoURL || null,
      points: increment(points),
      streak: newStreak,
      groupId: user.groupId || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

export async function getLeaderboard(type = 'global', groupId = null, limitCount = 50) {
  let q = query(
    collection(db, 'leaderboard'),
    orderBy('points', 'desc'),
    limit(limitCount)
  );
  if (type === 'group' && groupId) {
    q = query(
      collection(db, 'leaderboard'),
      where('groupId', '==', groupId),
      orderBy('points', 'desc'),
      limit(limitCount)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() }));
}

export function subscribeLeaderboard(type = 'global', groupId = null, callback, onError) {
  let q = query(collection(db, 'leaderboard'), orderBy('points', 'desc'), limit(50));
  if (type === 'group' && groupId) {
    q = query(collection(db, 'leaderboard'), where('groupId', '==', groupId), orderBy('points', 'desc'), limit(50));
  }
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() })));
  }, onError);
}

// ─── REWARDS ──────────────────────────────────────────────────────────────────

export async function getRewards() {
  const snap = await getDocs(query(collection(db, 'rewards'), orderBy('pointCost')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function redeemReward(userId, rewardId, pointCost) {
  const userRef = doc(db, 'users', userId);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    const user = userSnap.data();
    if ((user.points || 0) < pointCost) throw new Error('Insufficient points');

    tx.update(userRef, {
      points: increment(-pointCost),
      badges: arrayUnion(rewardId),
      updatedAt: serverTimestamp(),
    });

    const redemptionRef = doc(collection(db, 'redemptions'));
    tx.set(redemptionRef, {
      userId,
      rewardId,
      pointCost,
      redeemedAt: serverTimestamp(),
    });
  });
}

// ─── COMMUNITY ────────────────────────────────────────────────────────────────

export async function getCommunityPosts(limitCount = 30) {
  const snap = await getDocs(
    query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(limitCount))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeCommunityPosts(callback, onError) {
  return onSnapshot(
    query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(30)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function createCommunityPost(userId, displayName, photoURL, content, imageUrl = null) {
  await addDoc(collection(db, 'community'), {
    userId,
    displayName,
    photoURL: photoURL || null,
    content,
    imageUrl,
    likes: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function toggleLike(postId, userId) {
  const ref = doc(db, 'community', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes = snap.data().likes || [];
  const hasLiked = likes.includes(userId);
  await updateDoc(ref, {
    likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

// ─── GROUPS (Class Challenges) ────────────────────────────────────────────────

export async function createGroup(name, creatorId) {
  const ref = doc(collection(db, 'groups'));
  await setDoc(ref, {
    id: ref.id,
    name,
    creatorId,
    members: [creatorId],
    totalPoints: 0,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', creatorId), { groupId: ref.id });
  return ref.id;
}

export async function joinGroup(groupId, userId) {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(userId),
  });
  await updateDoc(doc(db, 'users', userId), { groupId });
  await updateDoc(doc(db, 'leaderboard', userId), { groupId }, { merge: true });
}

export async function getGroup(groupId) {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getUserNotifications(userId) {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    )
  );
  
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results.slice(0, 20);
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

// ─── REFERRALS ────────────────────────────────────────────────────────────────

export async function processReferral(newUserId, referralCode) {
  // Find referrer by code
  const snap = await getDocs(
    query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1))
  );
  if (snap.empty) return;
  const referrer = snap.docs[0];

  await updateDoc(doc(db, 'users', newUserId), { referredBy: referrer.id });
  await updateDoc(doc(db, 'users', referrer.id), {
    referralCount: increment(1),
    points: increment(50), // bonus points when referree completes first task (called from server)
  });
}

// ─── WEEKLY IMPACT REPORT ────────────────────────────────────────────────────

export async function getWeeklyImpact(userId) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
  
  const snap = await getDocs(
    query(
      collection(db, 'submissions'),
      where('userId', '==', userId)
    )
  );
  
  // Filter in memory for status and date to avoid composite index error
  const approved = snap.docs
    .map((d) => d.data())
    .filter((a) => {
      if (a.status !== 'approved') return false;
      const time = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      return time >= oneWeekAgo;
    });

  return {
    count: approved.length,
    co2Saved: approved.reduce((s, a) => s + (a.co2 || 0), 0),
    waterSaved: approved.reduce((s, a) => s + (a.water || 0), 0),
    wasteSaved: approved.reduce((s, a) => s + (a.waste || 0), 0),
  };
}

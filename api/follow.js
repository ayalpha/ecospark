// api/follow.js
// The trusted follow surface.
//
// Why a serverless function instead of client writes: the Spark plan has no
// Cloud Functions, but Vercel serverless functions with the Firebase Admin
// SDK are free and already power /api/admin and /api/oracle-tick. Follows are
// the one place where a single request must atomically touch THREE documents
// (the follow edge + two counter fields on two different user docs) — client
// code cannot do that safely: Firestore rules only let a user write their own
// /users doc, so the follower could never update the target's followersCount,
// and the /users rules deliberately protect counter fields from self-writes.
// Doing it server-side with the Admin SDK (which bypasses rules) inside one
// transaction makes duplicates, self-follows and counter drift structurally
// impossible. /follows itself is write-false in firestore.rules — the ONLY
// writer in the system is this file.

import { db, FieldValue } from './_lib/firebaseAdmin.js';
import { requireUser, requireOwner, HttpError } from './_lib/auth.js';

const MAX_ACTIONS_PER_MIN = 30;
const rateBuckets = new Map(); // uid -> [timestamps] (best-effort, per warm instance)

function rateLimit(uid) {
  const now = Date.now();
  const arr = (rateBuckets.get(uid) || []).filter((t) => now - t < 60_000);
  if (arr.length >= MAX_ACTIONS_PER_MIN) {
    throw new HttpError(429, 'Slow down a little — try again in a minute.');
  }
  arr.push(now);
  rateBuckets.set(uid, arr);
}

function followId(followerId, followingId) {
  return `${followerId}_${followingId}`;
}

/** Follow: one transaction creates the edge and steps BOTH counters by exact
    values (read-inside-transaction, so counters can never drift). */
async function follow(caller, body) {
  const targetUid = String(body.targetUid || '');
  if (!targetUid) throw new HttpError(400, 'Pick someone to follow.');
  if (targetUid === caller.uid) throw new HttpError(400, "You can't follow yourself.");

  const targetRef = db.collection('users').doc(targetUid);
  const callerRef = db.collection('users').doc(caller.uid);
  const edgeRef = db.collection('follows').doc(followId(caller.uid, targetUid));

  const result = await db.runTransaction(async (tx) => {
    const [targetSnap, edgeSnap] = await tx.getAll(targetRef, edgeRef);
    if (!targetSnap.exists) throw new HttpError(404, "That account doesn't exist.");
    if (targetSnap.data()?.banned) throw new HttpError(403, 'This account has been suspended.');

    if (edgeSnap.exists) {
      // Idempotent: a double-click or a retried request changes nothing.
      const t = targetSnap.data() || {};
      const c = (await callerRef.get()).data() || {};
      return {
        alreadyFollowing: true,
        followersCount: t.followersCount || 0,
        followingCount: c.followingCount || 0,
      };
    }

    const t = targetSnap.data() || {};
    const cSnap = await tx.get(callerRef);
    const c = cSnap.data() || {};

    tx.set(edgeRef, {
      followerId: caller.uid,
      followingId: targetUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(targetRef, { followersCount: Math.max(0, (t.followersCount || 0) + 1) });
    tx.update(callerRef, { followingCount: Math.max(0, (c.followingCount || 0) + 1) });

    return {
      alreadyFollowing: false,
      followersCount: Math.max(0, (t.followersCount || 0) + 1),
      followingCount: Math.max(0, (c.followingCount || 0) + 1),
    };
  });

  // Notification AFTER the commit — a failure here must not roll the follow back.
  if (!result.alreadyFollowing) {
    try {
      const callerSnap = await callerRef.get();
      await db.collection('notifications').add({
        userId: targetUid,
        type: 'follow',
        read: false,
        payload: {
          actorId: caller.uid,
          actorName: callerSnap.data()?.displayName || 'Someone',
          actorPhoto: callerSnap.data()?.photoURL || null,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[follow] notification failed', err.message);
    }
  }

  return result;
}

/** Unfollow: deletes the edge and steps counters back, all inside one
    transaction with the same exact-value discipline. */
async function unfollow(caller, body) {
  const targetUid = String(body.targetUid || '');
  if (!targetUid) throw new HttpError(400, 'Missing target.');
  if (targetUid === caller.uid) throw new HttpError(400, "You can't unfollow yourself.");

  const targetRef = db.collection('users').doc(targetUid);
  const callerRef = db.collection('users').doc(caller.uid);
  const edgeRef = db.collection('follows').doc(followId(caller.uid, targetUid));

  return db.runTransaction(async (tx) => {
    const [edgeSnap, targetSnap, callerSnap] = await tx.getAll(edgeRef, targetRef, callerRef);
    if (!edgeSnap.exists) {
      return {
        ok: true,
        alreadyFollowing: false,
        followersCount: targetSnap.data()?.followersCount || 0,
        followingCount: callerSnap.data()?.followingCount || 0,
      };
    }
    tx.delete(edgeRef);
    tx.update(targetRef, { followersCount: Math.max(0, (targetSnap.data()?.followersCount || 0) - 1) });
    tx.update(callerRef, { followingCount: Math.max(0, (callerSnap.data()?.followingCount || 0) - 1) });
    return {
      ok: true,
      alreadyFollowing: false,
      followersCount: Math.max(0, (targetSnap.data()?.followersCount || 0) - 1),
      followingCount: Math.max(0, (callerSnap.data()?.followingCount || 0) - 1),
    };
  });
}

/** OWNER — recompute counters from the actual /follows edges. Heals any drift
    (e.g. from an era before this API existed). One uid, or every user. */
async function reconcile(caller, body) {
  const countFollowers = async (uid) => {
    const snaps = await db.collection('follows').where('followingId', '==', uid).count().get();
    return snaps.data().count;
  };
  const countFollowing = async (uid) => {
    const snaps = await db.collection('follows').where('followerId', '==', uid).count().get();
    return snaps.data().count;
  };

  if (body.uid) {
    const uid = String(body.uid);
    const [followersCount, followingCount] = await Promise.all([countFollowers(uid), countFollowing(uid)]);
    await db.collection('users').doc(uid).set({ followersCount, followingCount }, { merge: true });
    return { uid, followersCount, followingCount };
  }

  const users = await db.collection('users').limit(200).get();
  const out = [];
  for (const u of users.docs) {
    const [followersCount, followingCount] = await Promise.all([countFollowers(u.id), countFollowing(u.id)]);
    const cur = u.data() || {};
    if ((cur.followersCount || 0) !== followersCount || (cur.followingCount || 0) !== followingCount) {
      await u.ref.set({ followersCount, followingCount }, { merge: true });
      out.push({ uid: u.id, followersCount, followingCount });
    }
  }
  return { reconciled: out.length, users: out.slice(0, 50) };
}

const ACTIONS = {
  follow: { gate: 'user', fn: follow },
  unfollow: { gate: 'user', fn: unfollow },
  reconcile: { gate: 'owner', fn: reconcile },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const entry = ACTIONS[body.action];
    if (!entry) throw new HttpError(400, 'Unknown action.', `action=${body.action}`);

    const caller = await (entry.gate === 'owner' ? requireOwner(req) : requireUser(req));
    if (body.action === 'follow' || body.action === 'unfollow') rateLimit(caller.uid);

    const result = await entry.fn(caller, body);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof HttpError) {
      console.warn('[follow]', err.status, err.message);
      return res.status(err.status).json({ error: err.publicMessage });
    }
    const errorId = `fol_${Date.now().toString(36)}`;
    console.error('[follow] unhandled', errorId, err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.', errorId });
  }
}

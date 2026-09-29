// api/username.js
// The trusted username surface — same architecture as api/follow.js.
//
// A username is a UNIQUE, human-readable handle (@name) shown on profiles and
// used in /@name profile URLs. Uniqueness cannot be enforced by Firestore
// rules, so it lives in a claim-doc collection: /usernames/{name} → { uid }.
// The claim doc and the user's `username` field are written in ONE Admin-SDK
// transaction, so two people can never hold the same handle — not even for a
// millisecond. Clients have NO direct access to /usernames (write-false and,
// until the next rules deploy, default-deny reads too): every change goes
// through this function, which also enforces the vanity rule — at most THREE
// username changes per rolling 30 days per user (the first claim is free).
// The change ledger lives on users/{uid}.usernameChanges, which is protected
// by touchesProtectedFields() so the quota cannot be reset client-side.
//
// `check` (availability) accepts OPTIONAL auth: the signup form probes
// handles before the account exists. Claimed-handle existence is public
// information on every social platform; `set` always requires a full token.

import { db, authAdmin, FieldValue } from './_lib/firebaseAdmin.js';
import { requireUser, HttpError } from './_lib/auth.js';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'owner', 'staff', 'official',
  'ecospark', 'eco', 'spark', 'support', 'help', 'security', 'api', 'root',
  'system', 'null', 'undefined', 'anonymous', 'hello', 'team', 'contact',
]);

const MAX_CHANGES = 3;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // rolling 30 days

const MAX_ACTIONS_PER_MIN = 30;
const rateBuckets = new Map();
function rateLimit(key) {
  const now = Date.now();
  const arr = (rateBuckets.get(key) || []).filter((t) => now - t < 60_000);
  if (arr.length >= MAX_ACTIONS_PER_MIN) {
    throw new HttpError(429, 'Slow down a little — try again in a minute.');
  }
  arr.push(now);
  rateBuckets.set(key, arr);
}

function normalize(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^@+/, '');
}

function assertFormat(username) {
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, 'Usernames are 3–20 characters: lowercase letters, numbers and underscores.');
  }
  if (RESERVED.has(username)) {
    throw new HttpError(409, 'That username is reserved. Try another one.');
  }
}

/** Best-effort caller identity for public-safe endpoints: a valid Bearer
    token yields { uid }, anything else yields null (anonymous probe). */
async function optionalUser(req) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await authAdmin.verifyIdToken(match[1], false);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

/** Peek: is this handle claimable by the caller? Non-authoritative (a claim
    could land between check and set — `set` remains the referee). */
async function check(caller, body) {
  const username = normalize(body.username);
  if (!USERNAME_RE.test(username)) {
    return { available: false, reason: 'invalid', message: '3–20 characters: lowercase letters, numbers and underscores.' };
  }
  if (RESERVED.has(username)) {
    return { available: false, reason: 'reserved', message: 'That username is reserved.' };
  }
  const claim = await db.collection('usernames').doc(username).get();
  if (claim.exists && claim.data().uid !== caller.uid) {
    return { available: false, reason: 'taken', message: 'That username is already taken.' };
  }
  return { available: true };
}

/** Claim / change the caller's username. One transaction: format + reserved
    check, quota check from the user doc's change ledger, release the old
    claim, take the new one, append to the ledger. Idempotent for a no-op set
    of the same name (doesn't burn quota). The FIRST claim a user ever makes
    is free — "three times a month" counts edits, not the initial pick. */
async function set(caller, body) {
  const username = normalize(body.username);
  assertFormat(username);

  const userRef = db.collection('users').doc(caller.uid);
  const newClaimRef = db.collection('usernames').doc(username);

  return db.runTransaction(async (tx) => {
    const [userSnap, newClaimSnap] = await tx.getAll(userRef, newClaimRef);
    if (!userSnap.exists) throw new HttpError(404, 'Profile not found.');
    const user = userSnap.data() || {};
    const current = user.username || null;

    if (current === username) {
      return { username, changed: false, changesUsed: countRecent(user.usernameChanges) };
    }

    const now = Date.now();
    const recent = recentChanges(user.usernameChanges, now);
    if (current) {
      // An edit, not a first claim — quota applies.
      if (recent.length >= MAX_CHANGES) {
        const oldest = Math.min(...recent);
        const freeOn = new Date(oldest + WINDOW_MS).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        throw new HttpError(429, `You've changed your username ${MAX_CHANGES} times in the last 30 days. You can change it again after ${freeOn}.`);
      }
      recent.push(now);
    }

    if (newClaimSnap.exists && newClaimSnap.data().uid !== caller.uid) {
      throw new HttpError(409, 'That username is already taken.');
    }

    if (current) tx.delete(db.collection('usernames').doc(current));
    tx.set(newClaimRef, { uid: caller.uid, createdAt: FieldValue.serverTimestamp() });
    tx.update(userRef, { username, usernameChanges: recent });

    return { username, changed: true, changesUsed: recent.length };
  });
}

function recentChanges(ledger, now) {
  return (ledger || [])
    .map((ms) => (typeof ms === 'number' ? ms : Number(ms) || 0))
    .filter((ms) => ms > 0 && now - ms < WINDOW_MS);
}

function countRecent(ledger) {
  return recentChanges(ledger, Date.now()).length;
}

const ACTIONS = {
  check: { gate: 'optional', fn: check },
  set: { gate: 'user', fn: set },
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

    let caller;
    if (entry.gate === 'user') caller = await requireUser(req);
    else caller = (await optionalUser(req)) || { uid: `ip:${req.socket?.remoteAddress || 'unknown'}` };

    rateLimit(caller.uid);

    const result = await entry.fn(caller, body);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof HttpError) {
      console.warn('[username]', err.status, err.message);
      return res.status(err.status).json({ error: err.publicMessage });
    }
    const errorId = `usr_${Date.now().toString(36)}`;
    console.error('[username] unhandled', errorId, err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.', errorId });
  }
}

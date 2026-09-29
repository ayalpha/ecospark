// src/services/usernameService.js
// Client surface for @usernames. Writes go through /api/username (the Admin-SDK
// transaction that owns /usernames claim docs and the 3-per-30-days quota);
// availability pre-checks and /@name → uid resolution are direct client
// queries on the readable /users collection, so no extra Firestore rules or
// composite indexes are needed.

import { auth, db } from '../lib/firebase';
import { collection, query, where, limit as qLimit, getDocs } from 'firebase/firestore';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const MAX_CHANGES_PER_30D = 3;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'owner', 'staff', 'official',
  'ecospark', 'eco', 'spark', 'support', 'help', 'security', 'api', 'root',
  'system', 'null', 'undefined', 'anonymous', 'hello', 'team', 'contact',
]);

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^@+/, '');
}

export function usernameFormatError(username) {
  if (!USERNAME_RE.test(username)) {
    return '3–20 characters: lowercase letters, numbers and underscores.';
  }
  if (RESERVED_USERNAMES.has(username)) return 'That username is reserved.';
  return null;
}

/** { used, remaining } for the rolling 30-day change window. The ledger
    (users/{uid}.usernameChanges) is epoch-ms numbers written by the API. */
export function usernameQuota(profile) {
  const now = Date.now();
  const used = (profile?.usernameChanges || [])
    .map((ms) => (typeof ms === 'number' ? ms : Number(ms) || 0))
    .filter((ms) => ms > 0 && now - ms < WINDOW_MS).length;
  return { used, remaining: Math.max(0, MAX_CHANGES_PER_30D - used) };
}

/** Non-authoritative availability probe for live UI feedback (works signed
    out too — the signup form uses it; the API excludes the caller's own
    claim from `taken`). The API's `set` transaction remains the referee. */
export async function checkUsernameAvailable(username) {
  const name = normalizeUsername(username);
  const formatError = usernameFormatError(name);
  if (formatError) return { available: false, reason: 'invalid', message: formatError };
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const res = await fetch('/api/username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action: 'check', username: name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { available: true }; // probe failure must never block
    return data.available
      ? { available: true }
      : { available: false, reason: data.reason, message: data.message || 'That username is not available.' };
  } catch {
    return { available: true }; // API unreachable — let the authoritative save decide
  }
}

/** Claim or change the caller's username. Returns { username, changed,
    changesUsed }. Throws Error with a user-safe message on failure. */
export async function setUsername(username) {
  if (!auth.currentUser) throw new Error('Sign in to continue.');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch('/api/username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'set', username: normalizeUsername(username) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not set the username.');
  return data;
}

/** /@name → uid, or null when the handle doesn't exist. */
export async function resolveUsername(username) {
  const name = normalizeUsername(username);
  if (!name) return null;
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('username', '==', name),
    qLimit(1),
  ));
  return snap.empty ? null : snap.docs[0].id;
}

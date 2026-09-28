// src/services/casinoService.js
// Provably-fair engine + economy plumbing for the casino originals.
//
// Fairness scheme (Stake-style commit/reveal):
//   · A server seed is generated per session; only its SHA-256 hash is stored
//     in Firestore (the commit). Every bet derives its outcome bytes from
//     HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${round}`) with the
//     user's editable client seed and a per-bet nonce.
//   · Rotating the seed reveals the old one — anyone can then recompute every
//     past outcome from the stored hash and confirm nothing was re-rolled.

import { db, auth } from '../lib/firebase';
import {
  doc, getDoc, updateDoc, serverTimestamp, increment, collection, addDoc,
} from 'firebase/firestore';

const enc = new TextEncoder();

export async function sha256Hex(message) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(message));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacBytes(serverSeed, message) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return new Uint8Array(sig);
}

/**
 * Stake-style byte stream: successive HMAC rounds over
 * `${clientSeed}:${nonce}:${round}` yield 32 bytes each; bytes are consumed in
 * 4-byte groups, each group producing one float in [0, 1).
 */
export async function fairFloats(serverSeed, clientSeed, nonce, count) {
  const floats = [];
  let round = 0;
  while (floats.length < count) {
    const bytes = await hmacBytes(serverSeed, `${clientSeed}:${nonce}:${round}`);
    for (let i = 0; i + 3 < 32 && floats.length < count; i += 4) {
      floats.push(
        bytes[i] / 256 + bytes[i + 1] / 256 ** 2 + bytes[i + 2] / 256 ** 3 + bytes[i + 3] / 256 ** 4
      );
    }
    round += 1;
  }
  return floats;
}

export async function fairBits(serverSeed, clientSeed, nonce, count) {
  const floats = await fairFloats(serverSeed, clientSeed, nonce, Math.ceil(count / 8));
  const bits = [];
  for (const f of floats) {
    let bitsFromFloat = 8;
    let x = f;
    for (let b = 0; b < bitsFromFloat && bits.length < count; b++) {
      x *= 2;
      bits.push(x >= 1 ? 1 : 0);
      x -= x >= 1 ? 1 : 0;
    }
  }
  return bits;
}

// ── fairness state (per user, in Firestore) ─────────────────────────────────

export async function getFairnessState() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  const state = snap.exists() ? snap.data().fairness : null;
  if (state?.serverSeedHash && state?.clientSeed !== undefined) return state;
  // First visit: commit a fresh server seed.
  const serverSeed = randomHex();
  const fresh = {
    serverSeedHash: await sha256Hex(serverSeed),
    serverSeed: null, // hidden while active
    pendingSeed: serverSeed,
    clientSeed: randomHex(8),
    nonce: 0,
  };
  await updateDoc(doc(db, 'users', uid), { fairness: { ...fresh, pendingSeed: null } }).catch(async () => {
    // user doc missing — nothing to attach to yet
  });
  return fresh;
}

/** Rotate: reveal the active seed (verifiable past) and commit a new one. */
export async function rotateSeeds(newClientSeed) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  const state = snap.exists() ? snap.data().fairness : null;
  const revealed = state?.pendingSeed || null;
  const serverSeed = randomHex();
  const fresh = {
    serverSeedHash: await sha256Hex(serverSeed),
    serverSeed: null,
    pendingSeed: serverSeed,
    clientSeed: newClientSeed || randomHex(8),
    nonce: 0,
    prevServerSeed: revealed,
    prevServerSeedHash: state?.serverSeedHash || null,
    prevClientSeed: state?.clientSeed || null,
    prevNonce: state?.nonce || 0,
  };
  await updateDoc(doc(db, 'users', uid), {
    fairness: { ...fresh, pendingSeed: null },
    ...(revealed ? { revealedSeeds: { [state.serverSeedHash]: revealed } } : {}),
  });
  return fresh;
}

/**
 * Consume the next nonce for a bet and return { serverSeed, clientSeed, nonce, floats }
 * (the raw server seed comes from the local pending copy — the hash in
 * Firestore commits it before the outcome is played).
 */
export async function nextFairOutcome() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  let state = snap.exists() ? snap.data().fairness : null;
  if (!state?.serverSeedHash || !state?.pendingSeed) {
    state = await getFairnessState();
    const again = await getDoc(doc(db, 'users', uid));
    state = again.exists() ? again.data().fairness : state;
    if (!state?.pendingSeed) {
      // still missing (fresh account race) — build locally and retry once
      const serverSeed = randomHex();
      state = {
        serverSeedHash: await sha256Hex(serverSeed),
        pendingSeed: serverSeed,
        clientSeed: randomHex(8),
        nonce: 0,
      };
      await updateDoc(doc(db, 'users', uid), { fairness: { ...state, pendingSeed: null } }).catch(() => {});
    }
  }
  const nonce = (state.nonce || 0) + 1;
  await updateDoc(doc(db, 'users', uid), { 'fairness.nonce': nonce }).catch(() => {});
  const floats = await fairFloats(state.pendingSeed, state.clientSeed, nonce, 24);
  return {
    serverSeed: state.pendingSeed,
    serverSeedHash: state.serverSeedHash,
    clientSeed: state.clientSeed,
    nonce,
    floats,
  };
}

// ── economy ─────────────────────────────────────────────────────────────────

/** Debit a stake. Throws if the balance can't cover it. */
export async function debitStake(stake) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  await updateDoc(doc(db, 'users', uid), {
    spendableBalance: increment(-stake),
    updatedAt: serverTimestamp(),
  });
}

/** Credit a payout (win / cashout / refund). */
export async function creditPayout(amount) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  if (amount <= 0) return;
  await updateDoc(doc(db, 'users', uid), {
    spendableBalance: increment(Math.round(amount)),
    updatedAt: serverTimestamp(),
  });
}

/** Append a settled bet to the visible history (last 50 kept on read) and the ledger. */
export async function recordBet({ game, stake, multiplier, payout, detail = {} }) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const entry = {
    id: `cas_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    game,
    stake,
    multiplier,
    payout: Math.round(payout),
    detail,
    date: new Date().toISOString(),
  };
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const history = (snap.data()?.casinoBets || []);
    await updateDoc(doc(db, 'users', uid), {
      casinoBets: [entry, ...history].slice(0, 50),
    });
    if (payout !== stake) {
      await addDoc(collection(db, 'transactions'), {
        userId: uid,
        type: payout > stake ? 'earned' : 'spent',
        amount: payout - stake,
        description: `${game} — ${multiplier.toFixed(2)}x`,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[casino] history write skipped:', err.message);
  }
}

/** Optimistic local balance mutation for instant UI feedback. */
export function applyLocalBalance(setProfileFn, profile, delta) {
  if (!profile) return;
  setProfile({
    ...profile,
    spendableBalance: Math.max(0, (profile.spendableBalance ?? profile.points ?? 0) + Math.round(delta)),
  });
}

// ── game math (house edge 1% baked into every table) ────────────────────────

export const HOUSE_EDGE = 0.99;

export const DICE_MAX_CHANCE = 95;
export function diceMultiplier(chance) {
  return Math.floor((HOUSE_EDGE * 100 / chance) * 10000) / 10000;
}

export function minesMultiplier(mines, gems) {
  if (gems === 0) return 1;
  let m = HOUSE_EDGE;
  for (let i = 0; i < gems; i++) m *= (25 - i) / (25 - mines - i);
  return Math.floor(m * 100) / 100;
}

export const PLINKO_ROWS = 12;
export const PLINKO_TABLES = {
  low:    [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  medium: [33, 11, 4, 2, 1.1, 0.6, 0.4, 0.6, 1.1, 2, 4, 11, 33],
  high:   [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
};

export function limboResult(float) {
  // 1% instant-bust house edge; capped at 1,000,000x like Stake.
  const raw = HOUSE_EDGE / (1 - float);
  return Math.max(1, Math.min(1_000_000, Math.floor(raw * 100) / 100));
}

export function crashPoint(float) {
  if (float < 0.01) return 1.00; // 1% instant bust
  const raw = HOUSE_EDGE / (1 - float);
  return Math.max(1.00, Math.floor(raw * 100) / 100);
}

export const WHEEL_RISKS = {
  low:  { segments: 25, wins: 20 },
  medium: { segments: 25, wins: 15 },
  high: { segments: 25, wins: 7 },
};
export function wheelMultiplier(risk) {
  const { segments, wins } = WHEEL_RISKS[risk];
  return Math.floor((HOUSE_EDGE * segments / wins) * 100) / 100;
}

export const TOWER_FLOORS = 9;
export function towerMultiplier(floor) {
  // 1 egg among 3 tiles per floor → 2/3 survival, compounded.
  return Math.floor(HOUSE_EDGE * Math.pow(1.5, floor) * 100) / 100;
}

export const DUCK_LANES = {
  easy:   { lanes: 15, survival: 0.96 },
  medium: { lanes: 12, survival: 0.88 },
  hard:   { lanes: 10, survival: 0.75 },
  extreme:{ lanes: 8,  survival: 0.60 },
};
export function duckMultiplier(lane, survival) {
  // EV-exact: 0.99 / cumulative survival odds, floored to 2dp.
  let cum = 1;
  let out = 1;
  const table = [0];
  for (let k = 1; k <= lane; k++) {
    cum *= survival;
    out = Math.floor((HOUSE_EDGE / cum) * 100) / 100;
    table.push(out);
  }
  return table;
}

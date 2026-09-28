// src/services/walletService.js
// Wallet + ledger: point balance ↔ USD equivalence, crypto payout requests,
// and the unified transaction ledger.
//
// Economics: the USD rate is configurable in Admin (settings.global).
//   payoutUsdPer10k — USD value of 10,000 points (default 0.05)
//   payoutMinUsd    — minimum payout size in USD     (default 1.00)
// A requested payout LOCKS its points immediately (spendableBalance is
// deducted in the same breath as the request doc is created); rejecting or
// cancelling refunds them.

import { auth, db } from '../lib/firebase';
import {
  doc, getDoc, updateDoc, increment, collection, addDoc, setDoc,
  query, where, limit as qLimit, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { useSettingsStore } from '../store/settingsStore';

export const COINS = [
  {
    id: 'xmr', name: 'Monero', ticker: 'XMR', network: 'Monero',
    accent: '#F26822', glyph: 'ɱ',
    addrRe: /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/,
    addrHint: 'Standard (4…) or subaddress (8…), 95 characters',
    explorer: (tx) => `https://xmrchain.net/tx/${tx}`,
  },
  {
    id: 'btc', name: 'Bitcoin', ticker: 'BTC', network: 'Bitcoin',
    accent: '#F7931A', glyph: '₿',
    addrRe: /^(bc1[a-z0-9]{20,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    addrHint: 'Native SegWit (bc1…), Legacy (1…) or Script (3…)',
    explorer: (tx) => `https://mempool.space/tx/${tx}`,
  },
  {
    id: 'ltc', name: 'Litecoin', ticker: 'LTC', network: 'Litecoin',
    accent: '#8BA8D8', glyph: 'Ł',
    addrRe: /^(ltc1[a-z0-9]{20,71}|[LM3][a-km-zA-HJ-NP-Z1-9]{26,33})$/,
    addrHint: 'Bech32 (ltc1…) or Legacy (L…/M…)',
    explorer: (tx) => `https://blockchair.com/litecoin/transaction/${tx}`,
  },
  {
    id: 'doge', name: 'Dogecoin', ticker: 'DOGE', network: 'Dogecoin',
    accent: '#C2A633', glyph: 'Ð',
    addrRe: /^(doge1[a-z0-9]{20,71}|D[a-km-zA-HJ-NP-Z1-9]{25,33})$/,
    addrHint: 'Legacy (D…) or Bech32 (doge1…)',
    explorer: (tx) => `https://blockchair.com/dogecoin/transaction/${tx}`,
  },
  {
    id: 'pol', name: 'Polygon', ticker: 'POL', network: 'Polygon PoS',
    accent: '#8247E5', glyph: '⬡',
    addrRe: /^0x[a-fA-F0-9]{40}$/,
    addrHint: 'EVM address (0x…), 42 characters',
    explorer: (tx) => `https://polygonscan.com/tx/${tx}`,
  },
];

export const COIN_MAP = Object.fromEntries(COINS.map((c) => [c.id, c]));

export function getPayoutRate() {
  const s = useSettingsStore.getState().settings || {};
  const per10k = Number(s.payoutUsdPer10k);
  return Number.isFinite(per10k) && per10k > 0 ? per10k : 0.05;
}

export function getMinPayoutUsd() {
  const s = useSettingsStore.getState().settings || {};
  const min = Number(s.payoutMinUsd);
  return Number.isFinite(min) && min > 0 ? min : 1;
}

/** USD value of a point amount at the current configured rate. */
export function pointsToUsd(points) {
  return (points / 10000) * getPayoutRate();
}

/** Minimum points required for a payout at the current rate. */
export function minPayoutPoints() {
  return Math.ceil((getMinPayoutUsd() / getPayoutRate()) * 10000);
}

export function validateAddress(coinId, address) {
  const coin = COIN_MAP[coinId];
  if (!coin) return 'Unknown coin';
  if (!address || !coin.addrRe.test(address.trim())) {
    return `Invalid ${coin.ticker} address — ${coin.addrHint}`;
  }
  return null;
}

/* ── ledger ──────────────────────────────────────────────────────────────── */

function tsOf(x) {
  if (!x) return 0;
  if (x.toMillis) return x.toMillis();
  if (x.seconds) return x.seconds * 1000;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Unified ledger: point transactions + redemptions + payouts, newest first.
 * Fetched without a composite index (userId filter only) and sorted client-
 * side — 200 docs is far beyond this app's scale.
 */
export async function getLedger(max = 200) {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const [txSnap, redSnap, paySnap] = await Promise.all([
    getDocs(query(collection(db, 'transactions'), where('userId', '==', uid), qLimit(max))),
    getDocs(query(collection(db, 'redemptions'), where('userId', '==', uid), qLimit(max))),
    getDocs(query(collection(db, 'payouts'), where('userId', '==', uid), qLimit(max))),
  ]);

  const rows = [];
  txSnap.forEach((d) => {
    const x = d.data();
    rows.push({
      id: d.id, kind: 'tx', type: x.type || 'earned',
      title: x.description || (x.type === 'spent' ? 'Spent' : 'Earned'),
      amount: Number(x.amount) || 0, at: tsOf(x.createdAt),
    });
  });
  redSnap.forEach((d) => {
    const x = d.data();
    rows.push({
      id: d.id, kind: 'redeem', type: 'spent',
      title: `Redeemed: ${x.rewardId || 'reward'}`,
      amount: -(Number(x.cost) || 0), at: tsOf(x.createdAt),
    });
  });
  paySnap.forEach((d) => {
    const x = d.data();
    const label = {
      pending: 'Payout requested',
      paid: 'Payout paid',
      rejected: 'Payout rejected (refunded)',
      cancelled: 'Payout cancelled (refunded)',
    }[x.status] || 'Payout';
    rows.push({
      id: d.id, kind: 'payout', type: x.status === 'paid' ? 'spent' : (x.status === 'pending' ? 'locked' : 'refunded'),
      title: `${label} · ${x.coin?.toUpperCase?.() || x.coin}`,
      amount: x.status === 'pending' ? -(Number(x.points) || 0) : (x.status === 'paid' ? -(Number(x.points) || 0) : 0),
      at: tsOf(x.createdAt), status: x.status, usd: x.usd, txid: x.txid, coin: x.coin,
      raw: x,
    });
  });

  return rows.sort((a, b) => b.at - a.at);
}

/* ── payouts ─────────────────────────────────────────────────────────────── */

export async function requestPayout({ coinId, address, points }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const coin = COIN_MAP[coinId];
  if (!coin) throw new Error('Choose a payout coin');
  const addrErr = validateAddress(coinId, address);
  if (addrErr) throw new Error(addrErr);

  const pts = Math.floor(Number(points));
  if (!Number.isFinite(pts) || pts <= 0) throw new Error('Enter an amount');
  const minPts = minPayoutPoints();
  if (pts < minPts) throw new Error(`Minimum payout is ${getMinPayoutUsd().toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (${minPts.toLocaleString()} points)`);

  const usd = pointsToUsd(pts);
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Profile not found');
  const bal = snap.data().spendableBalance ?? snap.data().points ?? 0;
  if (bal < pts) throw new Error('Not enough points');

  const payoutRef = doc(collection(db, 'payouts'));
  await setDoc(payoutRef, {
    userId: user.uid,
    email: user.email || null,
    coin: coin.id,
    ticker: coin.ticker,
    network: coin.network,
    address: address.trim(),
    points: pts,
    usd,
    ratePer10k: getPayoutRate(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  // Lock the points.
  await updateDoc(userRef, { spendableBalance: increment(-pts), updatedAt: serverTimestamp() });
  try {
    await addDoc(collection(db, 'transactions'), {
      userId: user.uid,
      type: 'spent',
      amount: pts,
      description: `Payout requested · ${coin.ticker} → $${usd.toFixed(2)}`,
      createdAt: serverTimestamp(),
    });
  } catch { /* mirror cosmetic */ }

  return { ok: true, payoutId: payoutRef.id, usd };
}

export async function cancelPayout(payoutId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const ref = doc(db, 'payouts', payoutId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== user.uid) throw new Error('Not your payout');
  if (snap.data().status !== 'pending') throw new Error('Already processed');
  await updateDoc(ref, { status: 'cancelled', cancelledAt: serverTimestamp() });
  const pts = Number(snap.data().points) || 0;
  await updateDoc(doc(db, 'users', user.uid), { spendableBalance: increment(pts), updatedAt: serverTimestamp() });
  return { ok: true, refunded: pts };
}

/* ── admin ───────────────────────────────────────────────────────────────── */

export async function adminListPayouts(max = 100) {
  const snap = await getDocs(query(collection(db, 'payouts'), qLimit(max)));
  const rows = [];
  snap.forEach((d) => rows.push({ id: d.id, ...d.data(), at: tsOf(d.data().createdAt) }));
  return rows.sort((a, b) => {
    const rank = { pending: 0, paid: 1, rejected: 1, cancelled: 2 };
    return (rank[a.status] ?? 3) - (rank[b.status] ?? 3) || b.at - a.at;
  });
}

export async function adminMarkPayoutPaid(payoutId, txid) {
  const ref = doc(db, 'payouts', payoutId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Payout not found');
  if (snap.data().status !== 'pending') throw new Error('Already processed');
  if (!txid || !txid.trim()) throw new Error('A transaction id is required');
  await updateDoc(ref, { status: 'paid', txid: txid.trim(), paidAt: serverTimestamp() });
  return { ok: true };
}

export async function adminRejectPayout(payoutId, reason) {
  const ref = doc(db, 'payouts', payoutId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Payout not found');
  const data = snap.data();
  if (data.status !== 'pending') throw new Error('Already processed');
  await updateDoc(ref, { status: 'rejected', rejectReason: reason || null, rejectedAt: serverTimestamp() });
  // Refund the locked points.
  await updateDoc(doc(db, 'users', data.userId), { spendableBalance: increment(Number(data.points) || 0), updatedAt: serverTimestamp() });
  return { ok: true, refunded: Number(data.points) || 0 };
}

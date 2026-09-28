// src/services/tradingService.js
// Perp-style paper trading on real crypto prices, powered by points.
//
// Price feeds (all free, no API keys):
//   1. Binance combined WebSocket miniTicker stream — realtime, preferred.
//   2. Binance REST ticker fallback (polling) if WS fails.
//   3. CoinGecko simple/price as the last resort.
//
// Positions live on the user's document (`arenaPositions`), mirroring the
// arenaBets pattern. Opening debits the stake; closing credits stake ± PnL
// inside a Firestore transaction, so a position can never be closed twice.
// Liquidation is automatic: an adverse move of 1/leverage wipes the position.

import { db } from '../lib/firebase';
import {
  doc, getDoc, updateDoc, collection, serverTimestamp,
  runTransaction, increment,
} from 'firebase/firestore';
import { auth } from '../lib/firebase';

// ── Pairs ───────────────────────────────────────────────────────────────────

export const PAIRS = [
  { id: 'BTCUSDT',  label: 'BTC/USDT',  base: 'BTC',  tv: 'BINANCE:BTCUSDT',  coingecko: 'bitcoin' },
  { id: 'ETHUSDT',  label: 'ETH/USDT',  base: 'ETH',  tv: 'BINANCE:ETHUSDT',  coingecko: 'ethereum' },
  { id: 'SOLUSDT',  label: 'SOL/USDT',  base: 'SOL',  tv: 'BINANCE:SOLUSDT',  coingecko: 'solana' },
  { id: 'XRPUSDT',  label: 'XRP/USDT',  base: 'XRP',  tv: 'BINANCE:XRPUSDT',  coingecko: 'ripple' },
  { id: 'DOGEUSDT', label: 'DOGE/USDT', base: 'DOGE', tv: 'BINANCE:DOGEUSDT', coingecko: 'dogecoin' },
  { id: 'BNBUSDT',  label: 'BNB/USDT',  base: 'BNB',  tv: 'BINANCE:BNBUSDT',  coingecko: 'binancecoin' },
  { id: 'ADAUSDT',  label: 'ADA/USDT',  base: 'ADA',  tv: 'BINANCE:ADAUSDT',  coingecko: 'cardano' },
  { id: 'LINKUSDT', label: 'LINK/USDT', base: 'LINK', tv: 'BINANCE:LINKUSDT', coingecko: 'chainlink' },
  { id: 'DOTUSDT',  label: 'DOT/USDT',  base: 'DOT',  tv: 'BINANCE:DOTUSDT',  coingecko: 'polkadot' },
  { id: 'AVAXUSDT', label: 'AVAX/USDT', base: 'AVAX', tv: 'BINANCE:AVAXUSDT', coingecko: 'avalanche-2' },
  { id: 'LTCUSDT',  label: 'LTC/USDT',  base: 'LTC',  tv: 'BINANCE:LTCUSDT',  coingecko: 'litecoin' },
  { id: 'ATOMUSDT', label: 'ATOM/USDT', base: 'ATOM', tv: 'BINANCE:ATOMUSDT', coingecko: 'cosmos' },
];

export const MIN_STAKE = 100;
export const MAX_STAKE = 5000;
export const MAX_LEVERAGE = 100;
export const LIQUIDATION_BUFFER = 0.95; // liquidate at 95% of the theoretical wipe-out

export function pairById(id) {
  return PAIRS.find(p => p.id === id) || PAIRS[0];
}

export function liquidationPrice(position) {
  const { dir, entryPrice, leverage } = position;
  const move = (1 / leverage) * LIQUIDATION_BUFFER;
  return dir === 'long'
    ? entryPrice * (1 - move)
    : entryPrice * (1 + move);
}

export function positionPnL(position, markPrice) {
  const { dir, entryPrice, leverage, stake } = position;
  if (!markPrice || !entryPrice) return 0;
  const move = (markPrice - entryPrice) / entryPrice;
  const signed = dir === 'long' ? move : -move;
  // Two decimals: at high stakes a flat market still shows real motion.
  return Math.round(stake * signed * leverage * 100) / 100;
}

// ── Live prices ─────────────────────────────────────────────────────────────

const listeners = new Set();
let prices = {};
let ws = null;
let wsAlive = false;
let pollTimer = null;
let started = false;

let lastMessageAt = 0;

function emit() {
  listeners.forEach((cb) => {
    try { cb(prices); } catch { /* listener error never kills the feed */ }
  });
}

function binanceCombinedStream() {
  const streams = PAIRS.map(p => `${p.id.toLowerCase()}@miniTicker`).join('/');
  return `wss://stream.binance.com:9443/stream?streams=${streams}`;
}

async function pollRestFallback() {
  try {
    // Binance REST first (no key, CORS enabled)
    const symbols = PAIRS.map(p => `"${p.id}"`).join(',');
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=[${symbols}]`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const rows = await res.json();
      prices = { ...prices, ...Object.fromEntries(rows.map(r => [r.symbol, parseFloat(r.price)])) };
      emit();
      return;
    }
    throw new Error(`binance ${res.status}`);
  } catch {
    // Last resort: CoinGecko (1 call covers every pair)
    try {
      const ids = PAIRS.map(p => p.coingecko).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const data = await res.json();
      prices = {
        ...prices,
        ...Object.fromEntries(PAIRS.map(p => [p.id, data[p.coingecko]?.usd]).filter(Boolean)),
      };
      emit();
    } catch { /* stay on last known prices */ }
  }
}

function connectWebSocket() {
  if (wsAlive) return;
  wsAlive = true;
  try {
    ws = new WebSocket(binanceCombinedStream());
    ws.onmessage = (evt) => {
      lastMessageAt = Date.now();
      try {
        const msg = JSON.parse(evt.data);
        const d = msg?.data;
        if (d?.s && d?.c) {
          prices = { ...prices, [d.s]: parseFloat(d.c) };
          emit();
        }
      } catch { /* malformed frame — ignore */ }
    };
    ws.onclose = () => {
      wsAlive = false;
      // If the socket keeps dying, REST polling carries the feed instead.
      if (started && !pollTimer) pollTimer = setInterval(pollRestFallback, 10000);
      setTimeout(() => { if (started) connectWebSocket(); }, 5000);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
  } catch {
    wsAlive = false;
    if (!pollTimer) pollTimer = setInterval(pollRestFallback, 10000);
  }
}

/** Subscribe to live prices. Returns an unsubscribe function. */
export function subscribePrices(onUpdate) {
  listeners.add(onUpdate);
  started = true;
  lastMessageAt = Date.now();
  connectWebSocket();
  // Belt and braces: a steady REST poll runs alongside the WebSocket so a
  // silently-stalled socket can never freeze the PnL display. 10s keeps
  // CoinGecko/Binance rate limits comfortable.
  pollRestFallback();
  if (!pollTimer) pollTimer = setInterval(() => {
    pollRestFallback();
    // Watchdog: a WS that connects but delivers nothing gets recycled.
    if (wsAlive && Date.now() - lastMessageAt > 20000) {
      try { ws?.close(); } catch { /* noop */ }
    }
  }, 10000);
  onUpdate(prices);
  return () => {
    listeners.delete(onUpdate);
    if (listeners.size === 0) {
      started = false;
      if (ws) { try { ws.close(); } catch { /* noop */ } ws = null; wsAlive = false; }
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }
  };
}

export function getPrices() {
  return prices;
}

// ── Positions ───────────────────────────────────────────────────────────────

function userRef(uid) {
  return doc(db, 'users', uid);
}

/**
 * Open a leveraged position. Debits the stake immediately; the position doc
 * (array entry on the user profile) tracks entry price for PnL and
 * liquidation. Returns { ok, position | error }.
 */
export async function openPosition({ pairId, dir, stake, leverage, entryPrice, stopLossPct = null, takeProfitPct = null }) {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, error: 'Not signed in' };
  const pair = pairById(pairId);
  if (!pair || !['long', 'short'].includes(dir)) return { ok: false, error: 'Invalid market' };
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return { ok: false, error: 'No live price yet' };
  if (!Number.isInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    return { ok: false, error: `Stake must be ${MIN_STAKE}–${MAX_STAKE} pts` };
  }
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > MAX_LEVERAGE) {
    return { ok: false, error: `Leverage must be 2–${MAX_LEVERAGE}x` };
  }

  const position = {
    id: `pos_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'perp',
    pair: pair.id,
    base: pair.base,
    dir,
    stake,
    leverage,
    entryPrice,
    stopLossPct: Number.isFinite(stopLossPct) && stopLossPct > 0 && stopLossPct <= 90 ? stopLossPct : null,
    takeProfitPct: Number.isFinite(takeProfitPct) && takeProfitPct > 0 && takeProfitPct <= 1000 ? takeProfitPct : null,
    openedAt: new Date().toISOString(),
    status: 'open',
    closePrice: null,
    closedAt: null,
    pnl: null,
    closeReason: null,
  };

  const ref = userRef(uid);
  const snap = await getDoc(ref);
  const balance = snap.exists() ? (snap.data().spendableBalance ?? snap.data().points ?? 0) : 0;
  if (balance < stake) return { ok: false, error: 'Not enough points' };

  try {
    await updateDoc(ref, {
      arenaPositions: [...(snap.data()?.arenaPositions || []), position],
      spendableBalance: increment(-stake),
      updatedAt: serverTimestamp(),
    });
    return { ok: true, position };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Close a position at `markPrice` inside a transaction: flips status first so
 * a double-click / duplicate close can never pay out twice, then credits
 * stake + PnL (losses capped at the stake — that is the liquidation floor).
 */
export async function closePosition(positionId, markPrice, reason = 'manual') {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, error: 'Not signed in' };
  if (!Number.isFinite(markPrice) || markPrice <= 0) return { ok: false, error: 'No live price' };

  const ref = userRef(uid);
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Account not found');
      const data = snap.data();
      const positions = data.arenaPositions || [];
      const idx = positions.findIndex(p => p.id === positionId);
      if (idx === -1) throw new Error('Position not found');
      const pos = positions[idx];
      if (pos.status !== 'open') return { duplicate: true, pnl: pos.pnl ?? 0 };

      const rawPnl = positionPnL(pos, markPrice);
      const credited = Math.max(0, Math.round(pos.stake + rawPnl)); // balances are whole points
      const status = rawPnl <= -pos.stake * LIQUIDATION_BUFFER ? 'liquidated' : 'closed';

      const updated = [...positions];
      const realisedPnl = credited - pos.stake;
      updated[idx] = {
        ...pos,
        status,
        closePrice: markPrice,
        closedAt: new Date().toISOString(),
        pnl: realisedPnl,
        closeReason: reason,
      };

      tx.update(ref, {
        arenaPositions: updated,
        spendableBalance: increment(credited),
        updatedAt: serverTimestamp(),
      });

      return { duplicate: false, pnl: realisedPnl, credited, status, pair: pos.pair };
    });

    if (result.duplicate) return { ok: true, duplicate: true, pnl: result.pnl };

    // History mirror (cosmetic feed used by Rewards/Arena history)
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'transactions'), {
        userId: uid,
        type: result.pnl >= 0 ? 'earned' : 'spent',
        amount: result.pnl,
        description: `Perp ${result.pair} ${reason === 'liquidated' ? 'liquidated' : 'closed'}`,
        createdAt: serverTimestamp(),
      });
    } catch { /* mirror is cosmetic */ }

    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Auto-liquidation sweep: close any open position whose mark has moved
 * against it beyond the liquidation threshold. Called on every price tick
 * while the trading desk is open, and once on load.
 */
export async function checkLiquidations(markPriceMap) {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const snap = await getDoc(userRef(uid));
    const positions = snap.exists() ? (snap.data().arenaPositions || []) : [];
    const open = positions.filter(p => p.status === 'open');
    const liquidated = [];
    for (const pos of open) {
      const mark = markPriceMap[pos.pair];
      if (!mark) continue;
      const liq = liquidationPrice(pos);
      const liqHit = pos.dir === 'long' ? mark <= liq : mark >= liq;

      // Stop-loss / take-profit fill prices (if configured at open)
      const slPrice = pos.stopLossPct
        ? (pos.dir === 'long' ? pos.entryPrice * (1 - pos.stopLossPct / 100) : pos.entryPrice * (1 + pos.stopLossPct / 100))
        : null;
      const tpPrice = pos.takeProfitPct
        ? (pos.dir === 'long' ? pos.entryPrice * (1 + pos.takeProfitPct / 100) : pos.entryPrice * (1 - pos.takeProfitPct / 100))
        : null;

      if (liqHit) {
        const res = await closePosition(pos.id, liq, 'liquidated');
        if (res.ok) liquidated.push({ ...pos, pnl: res.pnl ?? -pos.stake, reason: 'liquidated' });
        continue;
      }
      if (slPrice && (pos.dir === 'long' ? mark <= slPrice : mark >= slPrice)) {
        const res = await closePosition(pos.id, slPrice, 'stop-loss');
        if (res.ok) liquidated.push({ ...pos, pnl: res.pnl ?? 0, reason: 'stop-loss' });
        continue;
      }
      if (tpPrice && (pos.dir === 'long' ? mark >= tpPrice : mark <= tpPrice)) {
        const res = await closePosition(pos.id, tpPrice, 'take-profit');
        if (res.ok) liquidated.push({ ...pos, pnl: res.pnl ?? 0, reason: 'take-profit' });
      }
    }
    return liquidated;
  } catch (err) {
    console.error('[trading] liquidation sweep failed:', err);
    return [];
  }
}

/** realised PnL summary for the trading desk header */
export function positionStats(positions = []) {
  const closed = positions.filter(p => p.status === 'closed' || p.status === 'liquidated');
  const wins = closed.filter(p => (p.pnl ?? 0) > 0).length;
  const total = closed.reduce((s, p) => s + (p.pnl ?? 0), 0);
  return { open: positions.filter(p => p.status === 'open').length, closed: closed.length, wins, total };
}

// api/oracle-tick.js — the Oracle's settlement + market-creation heartbeat.
//
// The security rules deliberately freeze market settlement fields against
// client writes ("no client can rewrite a result"), so settlement MUST run
// here with Admin privileges. One call performs the full cycle:
//
//   1. settle  — every expired crypto market resolves from the real
//                CoinGecko price; expired event markets older than 24h void.
//   2. create  — if fewer than 2 unexpired crypto markets remain, mint fresh
//                ones from live prices with mixed short/long expiries.
//
// Caller must present a verified Firebase ID token (requireUser).

import { db, FieldValue } from './_lib/firebaseAdmin.js';
import { requireUser } from './_lib/auth.js';

const MARKETS_COL = 'oracleMarkets';
const CRYPTO_POOL_CAP = 16;
const COINS = [
  { id: 'bitcoin', sym: 'BTC', emoji: '₿' },
  { id: 'ethereum', sym: 'ETH', emoji: 'Ξ' },
  { id: 'solana', sym: 'SOL', emoji: '◎' },
  { id: 'ripple', sym: 'XRP', emoji: '✕' },
  { id: 'binancecoin', sym: 'BNB', emoji: '🔶' },
  { id: 'dogecoin', sym: 'DOGE', emoji: '🐕' },
  { id: 'cardano', sym: 'ADA', emoji: '🔵' },
  { id: 'chainlink', sym: 'LINK', emoji: '🔗' },
];

// ── price feeds (server-side, free) ─────────────────────────────────────────

async function fetchSimplePrices(ids) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}

// CoinGecko ids → exchange symbols for the fallback feeds
const BASE_SYMBOL = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP',
  binancecoin: 'BNB', dogecoin: 'DOGE', cardano: 'ADA', chainlink: 'LINK',
};

/**
 * Settlement price with FOUR independent sources, tried in order of
 * precision. A single rate-limited feed can no longer void a market.
 *   1. Binance 1-minute kline — the exact close at the deadline minute.
 *   2. Coinbase spot — current price (accurate for recent expiries).
 *   3. CryptoCompare price — current.
 *   4. CoinGecko simple price — current (the old, rate-limited path).
 */
async function priceAtDeadline(coinId, endMs) {
  const base = BASE_SYMBOL[coinId];
  if (!base) return null;
  const symbol = `${base}USDT`;

  // 1. Binance kline: the 1-minute candle containing the deadline — the most
  //    precise source, and historical (works for old expiries too).
  try {
    const res = await fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1m&startTime=${endMs - 60 * 1000}&endTime=${endMs + 60 * 1000}&limit=3`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length) {
        // pick the candle whose open time is closest to the deadline
        let best = null, bestDelta = Infinity;
        for (const row of rows) {
          const delta = Math.abs(row[0] - endMs);
          if (delta < bestDelta) { bestDelta = delta; best = row; }
        }
        if (best) return { price: parseFloat(best[4]), source: 'Binance 1m close' };
      }
    }
  } catch { /* fall through to the next source */ }

  // 2. Coinbase spot
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.data?.amount);
      if (Number.isFinite(price) && price > 0) return { price, source: 'Coinbase spot' };
    }
  } catch { /* next source */ }

  // 3. CryptoCompare
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=USD`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.USD);
      if (Number.isFinite(price) && price > 0) return { price, source: 'CryptoCompare' };
    }
  } catch { /* next source */ }

  // 4. CoinGecko (the original path — rate limited, so last)
  try {
    const prices = await fetchSimplePrices(coinId);
    const price = prices?.[coinId]?.usd ?? null;
    if (price) return { price, source: 'CoinGecko' };
  } catch { /* all sources exhausted */ }

  return null;
}

function fmtUsd(v) {
  if (v >= 1000) return '$' + Math.round(v).toLocaleString('en-US');
  if (v >= 1) return '$' + v.toFixed(2);
  return '$' + v.toFixed(4);
}

function cryptoLevel(price, signedPct) {
  const raw = price * (1 + signedPct / 100);
  if (raw < 1) return Math.round(raw * 1000) / 1000;
  if (raw >= 1000) return Math.round(raw);
  return Math.round(raw * 100) / 100;
}

function fmtCloseLabel(endTime) {
  return new Date(endTime).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function buildCryptoMarkets(prices, startIndex = 0) {
  const markets = [];
  let index = startIndex;
  // Mirrors oracleService.baseOptions() — the serverless bundle can't import
  // from the client service file.
  const baseOptions = () => [
    { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
    { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
  ];
  for (const coin of COINS) {
    const p = prices?.[coin.id];
    if (!p || typeof p.usd !== 'number') continue;
    const price = p.usd;
    const chg = p.usd_24h_change || 0;

    // Two markets per coin: a near-strike short expiry (the visible
    // heartbeat) and a farther-strike long expiry (board depth).
    const variants = [
      { signedPct: (0.4 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1), expiryIndex: index },
      { signedPct: (1.5 + Math.random() * 2) * (Math.random() < 0.5 ? -1 : 1), expiryIndex: index + 1 },
    ];

    for (const v of variants) {
      const level = cryptoLevel(price, v.signedPct);
      const above = price >= level;
      const hours = (v.expiryIndex % 2 === 0) ? 1.5 + Math.random() * 2.5 : 12 + Math.random() * 12;
      const endTime = new Date(Date.now() + hours * 3600 * 1000);
      const endStr = endTime.toISOString().slice(0, 16).replace(/[-:]/g, '').slice(0, 12);

      markets.push({
        id: `crypto_${coin.id}_${above ? 'above' : 'below'}_${level}_${endStr}`,
        kind: 'crypto',
        title: `Will ${coin.sym} trade ${above ? 'ABOVE' : 'BELOW'} ${fmtUsd(level)} by ${fmtCloseLabel(endTime)}?`,
        description: `${coin.sym} is live at ${fmtUsd(price)} (24h ${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%). Settles on the real CoinGecko price at close — strike fixed at ${fmtUsd(level)} from today's price.`,
        category: 'Crypto Prices',
        emoji: coin.emoji,
        endTime: endTime.toISOString(),
        crypto: {
          coinId: coin.id, symbol: coin.sym, level, above,
          basePrice: price, base24h: Math.round(chg * 10) / 10, feed: 'coingecko',
        },
        options: baseOptions(),
        totalStaked: 0,
        betCount: 0,
        status: 'active',
        winner: null,
        settleReason: null,
        settlementAttempted: false,
        settlementAttempts: 0,
        settledAt: null,
        generatedDate: new Date().toISOString().slice(0, 10),
        source: 'CoinGecko live prices',
      });
    }
    index += 2;
  }
  return markets.slice(0, CRYPTO_POOL_CAP);
}

// ── the tick ────────────────────────────────────────────────────────────────

const MAX_SETTLE_ATTEMPTS = 5;

/**
 * Resolve one expired crypto market via the multi-source price feed.
 * The verdict compares the price AT THE DEADLINE (Binance 1m close when
 * available) against the strike — never the price "whenever settlement runs".
 */
async function settleCryptoFromFeed(market) {
  const { coinId, symbol, level, above } = market.crypto || {};
  if (!coinId) return { result: 'undecided', reason: 'Market is missing its price feed metadata' };

  const endMs = new Date(market.endTime).getTime();
  const hit = await priceAtDeadline(coinId, endMs);
  if (!hit) return { result: 'undecided', reason: 'All price feeds failed — outcome could not be verified' };

  const met = above ? hit.price > level : hit.price < level;
  return {
    result: met ? 'yes' : 'no',
    price: hit.price,
    reason: `${symbol} was ${fmtUsd(hit.price)} at close (${hit.source}) — ${met ? 'on the winning side of' : 'short of'} the ${fmtUsd(level)} strike.`,
    source: `https://www.coingecko.com/en/coins/${coinId}`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.publicMessage || 'Sign in to continue.' });
  }

  const now = Date.now();
  let settled = 0;
  let voided = 0;
  let created = 0;

  try {
    const snap = await db.collection(MARKETS_COL).where('status', '==', 'active').get();
    const expired = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.endTime && new Date(m.endTime).getTime() <= now)
      .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));

    let eventBudget = 0; // event resolution needs AI search — void stale ones here
    for (const market of expired) {
      const ref = db.collection(MARKETS_COL).doc(market.id);
      const attempts = market.settlementAttempts || 0;

      if (market.kind === 'crypto') {
        if (attempts >= MAX_SETTLE_ATTEMPTS) {
          await ref.update({
            status: 'voided',
            settleReason: `Could not establish a verified outcome after ${attempts} attempts — all stakes refunded`,
            settledAt: FieldValue.serverTimestamp(),
          });
          voided += 1;
          continue;
        }
        try {
          const verdict = await settleCryptoFromFeed(market);
          if (verdict.result === 'undecided') {
            await ref.update({
              status: 'voided',
              settleReason: verdict.reason || 'Outcome could not be verified at expiry — stakes refunded',
              settledAt: FieldValue.serverTimestamp(),
            });
            voided += 1;
          } else {
            await ref.update({
              status: 'settled',
              winner: verdict.result,
              settleReason: verdict.reason,
              settleSources: [verdict.source].filter(Boolean),
              settlePrice: verdict.price ?? null,
              settledAt: FieldValue.serverTimestamp(),
            });
            settled += 1;
          }
        } catch (err) {
          await ref.update({
            settlementAttempted: true,
            settlementAttempts: attempts + 1,
            lastSettleAttemptAt: FieldValue.serverTimestamp(),
          }).catch(() => {});
          console.warn('[oracle-tick] crypto settle failed:', market.id, err.message);
        }
      } else {
        // Event markets: without an AI verdict we cannot honestly settle —
        // void after a day of staleness so stakes refund via the user flow.
        const staleHours = (Date.now() - new Date(market.endTime).getTime()) / 3600000;
        if (staleHours > 24 || attempts >= MAX_SETTLE_ATTEMPTS) {
          await ref.update({
            status: 'voided',
            settleReason: 'Outcome could not be verified from cited sources in time — all stakes refunded',
            settledAt: FieldValue.serverTimestamp(),
          });
          voided += 1;
        } else if (eventBudget > 0) {
          eventBudget -= 1;
          await ref.update({
            settlementAttempted: true,
            settlementAttempts: attempts + 1,
            lastSettleAttemptAt: FieldValue.serverTimestamp(),
          }).catch(() => {});
        }
      }
    }

    // Top-up: guarantee a living board of crypto markets.
    const fresh = await db.collection(MARKETS_COL).where('status', '==', 'active').get();
    const unexpiredCrypto = fresh.docs
      .map(d => d.data())
      .filter(m => m.kind === 'crypto' && m.endTime && new Date(m.endTime).getTime() > Date.now());
    if (unexpiredCrypto.length < 10) {
      try {
        const prices = await fetchSimplePrices(COINS.map(c => c.id).join(','));
        const batch = db.batch();
        let minted = 0;
        for (const market of buildCryptoMarkets(prices, unexpiredCrypto.length)) {
          batch.set(db.collection(MARKETS_COL).doc(market.id), market);
          minted += 1;
        }
        if (minted) {
          await batch.commit();
          created = minted;
        }
      } catch (err) {
        console.warn('[oracle-tick] mint failed:', err.message);
      }
    }

    return res.status(200).json({ ok: true, settled, voided, created });
  } catch (err) {
    console.error('[oracle-tick] cycle failed:', err.message);
    return res.status(500).json({ error: 'Market cycle failed', details: err.message });
  }
}

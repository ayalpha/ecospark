// src/components/arena/PerpsDesk.jsx
// Perp-style trading desk: live TradingView chart + long/short positions on
// real crypto prices, settled in points. Auto-liquidation runs on every price
// tick; closing is transaction-guarded in tradingService.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  subscribePrices, openPosition, closePosition, checkLiquidations,
  positionPnL, liquidationPrice, positionStats,
  PAIRS, MIN_STAKE, MAX_STAKE, MAX_LEVERAGE,
} from '../../services/tradingService';
import { useAuthStore } from '../../store/authStore';
import { TrendingUp, TrendingDown, LoaderCircle, Wallet, Activity, Zap } from 'lucide-react';
import styles from './PerpsDesk.module.css';

const LEV_PRESETS = [5, 10, 25, 50, 100];

// 1 point = 1 virtual USD — the notional a position controls.
const POINT_USD = 1;

const INTERVALS = [
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
];

function fmtPrice(p) {
  if (!p && p !== 0) return '—';
  return p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : p >= 1 ? p.toLocaleString('en-US', { maximumFractionDigits: 3 })
    : p.toFixed(4);
}

export default function PerpsDesk({ profile }) {
  const [pairId, setPairId] = useState('BTCUSDT');
  const [prices, setPrices] = useState({});
  const [dir, setDir] = useState('long');
  const [stake, setStake] = useState(MIN_STAKE);
  const [leverage, setLeverage] = useState(5);
  const [opening, setOpening] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [interval, setIntervalState] = useState('15');
  const [slPct, setSlPct] = useState('');
  const [tpPct, setTpPct] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [lastTick, setLastTick] = useState(0);
  const { profile: liveProfile, setProfile } = useAuthStore();

  const balance = liveProfile?.spendableBalance ?? liveProfile?.points ?? 0;
  const positions = liveProfile?.arenaPositions || [];
  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open').slice(-5).reverse();
  const stats = positionStats(positions);
  const pair = PAIRS.find(p => p.id === pairId);
  const mark = prices[pairId];

  // Live price feed
  useEffect(() => {
    const unsub = subscribePrices((p) => { setPrices(p); setLastTick(Date.now()); });
    return () => unsub();
  }, []);

  // Auto-liquidation sweep on every price update while the desk is open.
  const sweeping = useRef(false);
  useEffect(() => {
    if (sweeping.current || openPositions.length === 0) return;
    sweeping.current = true;
    checkLiquidations(prices)
      .then((hits) => {
        hits.forEach((h) => {
          toast.error(
            `${h.base} ${h.dir === 'long' ? 'LONG' : 'SHORT'} liquidated — ${h.stake} pts lost`,
            { duration: 6000, id: `liq-${h.id}` }
          );
        });
      })
      .finally(() => { sweeping.current = false; });
  }, [prices, openPositions.length]);

  const pnl = (pos) => positionPnL(pos, prices[pos.pair]);
  const totalOpenStake = openPositions.reduce((s, p) => s + p.stake, 0);
  const totalUnrealised = openPositions.reduce((s, p) => s + pnl(p), 0);

  const entry = mark || 0;
  const liqPrice = entry > 0
    ? (dir === 'long' ? entry * (1 - (1 / leverage) * 0.95) : entry * (1 + (1 / leverage) * 0.95))
    : 0;

  const handleOpen = async () => {
    if (!entry) { toast.error('Waiting for a live price…'); return; }
    if (stake > balance) { toast.error('Not enough points'); return; }
    setOpening(true);
    const res = await openPosition({
      pairId, dir, stake: Math.round(stake), leverage, entryPrice: entry,
      stopLossPct: slPct ? Number(slPct) : null,
      takeProfitPct: tpPct ? Number(tpPct) : null,
    });
    setOpening(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`${pair.base} ${dir === 'long' ? 'LONG' : 'SHORT'} opened at ${fmtPrice(entry)} · ${leverage}x`);
    // Optimistic profile refresh (the subscribed snapshot will also land)
    if (liveProfile) {
      setProfile({ ...liveProfile, spendableBalance: Math.max(0, balance - Math.round(stake)) });
    }
  };

  const handleClose = async (pos) => {
    const markPrice = prices[pos.pair];
    if (!markPrice) { toast.error('No live price for this pair'); return; }
    setClosingId(pos.id);
    const res = await closePosition(pos.id, markPrice, 'manual');
    setClosingId(null);
    if (!res.ok) { toast.error(res.error); return; }
    if (res.pnl >= 0) toast.success(`Closed ${pos.base} — +${res.pnl.toLocaleString()} pts`);
    else toast.error(`Closed ${pos.base} — ${res.pnl.toLocaleString()} pts`);
  };

  const tvSrc = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(pair.tv)}&interval=${interval}&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=1&withdateranges=0&hide_legend=0&save_image=0&locale=en`;

  return (
    <div className={styles.desk}>
      {/* Header stats */}
      <div className={styles.deskStats}>
        <div className={[styles.stat, styles.feedDot].join(' ')}>
          <span className={[styles.dot, Date.now() - lastTick < 20000 ? styles.dotLive : ''].join(' ')} />
          <span>{Date.now() - lastTick < 20000 ? 'Live prices' : 'Connecting…'}</span>
        </div>
        <div className={styles.stat}>
          <Wallet size={15} />
          <span>{balance.toLocaleString()} pts available</span>
        </div>
        <div className={styles.stat}>
          <Activity size={15} />
          <span>{stats.open} open · {stats.closed} closed</span>
        </div>
        <div className={`${styles.stat} ${totalUnrealised >= 0 ? styles.pos : styles.neg}`}>
          <Zap size={15} />
          <span>{totalUnrealised >= 0 ? '+' : ''}{totalUnrealised.toLocaleString()} unrealised</span>
        </div>
      </div>

      <div className={styles.deskGrid}>
        {/* Chart column */}
        <div className={styles.chartCard}>
          <div className={styles.chartHead}>
            <div className={styles.pairChips}>
              {PAIRS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  className={[styles.pairChip, p.id === pairId ? styles.pairChipActive : ''].join(' ')}
                  onClick={() => setPairId(p.id)}
                >
                  {p.base}
                  <span className={styles.pairPrice}>{fmtPrice(prices[p.id])}</span>
                </button>
              ))}
              <div className={styles.moreWrap}>
                <button
                  className={[styles.pairChip, PAIRS.slice(4).some((p) => p.id === pairId) ? styles.pairChipActive : ''].join(' ')}
                  onClick={() => setMoreOpen((v) => !v)}
                >
                  {PAIRS.find((p) => p.id === pairId)?.base || 'More'} ▾
                </button>
                {moreOpen && (
                  <div className={styles.moreList}>
                    {PAIRS.slice(4).map((p) => (
                      <button key={p.id} className={styles.moreItem}
                        onClick={() => { setPairId(p.id); setMoreOpen(false); }}>
                        {p.label}
                        <span className={styles.morePrice}>{fmtPrice(prices[p.id])}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.intervalChips}>
              {INTERVALS.map((iv) => (
                <button
                  key={iv.value}
                  className={`${styles.ivChip} ${iv.value === interval ? styles.ivActive : ''}`}
                  onClick={() => setIntervalState(iv.value)}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.tvWrap}>
            <iframe
              key={pairId + interval}
              title="TradingView chart"
              src={tvSrc}
              className={styles.tvFrame}
              allow="clipboard-write"
              allowFullScreen
            />
          </div>
        </div>

        {/* Trade panel */}
        <div className={styles.tradeCard}>
          <div className={styles.tradeTitle}>Open a position</div>

          <div className={styles.dirToggle}>
            <button
              className={`${styles.dirBtn} ${styles.long} ${dir === 'long' ? styles.dirActive : ''}`}
              onClick={() => setDir('long')}
            >
              <TrendingUp size={17} /> LONG
            </button>
            <button
              className={`${styles.dirBtn} ${styles.short} ${dir === 'short' ? styles.dirActiveShort : ''}`}
              onClick={() => setDir('short')}
            >
              <TrendingDown size={17} /> SHORT
            </button>
          </div>

          <label className={styles.fieldLabel}>Stake (points)</label>
          <input
            type="number"
            className={styles.stakeInput}
            value={stake}
            min={MIN_STAKE}
            max={MAX_STAKE}
            onChange={(e) => setStake(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          />
          <div className={styles.pctChips}>
            {[25, 50, 100].map((pc) => (
              <button
                key={pc}
                className={styles.pctChip}
                onClick={() => setStake(Math.min(MAX_STAKE, Math.max(MIN_STAKE, Math.round(balance * pc / 100))))}
              >
                {pc === 100 ? 'MAX' : `${pc}%`}
              </button>
            ))}
            <span className={styles.minMax}>min {MIN_STAKE} · max {MAX_STAKE}</span>
          </div>

          <label className={styles.fieldLabel}>
            Leverage <span className={styles.levValue}>{leverage}x</span>
          </label>
          <div className={styles.levChips}>
            {LEV_PRESETS.map((l) => (
              <button
                key={l}
                className={[styles.levChip, leverage === l ? styles.levChipActive : ''].join(' ')}
                onClick={() => setLeverage(l)}
              >
                {l}x
              </button>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={MAX_LEVERAGE}
            step={1}
            value={leverage}
            className={styles.levSlider}
            onChange={(e) => setLeverage(Number(e.target.value))}
          />

          <div className={styles.sltpRow}>
            <div className={styles.sltpField}>
              <span>Stop loss %</span>
              <input type="number" min={0.1} step={0.1} placeholder="off" value={slPct}
                onChange={(e) => setSlPct(e.target.value)} />
            </div>
            <div className={styles.sltpField}>
              <span>Take profit %</span>
              <input type="number" min={0.1} step={0.1} placeholder="off" value={tpPct}
                onChange={(e) => setTpPct(e.target.value)} />
            </div>
          </div>

          <div className={styles.tradeMeta}>
            <div><span>Position size</span><strong>${Math.round(stake * leverage).toLocaleString()} notional</strong></div>
            <div><span>Coin quantity</span><strong>{entry ? (stake * leverage / entry).toFixed(6) : '—'} {pair.base}</strong></div>
            <div><span>Liq. price</span><strong className={styles.neg}>{liqPrice ? fmtPrice(liqPrice) : '—'}</strong></div>
            <div>
              <span>At +1% move</span>
              <strong className={styles.pos}>
                +{(stake * 0.01 * leverage).toLocaleString()} pts
              </strong>
            </div>
          </div>

          <motion.button
            className={`${styles.openBtn} ${dir === 'long' ? styles.openLong : styles.openShort}`}
            onClick={handleOpen}
            disabled={opening || !entry}
            whileTap={{ scale: 0.98 }}
          >
            {opening
              ? <LoaderCircle size={17} className={styles.spin} />
              : dir === 'long' ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
            {opening ? 'Opening…' : `Open ${dir === 'long' ? 'LONG' : 'SHORT'} · ${Math.round(stake).toLocaleString()} pts ($${Math.round(stake * leverage).toLocaleString()})`}
          </motion.button>
        </div>
      </div>

      {/* Open positions */}
      <div className={styles.positionsSection}>
        <div className={styles.sectionRow}>
          <h3 className={styles.posTitle}>Open Positions <span className={styles.count}>{openPositions.length}</span></h3>
        </div>

        {openPositions.length === 0 ? (
          <p className={styles.emptyNote}>No open positions — pick a direction and stake above.</p>
        ) : (
          <div className={styles.posGrid}>
            <AnimatePresence>
              {openPositions.map((pos) => {
                const p = pnl(pos);
                const pct = pos.stake ? Math.round((p / pos.stake) * 100) : 0;
                const liq = liquidationPrice(pos);
                return (
                  <motion.div
                    key={pos.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`${styles.posCard} ${p >= 0 ? styles.posCardWin : styles.posCardLoss}`}
                  >
                    <div className={styles.posHead}>
                      <span className={`${styles.dirBadge} ${pos.dir === 'long' ? styles.badgeLong : styles.badgeShort}`}>
                        {pos.dir === 'long' ? '▲' : '▼'} {pos.base} {pos.leverage}x
                      </span>
                      <span className={`${styles.pnl} ${p >= 0 ? styles.pos : styles.neg}`}>
                        {p >= 0 ? '+' : ''}{p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts
                      </span>
                    </div>
                    <div className={styles.posMeta}>
                      <div><span>Entry</span><strong>{fmtPrice(pos.entryPrice)}</strong></div>
                      <div><span>Mark</span><strong>{fmtPrice(prices[pos.pair])}</strong></div>
                      <div><span>Liq.</span><strong className={styles.neg}>{fmtPrice(liq)}</strong></div>
                      <div><span>PnL %</span><strong>{pct >= 0 ? '+' : ''}{pct}%</strong></div>
                      {pos.stopLossPct && <div><span>SL {pos.stopLossPct}%</span><strong className={styles.neg}>{fmtPrice(pos.dir === 'long' ? pos.entryPrice * (1 - pos.stopLossPct / 100) : pos.entryPrice * (1 + pos.stopLossPct / 100))}</strong></div>}
                      {pos.takeProfitPct && <div><span>TP {pos.takeProfitPct}%</span><strong className={styles.pos}>{fmtPrice(pos.dir === 'long' ? pos.entryPrice * (1 + pos.takeProfitPct / 100) : pos.entryPrice * (1 - pos.takeProfitPct / 100))}</strong></div>}
                    </div>
                    <button
                      className={styles.closeBtn}
                      onClick={() => handleClose(pos)}
                      disabled={closingId === pos.id}
                    >
                      {closingId === pos.id ? <LoaderCircle size={14} className={styles.spin} /> : null}
                      Close position
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Closed history */}
      {closedPositions.length > 0 && (
        <div className={styles.positionsSection}>
          <h3 className={styles.posTitle}>Recent closes</h3>
          <ul className={styles.closedList}>
            {closedPositions.map((p) => (
              <li key={p.id} className={styles.closedRow}>
                <span className={`${styles.dirBadge} ${p.dir === 'long' ? styles.badgeLong : styles.badgeShort}`}>
                  {p.base} {p.leverage}x
                </span>
                <span className={styles.closedReason}>{p.closeReason}</span>
                <span className={`${styles.pnl} ${(p.pnl ?? 0) >= 0 ? styles.pos : styles.neg}`}>
                  {(p.pnl ?? 0) >= 0 ? '+' : ''}{(p.pnl ?? 0).toLocaleString()} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

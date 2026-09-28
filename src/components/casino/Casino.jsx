// src/components/casino/Casino.jsx
// Stake-style originals casino: lobby + 9 provably-fair games.
// Everything runs on points (1 pt = $1 virtual) through the shared economy.

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Dices, Bomb, CircleDot, TrendingUp, Gauge, Disc3,
  Layers, Egg, Bird, ShieldCheck, RefreshCw, ArrowLeft, LoaderCircle, Hash, Spade,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  getFairnessState, rotateSeeds, nextFairOutcome,
  debitStake, creditPayout, recordBet,
  diceMultiplier, minesMultiplier, PLINKO_ROWS, PLINKO_TABLES,
  limboResult, crashPoint, WHEEL_RISKS, wheelMultiplier,
  TOWER_FLOORS, towerMultiplier, DUCK_LANES,
} from '../../services/casinoService';
import styles from './casino.module.css';

const fmt = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ══════════════════════════ shared bits ══════════════════════════ */

function StakeInput({ stake, setStake, balance, disabled }) {
  const clamp = (v) => Math.max(1, Math.min(5000, Math.round(Number(v) || 0)));
  return (
    <>
      <div className={styles.fieldLabel}>
        <span>Stake</span>
        <span className={styles.fieldLabelValue}>{balance.toLocaleString()} pts available</span>
      </div>
      <div className={styles.stakeRow}>
        <div className={styles.stakeInputWrap}>
          <span className={styles.stakeCoin}>PTS</span>
          <input
            type="number"
            className={styles.stakeInput}
            value={stake}
            disabled={disabled}
            onChange={(e) => setStake(clamp(e.target.value))}
          />
        </div>
        <div className={styles.halfDouble}>
          <button className={styles.miniBtn} disabled={disabled} onClick={() => setStake(clamp(stake / 2))}>½</button>
          <button className={styles.miniBtn} disabled={disabled} onClick={() => setStake(clamp(stake * 2))}>2×</button>
        </div>
      </div>
      <div className={styles.stakeRow}>
        <button className={styles.miniBtn} disabled={disabled} onClick={() => setStake(clamp(balance))} style={{ flex: 1 }}>Max</button>
        <button className={styles.miniBtn} disabled={disabled} onClick={() => setStake(clamp(balance / 2))} style={{ flex: 1 }}>Half</button>
      </div>
    </>
  );
}

function HistoryStrip({ items }) {
  if (!items.length) return null;
  return (
    <div className={styles.histChips}>
      <AnimatePresence initial={false}>
        {items.slice(0, 12).map((h, i) => (
          <motion.span
            key={h.id}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${styles.histChip} ${h.payout > h.stake ? styles.histWin : h.payout > 0 ? styles.histNeutral : styles.histLose}`}
          >
            {h.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════ DICE ══════════════════════════ */

function DiceGame({ profile, setProfile }) {
  const [target, setTarget] = useState(50);
  const [rollUnder, setRollUnder] = useState(true);
  const [stake, setStake] = useState(100);
  const [baseStake, setBaseStake] = useState(100);
  const [roll, setRoll] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('manual');
  const [autoCfg, setAutoCfg] = useState({ bets: 0, onWin: 'reset', onWinPct: 0, onLoss: 'increase', onLossPct: 100, stopProfit: 0, stopLoss: 0 });
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoStat, setAutoStat] = useState({ played: 0, won: 0, lost: 0, profit: 0 });
  const stopRef = useRef(false);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const chance = rollUnder ? target : 100 - target;
  const mult = diceMultiplier(chance);

  const playOnce = async (amount) => {
    const outcome = await nextFairOutcome();
    const value = Math.floor(outcome.floats[0] * 10001) / 100; // 0.00 – 100.00
    const win = rollUnder ? value < target : value > target;
    const payout = win ? Math.round(amount * mult) : 0;

    await debitStake(amount);
    applyBalance(setProfile, profile, -amount);
    if (win) {
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
    }
    await recordBet({ game: 'Dice', stake: amount, multiplier: win ? mult : 0, payout, detail: { roll: value, target, rollUnder } });
    setRoll(value);
    setHistory((h) => [{ id: outcome.nonce + '-' + Date.now(), label: value.toFixed(2), payout, stake: amount }, ...h]);
    return { win, payout, profit: payout - amount };
  };

  const playManual = async () => {
    if (rolling || stake > balance) return;
    setRolling(true);
    await playOnce(stake);
    setRolling(false);
  };

  const runAuto = async () => {
    if (autoRunning) return;
    setAutoRunning(true);
    stopRef.current = false;
    let amount = Math.max(1, Math.round(stake));
    let profit = 0;
    let played = 0;
    let won = 0;
    const maxBets = autoCfg.bets > 0 ? autoCfg.bets : Infinity;

    while (!stopRef.current && played < maxBets) {
      if (amount > balance) { toast.error('Auto stopped — balance too low'); break; }
      if (autoCfg.stopProfit > 0 && profit >= autoCfg.stopProfit) { toast.success('Auto stopped — profit target hit'); break; }
      if (autoCfg.stopLoss > 0 && profit <= -autoCfg.stopLoss) { toast.error('Auto stopped — loss limit hit'); break; }

      const r = await playOnce(amount);
      played += 1;
      profit += r.profit;
      if (r.win) won += 1;
      setAutoStat({ played, won, lost: played - won, profit });

      if (r.win) {
        amount = autoCfg.onWin === 'increase' ? Math.max(1, Math.round(amount * (1 + autoCfg.onWinPct / 100))) : Math.max(1, Math.round(stake));
      } else {
        amount = autoCfg.onLoss === 'increase' ? Math.max(1, Math.round(amount * (1 + autoCfg.onLossPct / 100))) : Math.max(1, Math.round(stake));
      }
      await new Promise((res) => setTimeout(res, 420));
    }
    setAutoRunning(false);
  };

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Dice</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <div className={styles.modeToggle}>
            <button className={[styles.modeBtn, mode === 'manual' ? styles.modeBtnActive : ''].join(' ')} onClick={() => setMode('manual')} disabled={autoRunning}>Manual</button>
            <button className={[styles.modeBtn, mode === 'auto' ? styles.modeBtnActive : ''].join(' ')} onClick={() => setMode('auto')} disabled={autoRunning}>Auto</button>
          </div>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={rolling || autoRunning} />

          {mode === 'auto' && (
            <>
              <div className={styles.autoGrid}>
                <div className={styles.autoField}>
                  <span>Number of bets (0 = ∞)</span>
                  <input type="number" min={0} value={autoCfg.bets} onChange={(e) => setAutoCfg({ ...autoCfg, bets: Number(e.target.value) })} />
                </div>
                <div className={styles.autoField}>
                  <span>Roll {rollUnder ? 'under' : 'over'}</span>
                  <input type="number" min={2} max={98} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
                </div>
              </div>
              <div className={styles.autoGrid}>
                <div className={styles.autoField}>
                  <span>On win</span>
                  <select value={autoCfg.onWin} onChange={(e) => setAutoCfg({ ...autoCfg, onWin: e.target.value })} className={styles.stakeInput} style={{ padding: '9px 10px' }}>
                    <option value="reset">Reset to base</option>
                    <option value="increase">Increase by %</option>
                  </select>
                </div>
                <div className={styles.autoField}>
                  <span>%</span>
                  <input type="number" min={0} value={autoCfg.onWinPct} disabled={autoCfg.onWin !== 'increase'} onChange={(e) => setAutoCfg({ ...autoCfg, onWinPct: Number(e.target.value) })} />
                </div>
              </div>
              <div className={styles.autoGrid}>
                <div className={styles.autoField}>
                  <span>On loss</span>
                  <select value={autoCfg.onLoss} onChange={(e) => setAutoCfg({ ...autoCfg, onLoss: e.target.value })} className={styles.stakeInput} style={{ padding: '9px 10px' }}>
                    <option value="reset">Reset to base</option>
                    <option value="increase">Increase by % (Martingale)</option>
                  </select>
                </div>
                <div className={styles.autoField}>
                  <span>%</span>
                  <input type="number" min={0} value={autoCfg.onLossPct} disabled={autoCfg.onLoss !== 'increase'} onChange={(e) => setAutoCfg({ ...autoCfg, onLossPct: Number(e.target.value) })} />
                </div>
              </div>
              <div className={styles.stopRow}>
                <div className={styles.autoField}>
                  <span>Stop on profit (pts)</span>
                  <input type="number" min={0} value={autoCfg.stopProfit} onChange={(e) => setAutoCfg({ ...autoCfg, stopProfit: Number(e.target.value) })} />
                </div>
                <div className={styles.autoField}>
                  <span>Stop on loss (pts)</span>
                  <input type="number" min={0} value={autoCfg.stopLoss} onChange={(e) => setAutoCfg({ ...autoCfg, stopLoss: Number(e.target.value) })} />
                </div>
              </div>
            </>
          )}

          <div className={styles.fieldLabel}>
            <span>Roll {rollUnder ? 'under' : 'over'}</span>
            <span className={styles.fieldLabelValue}>{target.toFixed(0)}</span>
          </div>
          <input type="range" min={2} max={98} value={target} disabled={rolling || autoRunning}
            className={styles.levSlider} onChange={(e) => setTarget(Number(e.target.value))} />
          <button className={styles.miniBtn} style={{ width: '100%', padding: '8px' }} disabled={rolling || autoRunning}
            onClick={() => setRollUnder(!rollUnder)}>
            Flip to roll {rollUnder ? 'over' : 'under'}
          </button>
          <div className={styles.profitRow}>
            <span>Multiplier</span><strong>{mult.toFixed(4)}×</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Profit on win</span><strong>+{fmt(stake * mult - stake)} pts</strong>
          </div>

          {mode === 'auto' && autoRunning && (
            <div className={styles.autoStat}>
              <span>Played {autoStat.played} · Won {autoStat.won} · Lost {autoStat.lost}</span>
              <strong style={{ color: autoStat.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {autoStat.profit >= 0 ? '+' : ''}{autoStat.profit} pts
              </strong>
            </div>
          )}

          {mode === 'auto' && autoRunning ? (
            <button className={styles.stopBtn} onClick={() => { stopRef.current = true; }}>Stop auto</button>
          ) : (
            <button className={styles.betBtn} onClick={mode === 'auto' ? runAuto : playManual}
              disabled={(mode === 'manual' && rolling) || (mode === 'auto' && autoRunning) || stake > balance}>
              {mode === 'manual' && rolling ? <LoaderCircle size={16} className={styles.spin} /> : <Dices size={16} />}
              {mode === 'auto' ? 'Start auto-bet' : 'Bet'}
            </button>
          )}
        </div>
        <div className={styles.stage}>
          <HistoryStrip items={history} />
          <div className={styles.cubeScene}>
            <div className={styles.cube} style={{ transform: roll !== null ? `rotateX(${(roll * 7.2) % 360}deg) rotateY(${(roll * 13.7) % 360}deg)` : 'rotateX(-18deg) rotateY(24deg)' }}>
              <div className={[styles.cubeFace, styles.cubeFront].join(' ')}>{roll !== null ? roll.toFixed(2) : 'DICE'}</div>
              <div className={[styles.cubeFace, styles.cubeBack].join(' ')}>99/100</div>
              <div className={[styles.cubeFace, styles.cubeRight].join(' ')}>{chance.toFixed(0)}%</div>
              <div className={[styles.cubeFace, styles.cubeLeft].join(' ')}>{mult.toFixed(2)}×</div>
              <div className={[styles.cubeFace, styles.cubeTop].join(' ')}>FAIR</div>
              <div className={[styles.cubeFace, styles.cubeBottom].join(' ')}>1% edge</div>
            </div>
          </div>
          <div className={styles.diceTrack}>
            <div className={styles.diceTrackWin} style={{ width: `${rollUnder ? target : 100 - target}%` }} />
            <div className={styles.diceTrackLose} style={{ flex: 1 }} />
            <div className={styles.diceHandle} style={{ left: `calc(${target}%)` }} />
            {roll !== null && (
              <div className={styles.diceMarker} style={{
                left: `${roll}%`,
                color: (rollUnder ? roll < target : roll > target) ? 'var(--color-success)' : 'var(--color-error)',
              }}>
                {roll.toFixed(2)}
              </div>
            )}
          </div>
          <div className={styles.diceTicks}>
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ MINES/* ══════════════════════════ MINES ══════════════════════════ */

function MinesGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [mines, setMines] = useState(3);
  const [grid, setGrid] = useState(null); // null = idle
  const [revealed, setRevealed] = useState([]);
  const [gems, setGems] = useState(0);
  const [busted, setBusted] = useState(false);
  const [busy, setBusy] = useState(false);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const mult = minesMultiplier(mines, gems);
  const nextMult = minesMultiplier(mines, gems + 1);

  const start = async () => {
    if (busy || stake > balance) return;
    setBusy(true);
    const outcome = await nextFairOutcome();
    // pick mine positions deterministically from the outcome bytes
    const positions = new Set();
    let i = 0;
    while (positions.size < mines && i < outcome.floats.length * 8) {
      const f = outcome.floats[Math.floor(i / 8)];
      const bit = Math.floor((f * 256) % 25);
      positions.add(bit);
      i++;
      if (positions.size < mines && i % 8 === 0) {
        // extend floats lazily — 24 floats cover 24 draws comfortably
        outcome.floats.push(...outcome.floats);
      }
    }
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    setGrid({ mines: [...positions], floats: outcome.floats });
    setRevealed([]);
    setGems(0);
    setBusted(false);
    setBusy(false);
  };

  const reveal = async (idx) => {
    if (!grid || revealed.includes(idx) || busted) return;
    if (grid.mines.includes(idx)) {
      setBusted(true);
      setRevealed((r) => [...r, idx]);
      await recordBet({ game: 'Mines', stake, multiplier: 0, payout: 0, detail: { mines, gems } });
      return;
    }
    const newRevealed = [...revealed, idx];
    const newGems = gems + 1;
    setRevealed(newRevealed);
    setGems(newGems);
    if (newGems === 25 - mines) {
      // cleared the board — auto cashout at max multiplier
      const payout = Math.round(stake * minesMultiplier(mines, newGems));
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
      await recordBet({ game: 'Mines', stake, multiplier: minesMultiplier(mines, newGems), payout, detail: { mines, gems: newGems } });
      setBusted(false);
    }
  };

  const cashout = async () => {
    if (gems === 0) return;
    const payout = Math.round(stake * mult);
    await creditPayout(payout);
    applyBalance(setProfile, profile, payout);
    await recordBet({ game: 'Mines', stake, multiplier: mult, payout, detail: { mines, gems } });
    setGrid(null);
    setRevealed([]);
    setGems(0);
  };

  const playing = grid && !busted;

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Mines</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={playing} />
          <div className={styles.fieldLabel}>
            <span>Mines</span>
            <span className={styles.fieldLabelValue}>{mines}</span>
          </div>
          <input type="range" min={1} max={24} value={mines} disabled={playing}
            className={styles.levSlider} onChange={(e) => setMines(Number(e.target.value))} />
          <div className={styles.profitRow}>
            <span>Current multiplier</span><strong>{mult.toFixed(2)}×</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Next tile</span><strong>{nextMult.toFixed(2)}× · +{fmt(stake * nextMult - stake)} pts</strong>
          </div>
          {playing ? (
            <button className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={cashout} disabled={gems === 0}>
              Cashout {gems > 0 ? `${fmt(stake * mult)} pts` : ''}
            </button>
          ) : (
            <button className={styles.betBtn} onClick={start} disabled={busy || stake > balance}>
              {busy ? <LoaderCircle size={16} className={styles.spin} /> : <Bomb size={16} />}
              Bet
            </button>
          )}
        </div>
        <div className={styles.stage}>
          <div className={styles.minesGrid}>
            {Array.from({ length: 25 }).map((_, idx) => {
              const isRevealed = revealed.includes(idx);
              const isMine = grid?.mines.includes(idx);
              const showAll = busted && isMine;
              const gem = isRevealed && !grid?.mines.includes(idx);
              return (
                <button
                  key={idx}
                  className={[
                    styles.minesTile,
                    isRevealed && gem ? styles.minesTileGem : '',
                    (showAll || (busted && isRevealed && isMine)) ? styles.minesTileMine : '',
                    (busted || (grid && isRevealed)) && !isRevealed ? styles.minesTileDim : '',
                  ].join(' ')}
                  onClick={() => reveal(idx)}
                  disabled={!playing || isRevealed || busted}
                >
                  {(isRevealed && gem) && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <defs>
                        <linearGradient id="gemG" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#A7F3D0" />
                          <stop offset="0.5" stopColor="#34D399" />
                          <stop offset="1" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                      <path d="M15 3 L25 11 L15 27 L5 11 Z" fill="url(#gemG)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
                      <path d="M15 3 L15 27 M5 11 L25 11 M15 3 L10 11 L15 27 L20 11 Z" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" fill="none" />
                      <ellipse cx="11" cy="8" rx="3.5" ry="2" fill="rgba(255,255,255,0.55)" transform="rotate(-30 11 8)" />
                    </svg>
                  )}
                  {(showAll && isMine) && (
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <defs>
                        <radialGradient id="bombG" cx="0.35" cy="0.3" r="1">
                          <stop offset="0" stopColor="#4B5563" />
                          <stop offset="0.6" stopColor="#1F2937" />
                          <stop offset="1" stopColor="#0B0F14" />
                        </radialGradient>
                      </defs>
                      <circle cx="16" cy="18" r="10" fill="url(#bombG)" />
                      <circle cx="12" cy="14" r="2.6" fill="rgba(255,255,255,0.35)" />
                      <path d="M16 8 Q20 4 24 6" stroke="#9CA3AF" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                      <circle cx="25" cy="6" r="2" fill="#FBBF24" />
                      {[0, 60, 120, 180, 240, 300].map(a => (
                        <line key={a} x1="16" y1="18"
                          x2={16 + 12 * Math.cos(a * Math.PI / 180)}
                          y2={18 + 12 * Math.sin(a * Math.PI / 180)}
                          stroke="#374151" strokeWidth="1.2" strokeLinecap="round" />
                      ))}
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ PLINKO ══════════════════════════ */

function PlinkoGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [risk, setRisk] = useState('medium');
  const [dropping, setDropping] = useState(false);
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const [history, setHistory] = useState([]);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;
  const table = PLINKO_TABLES[risk];

  const drop = async () => {
    if (dropping || stake > balance) return;
    setDropping(true);
    const outcome = await nextFairOutcome();
    const bits = [];
    for (const f of outcome.floats) {
      for (let b = 0; b < 8 && bits.length < PLINKO_ROWS; b++) {
        const x = f * 256 * Math.pow(2, b) % 1;
        bits.push(x < 0.5 ? 0 : 1);
      }
      if (bits.length >= PLINKO_ROWS) break;
    }
    const rights = bits.reduce((a, b) => a + b, 0);
    const mult = table[rights];
    const payout = Math.round(stake * mult);

    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);

    // animate the ball down the board, then credit
    animateBall(bits, () => {
      creditPayout(payout).then(() => applyBalance(setProfile, profile, payout));
      recordBet({ game: 'Plinko', stake, multiplier: mult, payout, detail: { risk, rights } });
      historyRef.current = [{ id: outcome.nonce, label: `${mult}x`, payout, stake }, ...historyRef.current];
      setHistory(historyRef.current);
      setDropping(false);
    });
  };

  const animateBall = (bits, done) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const padTop = 40, padBottom = 70;
    const rowH = (H - padTop - padBottom) / PLINKO_ROWS;
    const cx = W / 2;
    const spacing = Math.min(34, (W - 80) / PLINKO_ROWS);

    let row = 0, t = 0;
    let px = cx, py = padTop;
    let animId;
    const step = () => {
      t += 1;
      const rowProgress = t / 14; // frames per row
      if (rowProgress >= 1 && row < PLINKO_ROWS) {
        px += (bits[row] === 1 ? spacing / 2 : -spacing / 2);
        row += 1;
        py = padTop + row * rowH;
        t = 0;
      }
      ctx.clearRect(0, 0, W, H);
      // pegs
      ctx.fillStyle = 'rgba(148, 180, 200, 0.5)';
      for (let r = 0; r <= PLINKO_ROWS; r++) {
        const count = r + 2;
        const y = padTop + r * rowH;
        for (let c = 0; c < count; c++) {
          const x = cx + (c - (count - 1) / 2) * spacing;
          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // buckets
      for (let b = 0; b <= PLINKO_ROWS; b++) {
        const mult = table[b];
        const x = cx + (b - PLINKO_ROWS / 2) * spacing;
        const hot = mult >= 2;
        ctx.fillStyle = hot ? 'rgba(251, 191, 36, 0.85)' : mult >= 1 ? 'rgba(45, 212, 167, 0.55)' : 'rgba(148, 180, 200, 0.25)';
        const bw = spacing - 5;
        ctx.fillRect(x - bw / 2, padTop + PLINKO_ROWS * rowH + 12, bw, 30, );
        ctx.fillStyle = '#0a0f16';
        ctx.font = `800 ${Math.min(11, bw / 3.2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${mult}x`, x, padTop + PLINKO_ROWS * rowH + 32);
      }
      // ball with interpolation
      const bx = px + (row < PLINKO_ROWS ? (bits[row] === 1 ? spacing / 2 : -spacing / 2) * rowProgress : 0);
      const by = py + rowProgress * rowH;
      ctx.beginPath();
      ctx.fillStyle = '#FBBF24';
      ctx.shadowColor = '#FBBF24';
      ctx.shadowBlur = 14;
      ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (row >= PLINKO_ROWS) {
        done();
        return;
      }
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
  };

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Plinko</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={dropping} />
          <div className={styles.fieldLabel}><span>Risk</span></div>
          <div className={styles.dirToggle}>
            {['low', 'medium', 'high'].map((r) => (
              <button key={r} className={`${styles.dirBtn} ${risk === r ? styles.dirActive : ''}`}
                onClick={() => setRisk(r)} disabled={dropping}>
                {r[0].toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <button className={styles.betBtn} onClick={drop} disabled={dropping || stake > balance}>
            {dropping ? <LoaderCircle size={16} className={styles.spin} /> : <CircleDot size={16} />}
            Drop ball
          </button>
          <div className={styles.profitRow}>
            <span>Top multiplier</span><strong>{Math.max(...table)}×</strong>
          </div>
        </div>
        <div className={styles.stage}>
          <HistoryStrip items={history} />
          <div className={styles.crashCanvasWrap}>
            <canvas ref={canvasRef} className={styles.crashCanvas} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ CRASH ══════════════════════════ */

function CrashGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [mult, setMult] = useState(1);
  const [phase, setPhase] = useState('idle'); // idle | flying | busted | cashed
  const [history, setHistory] = useState([]);
  const [autoAt, setAutoAt] = useState(2);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const play = async () => {
    if (phase !== 'idle' || stake > balance) return;
    const outcome = await nextFairOutcome();
    const point = crashPoint(outcome.floats[0]);
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    setPhase('flying');
    setMult(1);

    const start = performance.now();
    let cashed = false;
    const points = [[0, 1]];

    const tick = (now) => {
      const t = (now - start) / 1000;
      const m = Math.pow(Math.E, 0.09 * t * 3.2);
      const current = Math.min(m, point);

      if (m >= point) {
        // crashed
        setMult(point);
        setPhase('busted');
        drawCurve(points.concat([[t, point]]), true);
        recordBet({ game: 'Crash', stake, multiplier: 0, payout: 0, detail: { crashAt: point } });
        setHistory((h) => [{ id: outcome.nonce, label: `${point.toFixed(2)}x`, payout: 0, stake }, ...h]);
        return;
      }
      setMult(current);
      points.push([t, current]);
      drawCurve(points, false);

      if (!cashed && autoAt > 1 && current >= autoAt) {
        cashed = true;
        doCashout(current);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const doCashout = async (at) => {
      cancelAnimationFrame(rafRef.current);
      const payout = Math.round(stake * at);
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
      await recordBet({ game: 'Crash', stake, multiplier: at, payout, detail: { cashedAt: at, crashAt: point } });
      setHistory((h) => [{ id: outcome.nonce, label: `${at.toFixed(2)}x`, payout, stake }, ...h]);
      setPhase('cashed');
      setMult(at);
      drawCurve(points, false);
    };

    const drawCurve = (pts, busted) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);
      const maxT = Math.max(6, pts[pts.length - 1][0] * 1.15);
      const maxM = Math.max(2, pts.reduce((mx, p) => Math.max(mx, p[1]), 1) * 1.2);
      ctx.strokeStyle = 'rgba(148, 180, 200, 0.12)';
      ctx.lineWidth = 1;
      for (let g = 1; g <= 4; g++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 5) * g); ctx.lineTo(W, (H / 5) * g); ctx.stroke();
      }
      ctx.beginPath();
      pts.forEach(([t, m], i) => {
        const x = (t / maxT) * (W - 30);
        const y = H - 20 - ((m - 1) / (maxM - 1)) * (H - 50);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = busted ? '#F87171' : '#2DD4A7';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = busted ? 'rgba(248,113,113,0.6)' : 'rgba(45,212,167,0.6)';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const cashoutNow = async () => {
    if (phase !== 'flying') return;
    cancelAnimationFrame(rafRef.current);
    const at = mult;
    const payout = Math.round(stake * at);
    await creditPayout(payout);
    applyBalance(setProfile, profile, payout);
    await recordBet({ game: 'Crash', stake, multiplier: at, payout, detail: { cashedAt: at } });
    setHistory((h) => [{ id: Date.now(), label: `${at.toFixed(2)}x`, payout, stake }, ...h]);
    setPhase('cashed');
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Crash</h3></div>
      <div className={`${styles.gameWrap}`}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={phase === 'flying'} />
          <div className={styles.fieldLabel}>
            <span>Auto cashout</span>
            <span className={styles.fieldLabelValue}>{autoAt.toFixed(2)}×</span>
          </div>
          <input type="range" min={1.1} max={50} step={0.1} value={autoAt} disabled={phase === 'flying'}
            className={styles.levSlider} onChange={(e) => setAutoAt(Number(e.target.value))} />
          <div className={styles.profitRow}>
            <span>Profit at auto</span><strong>+{fmt(stake * autoAt - stake)} pts</strong>
          </div>
          {phase === 'flying' ? (
            <button className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={cashoutNow}>
              Cashout {mult.toFixed(2)}× · {fmt(stake * mult)} pts
            </button>
          ) : (
            <button className={styles.betBtn} onClick={play} disabled={stake > balance}>
              <TrendingUp size={16} /> Bet
            </button>
          )}
        </div>
        <div className={`${styles.stage} ${phase === 'busted' ? styles.crashBusted : ''}`}>
          <HistoryStrip items={history} />
          <div className={styles.crashCanvasWrap}>
            <canvas ref={canvasRef} className={styles.crashCanvas} />
            <div className={styles.crashMultiplier}>{mult.toFixed(2)}×</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ LIMBO ══════════════════════════ */

function LimboGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [target, setTarget] = useState(2);
  const [display, setDisplay] = useState(1);
  const [state, setState] = useState('idle');
  const [history, setHistory] = useState([]);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const play = async () => {
    if (state !== 'idle' || stake > balance) return;
    const outcome = await nextFairOutcome();
    const result = limboResult(outcome.floats[0]);
    const win = result >= target;
    setState('rolling');
    // animate counter racing to the result
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / 850, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const shown = 1 + (result - 1) * eased;
      setDisplay(shown);
      if (p < 1) requestAnimationFrame(animate);
      else {
        setDisplay(result);
        setState(win ? 'win' : 'lose');
        const payout = win ? Math.round(stake * target) : 0;
        if (win) {
          creditPayout(payout).then(() => applyBalance(setProfile, profile, payout));
        }
        recordBet({ game: 'Limbo', stake, multiplier: win ? target : 0, payout, detail: { result, target } });
        setHistory((h) => [{ id: outcome.nonce, label: `${result.toFixed(2)}x`, payout, stake }, ...h]);
        setTimeout(() => setState('idle'), 1400);
      }
    };
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    requestAnimationFrame(animate);
  };

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Limbo</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={state !== 'idle'} />
          <div className={styles.fieldLabel}>
            <span>Target multiplier</span>
            <span className={styles.fieldLabelValue}>{target.toFixed(2)}×</span>
          </div>
          <input type="range" min={1.01} max={100} step={0.01} value={target} disabled={state !== 'idle'}
            className={styles.levSlider} onChange={(e) => setTarget(Number(e.target.value))} />
          <div className={styles.profitRow}>
            <span>Win chance</span><strong>{(99 / target).toFixed(2)}%</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Profit on win</span><strong>+{fmt(stake * target - stake)} pts</strong>
          </div>
          <button className={styles.betBtn} onClick={play} disabled={state !== 'idle' || stake > balance}>
            <Gauge size={16} /> Bet
          </button>
        </div>
        <div className={styles.stage}>
          <HistoryStrip items={history} />
          <div className={styles.limboStage}>
            <div className={`${styles.limboValue} ${state === 'win' ? styles.limboValueWin : state === 'lose' ? styles.limboValueLose : ''}`}>
              {display.toFixed(2)}×
            </div>
            <div className={styles.limboTarget}>target {target.toFixed(2)}×</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ WHEEL ══════════════════════════ */

function WheelGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [risk, setRisk] = useState('medium');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;
  const { segments, wins } = WHEEL_RISKS[risk];
  const mult = wheelMultiplier(risk);
  const zero = segments - wins;

  const segs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < segments; i++) arr.push(i < wins ? mult : 0);
    return arr;
  }, [segments, wins, mult]);

  const segAngle = 360 / segments;

  const spin = async () => {
    if (spinning || stake > balance) return;
    const outcome = await nextFairOutcome();
    const idx = Math.floor(outcome.floats[0] * segments);
    const won = segs[idx] > 0;
    const payout = Math.round(stake * segs[idx]);

    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    setSpinning(true);
    setResult(null);

    const targetAngle = 360 * 5 + (360 - (idx * segAngle + segAngle / 2));
    setRotation((r) => r + targetAngle);

    setTimeout(async () => {
      setSpinning(false);
      setResult({ mult: segs[idx], won });
      if (won) {
        await creditPayout(payout);
        applyBalance(setProfile, profile, payout);
      }
      await recordBet({ game: 'Wheel', stake, multiplier: segs[idx], payout, detail: { risk, idx } });
      setHistory((h) => [{ id: outcome.nonce, label: `${segs[idx]}x`, payout, stake }, ...h]);
    }, 4400);
  };

  const segColor = (m) => m > 0
    ? `hsl(${158 + Math.min(30, (m / mult) * 24)}, 65%, ${38 + Math.min(24, (m / mult) * 22)}%)`
    : 'rgba(148, 180, 200, 0.10)';

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Wheel</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={spinning} />
          <div className={styles.fieldLabel}><span>Risk</span></div>
          <div className={styles.dirToggle}>
            {Object.keys(WHEEL_RISKS).map((r) => (
              <button key={r} className={`${styles.dirBtn} ${risk === r ? styles.dirActive : ''}`}
                onClick={() => setRisk(r)} disabled={spinning}>
                {r[0].toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.profitRow}>
            <span>Win multiplier</span><strong>{mult.toFixed(2)}×</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Win chance</span><strong>{Math.round((wins / segments) * 100)}%</strong>
          </div>
          <button className={styles.betBtn} onClick={spin} disabled={spinning || stake > balance}>
            {spinning ? <LoaderCircle size={16} className={styles.spin} /> : <Disc3 size={16} />}
            Spin
          </button>
        </div>
        <div className={styles.stage}>
          <HistoryStrip items={history} />
          <div className={styles.wheelWrap}>
            <div className={styles.wheelPin} />
            <svg viewBox="0 0 200 200" className={styles.wheelSvg}
              style={{ transform: `rotate(${rotation}deg)` }}>
              {segs.map((m, i) => {
                const a0 = (i * segAngle - 90 - segAngle / 2) * Math.PI / 180;
                const a1 = ((i + 1) * segAngle - 90 - segAngle / 2) * Math.PI / 180;
                const x0 = 100 + 88 * Math.cos(a0), y0 = 100 + 88 * Math.sin(a0);
                const x1 = 100 + 88 * Math.cos(a1), y1 = 100 + 88 * Math.sin(a1);
                return (
                  <g key={i}>
                    <path d={`M100 100 L${x0} ${y0} A88 88 0 0 1 ${x1} ${y1} Z`}
                      fill={segColor(m)} stroke="rgba(7, 10, 15, 0.9)" strokeWidth="1" />
                    {m > 0 && (
                      <text x={100 + 66 * Math.cos((a0 + a1) / 2)}
                        y={100 + 66 * Math.sin((a0 + a1) / 2) + 3}
                        fill="#0a0f16" fontSize="9" fontWeight="800" textAnchor="middle">
                        {m}×
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="16" fill="#0C1119" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="2" />
            </svg>
            <AnimatePresence>
              {result && (
                <motion.div className={`${styles.resultBanner} ${result.won ? styles.resultWin : styles.resultLose}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ top: '18%' }}>
                  {result.won ? `WIN ${result.mult}× · +${fmt(stake * result.mult - stake)} pts` : 'NO WIN'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ HILO ══════════════════════════ */

const SUITS = [
  { s: '♠', red: false }, { s: '♥', red: true }, { s: '♦', red: true }, { s: '♣', red: false },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const rankValue = (r) => (r === 'A' ? 1 : RANKS.indexOf(r) + 1);

function freshDeck() {
  const deck = [];
  for (const su of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: su.s, red: su.red });
  return deck;
}

function HiloGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [state, setState] = useState('idle'); // idle | playing | done
  const [deck, setDeck] = useState([]);
  const [current, setCurrent] = useState(null);
  const [next, setNext] = useState(null);
  const [streak, setStreak] = useState(0);
  const [mult, setMult] = useState(1);
  const [busy, setBusy] = useState(false);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const start = async () => {
    if (busy || stake > balance) return;
    setBusy(true);
    const outcome = await nextFairOutcome();
    // Fisher–Yates driven by fair bytes
    const d = freshDeck();
    let seedIdx = 0;
    for (let i = d.length - 1; i > 0; i--) {
      const f = outcome.floats[seedIdx % outcome.floats.length];
      const j = Math.floor(f * 256 * Math.pow(2, seedIdx % 8)) % (i + 1);
      [d[i], d[j]] = [d[j], d[i]];
      seedIdx++;
    }
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    setDeck(d.slice(2));
    setCurrent(d[0]);
    setNext(d[1]);
    setStreak(0);
    setMult(1);
    setState('playing');
    setBusy(false);
  };

  const chanceFor = (choice) => {
    const cv = rankValue(current.rank);
    const remaining = deck.length + 1;
    let favorable = 0;
    for (let i = 0; i < deck.length; i++) {
      const v = rankValue(deck[i].rank);
      const higher = v > cv, lower = v < cv, same = v === cv;
      if (choice === 'higher' && (higher || (same && false))) favorable++;
      if (choice === 'lower' && (lower || (same && false))) favorable++;
      if (choice === 'same' && same) favorable++;
    }
    void remaining;
    return favorable / deck.length;
  };

  const guess = async (choice) => {
    if (state !== 'playing' || busy || deck.length === 0) return;
    setBusy(true);
    const outcome = await nextFairOutcome();
    const revealed = next;
    const rest = deck.slice(1);
    const cv = rankValue(current.rank);
    const nv = rankValue(revealed.rank);
    const correct =
      choice === 'higher' ? nv > cv :
      choice === 'lower' ? nv < cv :
      nv === cv;

    const p = chanceFor(choice);
    const stepMult = Math.max(1.01, Math.floor((0.99 / Math.max(p, 0.01)) * 100) / 100);
    const newMult = Math.floor(mult * stepMult * 100) / 100;

    setCurrent(revealed);
    setDeck(rest);
    setNext(rest[0] || null);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMult(newMult);
      setBusy(false);
      void outcome;
      return;
    }
    // wrong — bust
    await recordBet({ game: 'HiLo', stake, multiplier: 0, payout: 0, detail: { streak, guess: choice, revealed: revealed.rank } });
    setState('done');
    setBusy(false);
  };

  const cashout = async () => {
    if (streak === 0) return;
    const payout = Math.round(stake * mult);
    await creditPayout(payout);
    applyBalance(setProfile, profile, payout);
    await recordBet({ game: 'HiLo', stake, multiplier: mult, payout, detail: { streak } });
    setState('done');
  };

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>HiLo</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={state === 'playing'} />
          <div className={styles.profitRow}>
            <span>Streak</span><strong>{streak} correct</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Multiplier</span><strong>{mult.toFixed(2)}×</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Cashout</span><strong>{fmt(stake * mult)} pts</strong>
          </div>
          {state === 'playing' ? (
            <button className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={cashout} disabled={streak === 0}>
              Cashout {fmt(stake * mult)} pts
            </button>
          ) : (
            <button className={styles.betBtn} onClick={start} disabled={busy || stake > balance}>
              <Layers size={16} /> Bet
            </button>
          )}
        </div>
        <div className={styles.stage}>
          <div className={styles.hiloStage}>
            {state === 'idle' || state === 'done' ? (
              <p className={styles.emptyNote}>
                {state === 'done' ? `Round over — ${streak > 0 ? `${streak} correct, cashed ${fmt(stake * mult)} pts` : 'better luck next time'}` : 'Place a bet to draw the first card.'}
              </p>
            ) : null}
            {(state === 'playing') && (
              <>
                <div className={styles.hiloCards}>
                  <div className={`${styles.playingCard} ${current.red ? styles.playingCardRed : ''}`}>
                    <div className={styles.cardCorner}>{current.rank}<span className={styles.cardCornerSmall}>{current.suit}</span></div>
                    <div className={styles.cardCenter}>{current.suit}</div>
                    <div className={styles.cardCornerSmall} style={{ transform: 'rotate(180deg)' }}>{current.rank} {current.suit}</div>
                  </div>
                  {next ? (
                    <div className={`${styles.playingCard} ${styles.cardBack}`} />
                  ) : (
                    <p className={styles.emptyNote}>Last card — cash out.</p>
                  )}
                </div>
                <div className={styles.hiloButtons}>
                  <button className={styles.hiloBtn} disabled={busy} onClick={() => guess('higher')}>
                    <TrendingUp size={15} /> Higher or same
                  </button>
                  <button className={`${styles.hiloBtn} ${styles.hiloSkip}`} disabled={busy} onClick={() => guess('same')}>
                    Same
                  </button>
                  <button className={styles.hiloBtn} disabled={busy} onClick={() => guess('lower')}>
                    <TrendingUp size={15} style={{ transform: 'rotate(180deg)' }} /> Lower or same
                  </button>
                </div>
                <div className={styles.hiloStats}>
                  <span>Cards left in shoe: <strong>{deck.length}</strong></span>
                  <span>Next payout on correct: <strong>{Math.floor(mult * Math.max(1.01, 0.99 / Math.max(chanceFor('higher'), 0.01)) * 100) / 100}× max</strong></span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ DRAGON TOWER ══════════════════════════ */

function TowerGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [floors, setFloors] = useState(null); // array of egg tile indexes
  const [level, setLevel] = useState(0);
  const [picks, setPicks] = useState([]);
  const [busted, setBusted] = useState(false);
  const [busy, setBusy] = useState(false);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const start = async () => {
    if (busy || stake > balance) return;
    setBusy(true);
    const outcome = await nextFairOutcome();
    const eggs = [];
    for (let i = 0; i < TOWER_FLOORS; i++) {
      eggs.push(Math.floor(outcome.floats[i] * 3) % 3);
    }
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    setFloors(eggs);
    setLevel(0);
    setPicks([]);
    setBusted(false);
    setBusy(false);
  };

  const pick = async (tile) => {
    if (!floors || busted) return;
    const egg = floors[level] === tile;
    const newPicks = [...picks, { level, tile, egg }];
    setPicks(newPicks);
    if (egg) {
      setBusted(true);
      await recordBet({ game: 'Dragon Tower', stake, multiplier: 0, payout: 0, detail: { reached: level } });
      return;
    }
    const newLevel = level + 1;
    setLevel(newLevel);
    if (newLevel === TOWER_FLOORS) {
      const m = towerMultiplier(TOWER_FLOORS);
      const payout = Math.round(stake * m);
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
      await recordBet({ game: 'Dragon Tower', stake, multiplier: m, payout, detail: { cleared: TOWER_FLOORS } });
    }
  };

  const cashout = async () => {
    if (level === 0) return;
    const m = towerMultiplier(level);
    const payout = Math.round(stake * m);
    await creditPayout(payout);
    applyBalance(setProfile, profile, payout);
    await recordBet({ game: 'Dragon Tower', stake, multiplier: m, payout, detail: { cleared: level } });
    setFloors(null);
    setLevel(0);
    setPicks([]);
  };

  const playing = floors && !busted && level < TOWER_FLOORS;

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Dragon Tower</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={playing} />
          <div className={styles.profitRow}>
            <span>Floor {Math.min(level + 1, TOWER_FLOORS)} multiplier</span>
            <strong>{towerMultiplier(Math.min(level + 1, TOWER_FLOORS)).toFixed(2)}×</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Top floor</span><strong>{towerMultiplier(TOWER_FLOORS).toFixed(2)}×</strong>
          </div>
          {playing ? (
            <button className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={cashout} disabled={level === 0}>
              Cashout {level > 0 ? `${fmt(stake * towerMultiplier(level))} pts` : ''}
            </button>
          ) : (
            <button className={styles.betBtn} onClick={start} disabled={busy || stake > balance}>
              {busy ? <LoaderCircle size={16} className={styles.spin} /> : <Egg size={16} />}
              Bet
            </button>
          )}
        </div>
        <div className={styles.stage}>
          <div className={styles.towerWrap}>
            <div className={styles.towerCol}>
              {Array.from({ length: TOWER_FLOORS }).map((_, i) => {
                const floorNo = TOWER_FLOORS - i; // display top-down
                const current = playing && floorNo === level + 1;
                const pick = picks.find((p) => p.level === floorNo);
                const below = floorNo <= level;
                return (
                  <div key={floorNo}>
                    <div className={styles.towerFloor}>
                      {[0, 1, 2].map((tile) => {
                        const isPast = pick && pick.level === floorNo;
                        const revealed = isPast && (pick.tile === tile || pick.egg === tile || below);
                        return (
                          <button
                            key={tile}
                            className={[
                              styles.towerTile,
                              isPast && revealed && pick.egg === tile ? styles.towerTileEgg : '',
                              isPast && revealed && !(pick.egg === tile) && (pick.tile === tile || below) ? styles.towerTileSafe : '',
                              below && !isPast ? styles.towerTileDim : '',
                            ].join(' ')}
                            onClick={() => current && pick(tile)}
                            disabled={!current || !!pick}
                          >
                            {revealed && pick.egg === tile ? '🥚' : revealed && (pick.tile === tile || below) ? '🐉' : ''}
                          </button>
                        );
                      })}
                    </div>
                    <div className={styles.towerFloorLabel}>
                      FLOOR {floorNo} · {towerMultiplier(floorNo).toFixed(2)}×
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ DUCK DASH ══════════════════════════ */

function DuckGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [difficulty, setDifficulty] = useState('easy');
  const [lanes, setLanes] = useState(null); // null = idle
  const [lane, setLane] = useState(0);
  const [dead, setDead] = useState(false);
  const [busy, setBusy] = useState(false);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;
  const cfg = DUCK_LANES[difficulty];

  const multAt = (l) => {
    const table = [0];
    let cum = 1;
    for (let k = 1; k <= cfg.lanes; k++) {
      cum *= cfg.survival;
      table.push(Math.floor((0.99 / cum) * 100) / 100);
    }
    return table[l] || 0;
  };

  const start = async () => {
    if (busy || stake > balance) return;
    setBusy(true);
    const outcome = await nextFairOutcome();
    // per-lane survival decided by fair bytes upfront
    const survive = [];
    for (let i = 0; i < cfg.lanes; i++) {
      survive.push(outcome.floats[i] < cfg.survival);
    }
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);
    setLanes(survive);
    setLane(0);
    setDead(false);
    setBusy(false);
  };

  const step = async () => {
    if (!lanes || dead) return;
    const nextLane = lane + 1;
    const survived = lanes[lane];
    if (!survived) {
      setDead(true);
      await recordBet({ game: 'Duck Dash', stake, multiplier: 0, payout: 0, detail: { difficulty, lane } });
      return;
    }
    setLane(nextLane);
    if (nextLane >= cfg.lanes) {
      const m = multAt(cfg.lanes);
      const payout = Math.round(stake * m);
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
      await recordBet({ game: 'Duck Dash', stake, multiplier: m, payout, detail: { difficulty, lane: nextLane } });
    }
  };

  const cashout = async () => {
    if (lane === 0) return;
    const m = multAt(lane);
    const payout = Math.round(stake * m);
    await creditPayout(payout);
    applyBalance(setProfile, profile, payout);
    await recordBet({ game: 'Duck Dash', stake, multiplier: m, payout, detail: { difficulty, lane } });
    setLanes(null);
    setLane(0);
  };

  const playing = lanes && !dead && lane < cfg.lanes;
  const currentMult = multAt(lane);
  const nextMult = multAt(lane + 1);

  const duckEl = (laneIdx, isDeadLane) => (
    <div className={`${styles.laneDuck} ${isDeadLane ? styles.laneHit : ''}`}>
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <ellipse cx="15" cy="19" rx="12" ry="8.5" fill="#F5C542" />
        <circle cx="24" cy="10" r="6.5" fill="#F5C542" />
        <path d="M29.5 9.5 L34 11 L29.5 12.5 Z" fill="#E8842B" />
        <circle cx="26" cy="8.5" r="1.2" fill="#10151d" />
      </svg>
    </div>
  );

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Duck Dash</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={playing} />
          <div className={styles.fieldLabel}><span>Difficulty</span></div>
          <div className={styles.dirToggle}>
            {Object.keys(DUCK_LANES).map((d) => (
              <button key={d} className={`${styles.dirBtn} ${difficulty === d ? styles.dirActive : ''}`}
                onClick={() => setDifficulty(d)} disabled={playing}>
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.profitRow}>
            <span>Current multiplier</span>
            <span className={styles.cashMult}>{currentMult.toFixed(2)}×</span>
          </div>
          <div className={styles.profitRow}>
            <span>Next lane</span><strong>{nextMult.toFixed(2)}× · +{fmt(stake * nextMult - stake)} pts</strong>
          </div>
          {playing ? (
            <button className={`${styles.betBtn} ${styles.betBtnCashout}`} onClick={cashout} disabled={lane === 0}>
              Cashout {lane > 0 ? `${fmt(stake * currentMult)} pts` : ''}
            </button>
          ) : (
            <button className={styles.betBtn} onClick={start} disabled={busy || stake > balance}>
              {busy ? <LoaderCircle size={16} className={styles.spin} /> : <Bird size={16} />}
              Bet
            </button>
          )}
          {playing && (
            <button className={styles.betBtn} style={{ background: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: 'none', border: '1px solid var(--color-border-strong)' }}
              onClick={step}>
              <Bird size={16} /> Step forward
            </button>
          )}
        </div>
        <div className={styles.stage}>
          <div className={styles.road}>
            <div className={styles.duckStart}>
              {!lanes && duckEl(0, false)}
            </div>
            {Array.from({ length: cfg?.lanes || 0 }).map((_, i) => {
              const active = playing && lane === i;
              const duckHere = (playing || dead) && lane === i + 1;
              const deadLane = dead && lane === i + 1;
              return (
                <div key={i} className={`${styles.lane} ${active ? styles.laneActive : ''}`}>
                  {duckHere && duckEl(i, deadLane)}
                  {!duckHere && <div className={styles.laneCar} style={{
                    left: `${(i * 37 + 12) % 80}%`,
                    transform: `translateY(-50%) scaleX(${i % 2 === 0 ? 1 : -1})`,
                  }}>
                    <svg width="40" height="22" viewBox="0 0 40 22" fill="none">
                      <rect x="1" y="5" width="30" height="13" rx="4" fill={i % 2 ? '#2E405A' : '#3A4C68'} stroke="rgba(148,180,200,0.3)" />
                      <rect x="24" y="1" width="11" height="10" rx="3" fill={i % 2 ? '#243448' : '#2E405A'} />
                      <circle cx="9" cy="19" r="3" fill="#0a0f16" stroke="rgba(148,180,200,0.4)" />
                      <circle cx="28" cy="19" r="3" fill="#0a0f16" stroke="rgba(148,180,200,0.4)" />
                    </svg>
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ KENO ══════════════════════════ */

const KENO_PAYTABLE = {
  1:  { 1: 3.8 },
  2:  { 2: 14 },
  3:  { 2: 2, 3: 25 },
  4:  { 2: 1.4, 3: 5, 4: 60 },
  5:  { 3: 3, 4: 12, 5: 120 },
  6:  { 3: 1.8, 4: 5, 5: 45, 6: 350 },
  7:  { 4: 3, 5: 15, 6: 90, 7: 500 },
  8:  { 4: 2.2, 5: 8, 6: 40, 7: 250, 8: 1200 },
  9:  { 4: 1.6, 5: 5, 6: 22, 7: 120, 8: 600, 9: 2500 },
  10: { 4: 1.2, 5: 3, 6: 10, 7: 55, 8: 300, 9: 1200, 10: 4000 },
};

function KenoGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [picks, setPicks] = useState([]);
  const [drawn, setDrawn] = useState([]);
  const [state, setState] = useState('idle'); // idle | drawing | done
  const [lastWin, setLastWin] = useState(null);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const toggle = (n) => {
    if (state === 'drawing') return;
    setPicks((p) => {
      if (p.includes(n)) return p.filter(x => x !== n);
      if (p.length >= 10) { toast.error('Maximum 10 numbers'); return p; }
      return [...p, n];
    });
  };

  const paytable = KENO_PAYTABLE[picks.length] || {};

  const play = async () => {
    if (state === 'drawing' || picks.length === 0 || stake > balance) return;
    setState('drawing');
    const outcome = await nextFairOutcome();
    // draw 10 unique numbers from 40 via fair floats
    const pool = Array.from({ length: 40 }, (_, i) => i + 1);
    const drawn = [];
    let k = 0;
    while (drawn.length < 10 && k < outcome.floats.length) {
      const idx = Math.floor(outcome.floats[k] * pool.length);
      drawn.push(pool.splice(idx, 1)[0]);
      k++;
    }
    // animate draws one by one
    for (let i = 0; i < drawn.length; i++) {
      setDrawn(drawn.slice(0, i + 1));
      await new Promise((r) => setTimeout(r, 220));
    }
    const matches = drawn.filter(d => picks.includes(d)).length;
    const table = KENO_PAYTABLE[picks.length] || {};
    const mult = table[matches] || 0;
    const payout = Math.round(stake * mult);
    if (payout > 0) {
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
    }
    await recordBet({ game: 'Keno', stake, multiplier: mult, payout, detail: { picks: picks.length, matches, drawn } });
    setLastWin({ matches, mult, payout });
    setState('done');
  };

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Keno</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={state === 'drawing'} />
          <div className={styles.profitRow}>
            <span>Picked</span><strong>{picks.length} / 10</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Best prize</span><strong>{paytable[Math.max(...Object.keys(paytable).map(Number))] ? `${fmt(stake * Math.max(...Object.values(paytable)))} pts` : '—'}</strong>
          </div>
          <button className={styles.betBtn} onClick={play} disabled={state === 'drawing' || picks.length === 0 || stake > balance}>
            {state === 'drawing' ? <LoaderCircle size={16} className={styles.spin} /> : <Hash size={16} />}
            {state === 'drawing' ? 'Drawing…' : 'Bet'}
          </button>
          {state === 'done' && lastWin && (
            <div className={styles.profitRow}>
              <span>{lastWin.matches} matches</span>
              <strong style={{ color: lastWin.payout > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {lastWin.payout > 0 ? `+${fmt(lastWin.payout)} pts` : 'no win'}
              </strong>
            </div>
          )}
        </div>
        <div className={styles.stage}>
          <div style={{ padding: '26px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {Array.from({ length: 40 }).map((_, i) => {
                const n = i + 1;
                const picked = picks.includes(n);
                const hit = drawn.includes(n);
                return (
                  <button key={n}
                    onClick={() => toggle(n)}
                    disabled={state === 'drawing'}
                    style={{
                      aspectRatio: '1', borderRadius: 9, cursor: 'pointer', padding: 0,
                      fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13,
                      border: hit ? '1px solid var(--color-gold)' : picked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: hit ? 'var(--color-gold)' : picked ? 'rgba(45, 212, 167, 0.18)' : 'var(--color-surface)',
                      color: hit ? '#241300' : picked ? 'var(--color-primary-light)' : 'var(--color-text-tertiary)',
                      boxShadow: hit ? '0 0 16px rgba(245, 158, 11, 0.5)' : 'none',
                      transition: 'all 0.2s ease',
                    }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ BLACKJACK ══════════════════════════ */

function cardVal(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    const v = rankValue(c.rank);
    if (v === 1) { aces += 1; total += 11; }
    else total += Math.min(v, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return total;
}

function BlackjackGame({ profile, setProfile }) {
  const [stake, setStake] = useState(100);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | player | dealer | win | lose | push | blackjack
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const deckRef = useRef([]);
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const deal = async () => {
    if (busy || stake > balance) return;
    setBusy(true);
    const outcome = await nextFairOutcome();
    const d = freshDeck();
    let seedIdx = 0;
    for (let i = d.length - 1; i > 0; i--) {
      const f = outcome.floats[seedIdx % outcome.floats.length];
      const j = Math.floor(f * 256 * Math.pow(2, seedIdx % 8)) % (i + 1);
      [d[i], d[j]] = [d[j], d[i]];
      seedIdx++;
    }
    deckRef.current = d.slice(4);
    const pCards = [d[0], d[2]];
    const dCards = [d[1], d[3]];
    setPlayer(pCards);
    setDealer([dCards[0]]);
    setDealer(dCards); // dealer shows both; simplified single-dealer-draw variant
    await debitStake(stake);
    applyBalance(setProfile, profile, -stake);

    const pv = cardVal(pCards);
    if (pv === 21 && cardVal(dCards) !== 21) {
      // natural blackjack — 3:2
      const payout = Math.round(stake * 2.5);
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
      await recordBet({ game: 'Blackjack', stake, multiplier: 2.5, payout, detail: { result: 'blackjack' } });
      setPhase('blackjack');
      setOutcome('Blackjack! 3:2 payout');
      setBusy(false);
      return;
    }
    if (pv === 21 && cardVal(dCards) === 21) {
      const payout = stake; // push
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
      await recordBet({ game: 'Blackjack', stake, multiplier: 1, payout, detail: { result: 'push' } });
      setPhase('push');
      setOutcome('Push — bet returned');
      setBusy(false);
      return;
    }
    setPhase('player');
    setBusy(false);
  };

  const hit = async () => {
    if (phase !== 'player') return;
    const nextCard = deckRef.current.shift();
    const newPlayer = [...player, nextCard];
    setPlayer(newPlayer);
    const pv = cardVal(newPlayer);
    if (pv > 21) {
      setPhase('lose');
      setOutcome(`Bust at ${pv}`);
      await recordBet({ game: 'Blackjack', stake, multiplier: 0, payout: 0, detail: { bust: pv } });
    }
  };

  const stand = async () => {
    if (phase !== 'player') return;
    setBusy(true);
    // dealer draws to 17
    const dCards = [...dealer];
    while (cardVal(dCards) < 17) {
      dCards.push(deckRef.current.shift());
    }
    setDealer([...dCards]);
    const pv = cardVal(player);
    const dv = cardVal(dCards);
    await new Promise((r) => setTimeout(r, 600));

    let payout = 0, mult = 0, res = 'lose';
    if (dv > 21 || pv > dv) { mult = 2; payout = stake * 2; res = 'win'; }
    else if (pv === dv) { mult = 1; payout = stake; res = 'push'; }
    if (payout > 0) {
      await creditPayout(payout);
      applyBalance(setProfile, profile, payout);
    }
    await recordBet({ game: 'Blackjack', stake, multiplier: mult, payout, detail: { player: pv, dealer: dv } });
    setOutcome(res === 'win' ? `You win ${pv} vs ${dv}` : res === 'push' ? `Push ${pv} vs ${dv}` : `Dealer wins ${dv} vs ${pv}`);
    setPhase(res);
    setBusy(false);
  };

  const inRound = ['player', 'dealer'].includes(phase);

  return (
    <>
      <div className={styles.gameHeader}><h3 className={styles.gameName}>Blackjack</h3></div>
      <div className={styles.gameWrap}>
        <div className={styles.betPanel}>
          <StakeInput stake={stake} setStake={setStake} balance={balance} disabled={inRound} />
          <div className={styles.profitRow}>
            <span>Blackjack pays</span><strong>3 : 2</strong>
          </div>
          <div className={styles.profitRow}>
            <span>Dealer stands on</span><strong>17</strong>
          </div>
          {!inRound ? (
            <button className={styles.betBtn} onClick={deal} disabled={busy || stake > balance}>
              <Spade size={16} /> Deal
            </button>
          ) : (
            <>
              <button className={styles.betBtn} onClick={hit} disabled={busy}>Hit</button>
              <button className={styles.betBtn} style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#241300', boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)' }} onClick={stand} disabled={busy}>Stand</button>
            </>
          )}
        </div>
        <div className={styles.stage}>
          <div className={styles.hiloStage}>
            {(player.length > 0) && (
              <>
                <div className={styles.hiloCards}>
                  {dealer.map((c, i) => (
                    <div key={'d' + i} className={`${styles.playingCard} ${c.red ? styles.playingCardRed : ''}`} style={{ transform: `rotate(${(i - 0.5) * 4}deg)` }}>
                      <div className={styles.cardCorner}>{c.rank}<span className={styles.cardCornerSmall}>{c.suit}</span></div>
                      <div className={styles.cardCenter}>{c.suit}</div>
                      <div className={styles.cardCornerSmall} style={{ transform: 'rotate(180deg)' }}>{c.rank} {c.suit}</div>
                    </div>
                  ))}
                </div>
                <p style={{ margin: '4px 0 14px', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
                  Dealer {dealer.length ? cardVal(dealer) : ''}
                </p>
                <div className={styles.hiloCards}>
                  {player.map((c, i) => (
                    <div key={'p' + i} className={`${styles.playingCard} ${c.red ? styles.playingCardRed : ''}`} style={{ transform: `rotate(${(i - (player.length - 1) / 2) * 5}deg)` }}>
                      <div className={styles.cardCorner}>{c.rank}<span className={styles.cardCornerSmall}>{c.suit}</span></div>
                      <div className={styles.cardCenter}>{c.suit}</div>
                      <div className={styles.cardCornerSmall} style={{ transform: 'rotate(180deg)' }}>{c.rank} {c.suit}</div>
                    </div>
                  ))}
                </div>
                <p style={{ margin: 0, color: 'var(--color-text)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  You: {cardVal(player)}
                </p>
              </>
            )}
            {outcome && phase !== 'player' && (
              <p style={{ margin: '8px 0 0', color: phase === 'lose' ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 800, fontSize: 'var(--text-md)' }}>
                {outcome}
              </p>
            )}
            {!player.length && <p className={styles.emptyNote}>Place a bet to deal.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════ LOBBY + ROUTER ══════════════════════════ */

/* ══════════════════════════ LOBBY + ROUTER ══════════════════════════ */

const GAMES = [
  { id: 'dice', name: 'Dice', icon: Dices, art: 'dice' },
  { id: 'mines', name: 'Mines', icon: Bomb, art: 'mines' },
  { id: 'plinko', name: 'Plinko', icon: CircleDot, art: 'plinko' },
  { id: 'crash', name: 'Crash', icon: TrendingUp, art: 'crash' },
  { id: 'limbo', name: 'Limbo', icon: Gauge, art: 'limbo' },
  { id: 'wheel', name: 'Wheel', icon: Disc3, art: 'wheel' },
  { id: 'hilo', name: 'HiLo', icon: Layers, art: 'hilo' },
  { id: 'tower', name: 'Dragon Tower', icon: Egg, art: 'tower' },
  { id: 'duck', name: 'Duck Dash', icon: Bird, art: 'duck' },
  { id: 'keno', name: 'Keno', icon: Hash, art: 'keno' },
  { id: 'blackjack', name: 'Blackjack', icon: Spade, art: 'blackjack' },
];

function GameTile({ game, onOpen }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <motion.button className={styles.gameTile} onClick={onOpen}
      whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      {imgOk ? (
        <img src={`/games/${game.id}.jpg`} alt={game.name} className={styles.gameTileImg}
          onError={() => setImgOk(false)} loading="lazy" />
      ) : (
        <div className={styles.gameTileArt}><GameArt art={game.art} /></div>
      )}
      {!imgOk && (
        <div className={styles.gameTileLabel}>
          {game.name}
          <ChevronRight size={16} />
        </div>
      )}
    </motion.button>
  );
}

function GameArt({ art }) {
  const c = 'rgba(45, 212, 167, 0.9)';
  const g = 'rgba(251, 191, 36, 0.9)';
  switch (art) {
    case 'dice': return (
      <svg width="72" height="72" viewBox="0 0 72 72">
        <rect x="14" y="14" width="44" height="44" rx="10" fill="#10151F" stroke={c} strokeWidth="2" transform="rotate(-8 36 36)" />
        <circle cx="28" cy="30" r="4" fill={c} /><circle cx="44" cy="44" r="4" fill={c} />
        <rect x="26" y="22" width="34" height="34" rx="9" fill="#10151F" stroke={g} strokeWidth="2" transform="rotate(7 43 39)" />
        <circle cx="36" cy="34" r="3.6" fill={g} /><circle cx="46" cy="40" r="3.6" fill={g} /><circle cx="38" cy="48" r="3.6" fill={g} />
      </svg>);
    case 'mines': return (
      <svg width="80" height="72" viewBox="0 0 80 72">
        {[0, 1, 2].map(r => [0, 1, 2].map(col => (
          <rect key={`${r}${col}`} x={16 + col * 17} y={10 + r * 17} width="14" height="14" rx="4"
            fill={(r + col) % 3 === 1 ? 'rgba(52,211,153,0.35)' : '#10151F'} stroke="rgba(148,180,200,0.25)" />
        )))}
        <circle cx="66" cy="56" r="9" fill="#F87171" opacity="0.9" />
        <path d="M66 47 L69 41 L63 41 Z" fill="#F87171" opacity="0.7" />
      </svg>);
    case 'plinko': return (
      <svg width="72" height="76" viewBox="0 0 72 76">
        {[0, 1, 2, 3].map(r => Array.from({ length: r + 2 }).map((_, i) => (
          <circle key={`${r}${i}`} cx={36 + (i - (r + 1) / 2) * 14} cy={12 + r * 13} r="2.6" fill="rgba(148,180,200,0.6)" />
        )))}
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={i} x={8 + i * 12.5} y="62" width="10" height="10" rx="2"
            fill={i === 2 ? 'rgba(251,191,36,0.9)' : 'rgba(45,212,167,0.6)'} />
        ))}
        <circle cx="36" cy="10" r="5" fill="#FBBF24" />
      </svg>);
    case 'crash': return (
      <svg width="76" height="72" viewBox="0 0 76 72">
        <path d="M6 64 Q30 58 44 40 T68 12" stroke="#2DD4A7" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle cx="68" cy="12" r="5" fill="#2DD4A7" />
        {[0, 1, 2].map(i => <line key={i} x1="4" y1={16 + i * 16} x2="72" y2={16 + i * 16} stroke="rgba(148,180,200,0.14)" />)}
        <text x="40" y="34" fill="#FBBF24" fontSize="12" fontWeight="800" fontFamily="monospace">2.4×</text>
      </svg>);
    case 'limbo': return (
      <svg width="76" height="72" viewBox="0 0 76 72">
        <text x="38" y="44" textAnchor="middle" fill="#2DD4A7" fontSize="17" fontWeight="800" fontFamily="monospace">9.99×</text>
        <line x1="10" y1="56" x2="66" y2="56" stroke="rgba(148,180,200,0.3)" strokeWidth="2" />
        <path d="M10 50 C28 48 44 30 66 22" stroke="rgba(251,191,36,0.8)" strokeWidth="2.5" fill="none" strokeDasharray="4 3" />
      </svg>);
    case 'wheel': return (
      <svg width="72" height="72" viewBox="0 0 72 72">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
          const a = (i / 8) * Math.PI * 2;
          return <path key={i} d={`M36 36 L${36 + 26 * Math.cos(a)} ${36 + 26 * Math.sin(a)} A26 26 0 0 1 ${36 + 26 * Math.cos(a + Math.PI / 4)} ${36 + 26 * Math.sin(a + Math.PI / 4)} Z`}
            fill={i % 2 ? 'rgba(45,212,167,0.75)' : 'rgba(148,180,200,0.18)'} />;
        })}
        <circle cx="36" cy="36" r="7" fill="#0C1119" stroke={g} strokeWidth="2" />
      </svg>);
    case 'hilo': return (
      <svg width="76" height="72" viewBox="0 0 76 72">
        <rect x="8" y="16" width="30" height="42" rx="6" fill="#F4F6F8" transform="rotate(-8 23 37)" />
        <text x="17" y="34" fontSize="11" fontWeight="800" fill="#d02b3c" transform="rotate(-8 23 37)">♥</text>
        <rect x="36" y="12" width="30" height="42" rx="6" fill="#F4F6F8" transform="rotate(6 51 33)" />
        <text x="45" y="30" fontSize="11" fontWeight="800" fill="#10151d" transform="rotate(6 51 33)">♠</text>
        <path d="M40 58 L48 50 M48 58 L40 50" stroke="#2DD4A7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>);
    case 'tower': return (
      <svg width="64" height="76" viewBox="0 0 64 76">
        {[0, 1, 2].map(r => [0, 1, 2].map(col => (
          <rect key={`${r}${col}`} x={12 + col * 14} y={12 + r * 18} width="12" height="15" rx="3"
            fill={(r === 1 && col === 2) ? 'rgba(52,211,153,0.5)' : '#10151F'} stroke="rgba(148,180,200,0.25)" />
        )))}
        <text x="52" y="30" fontSize="12" fill="#F87171">🥚</text>
      </svg>);
    case 'keno': return (
      <svg width="76" height="72" viewBox="0 0 76 72">
        {Array.from({ length: 24 }).map((_, i) => {
          const col = i % 8, row = Math.floor(i / 8);
          const picked = [2, 5, 9, 14].includes(i);
          return <rect key={i} x={8 + col * 8} y={10 + row * 18} width="6.5" height="6.5" rx="2"
            fill={picked ? '#FBBF24' : 'rgba(148,180,200,0.18)'} />;
        })}
        <text x="38" y="66" textAnchor="middle" fill="#FBBF24" fontSize="9" fontWeight="800" fontFamily="monospace">4 / 10 drawn</text>
      </svg>);
    case 'blackjack': return (
      <svg width="80" height="72" viewBox="0 0 80 72">
        <rect x="10" y="18" width="28" height="40" rx="5" fill="#F4F6F8" transform="rotate(-10 24 38)" />
        <text x="17" y="34" fontSize="10" fontWeight="800" fill="#d02b3c" transform="rotate(-10 24 38)">A♥</text>
        <rect x="40" y="14" width="28" height="40" rx="5" fill="#F4F6F8" transform="rotate(8 54 34)" />
        <text x="47" y="30" fontSize="10" fontWeight="800" fill="#10151d" transform="rotate(8 54 34)">K♠</text>
        <text x="34" y="66" textAnchor="middle" fill="#2DD4A7" fontSize="9" fontWeight="800" fontFamily="monospace">3 : 2</text>
      </svg>);
    case 'duck': return (
      <svg width="80" height="72" viewBox="0 0 80 72">
        {[0, 1, 2].map(r => (
          <line key={r} x1="6" y1={16 + r * 20} x2="74" y2={16 + r * 20} stroke="rgba(148,180,200,0.2)" strokeWidth="2.5" strokeDasharray="8 6" />
        ))}
        <ellipse cx="26" cy="52" rx="11" ry="8" fill="#F5C542" />
        <circle cx="34" cy="44" r="5.5" fill="#F5C542" />
        <path d="M38.5 43 L43 44.5 L38.5 46 Z" fill="#E8842B" />
        {[0, 1].map(i => (
          <rect key={i} x={48 + i * 16} y={12 + i * 24} width="18" height="9" rx="3" fill={i ? '#3A4C68' : '#2E405A'} />
        ))}
      </svg>);
    default: return null;
  }
}

export default function Casino({ profile, setProfile }) {
  const [active, setActive] = useState(null);
  const [fairOpen, setFairOpen] = useState(false);
  const [fair, setFair] = useState(null);
  const [newClientSeed, setNewClientSeed] = useState('');
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    getFairnessState().then(setFair).catch(() => {});
  }, [active]);

  const rotate = async () => {
    setRotating(true);
    const fresh = await rotateSeeds(newClientSeed || undefined);
    setFair(fresh);
    setNewClientSeed('');
    setRotating(false);
    setFairOpen(true);
  };

  const game = GAMES.find((g) => g.id === active);

  return (
    <div className={styles.casino}>
      <AnimatePresence mode="wait">
        {!game ? (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={styles.lobbyHead}>
              <h2 className={styles.lobbyTitle}>
                <ShieldCheck size={24} color="var(--color-primary-light)" />
                Eco Originals
              </h2>
            </div>
            <div className={styles.lobbyGrid}>
              {GAMES.map((g) => (
                <GameTile key={g.id} game={g} onOpen={() => setActive(g.id)} />
              ))}
            </div>
            <div className={styles.fairnessBar}>
              <ShieldCheck size={13} />
              Provably fair — server seed hash
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {fair?.serverSeedHash?.slice(0, 16) || '…'}…
              </span>
              <button className={styles.fairnessBtn} onClick={() => setFairOpen(true)}>verify & rotate</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={game.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className={styles.gameHeader}>
              <button className={styles.backBtn} onClick={() => setActive(null)}>
                <ArrowLeft size={15} /> Lobby
              </button>
              <div className={styles.fairnessBar} style={{ padding: 0 }}>
                <ShieldCheck size={13} />
                nonce {fair?.nonce ?? 0}
                <button className={styles.fairnessBtn} onClick={() => setFairOpen(true)}>fairness</button>
              </div>
            </div>
            {game.id === 'dice' && <DiceGame profile={profile} setProfile={setProfile} />}
            {game.id === 'mines' && <MinesGame profile={profile} setProfile={setProfile} />}
            {game.id === 'plinko' && <PlinkoGame profile={profile} setProfile={setProfile} />}
            {game.id === 'crash' && <CrashGame profile={profile} setProfile={setProfile} />}
            {game.id === 'limbo' && <LimboGame profile={profile} setProfile={setProfile} />}
            {game.id === 'wheel' && <WheelGame profile={profile} setProfile={setProfile} />}
            {game.id === 'hilo' && <HiloGame profile={profile} setProfile={setProfile} />}
            {game.id === 'tower' && <TowerGame profile={profile} setProfile={setProfile} />}
            {game.id === 'duck' && <DuckGame profile={profile} setProfile={setProfile} />}
            {game.id === 'keno' && <KenoGame profile={profile} setProfile={setProfile} />}
            {game.id === 'blackjack' && <BlackjackGame profile={profile} setProfile={setProfile} />}
          </motion.div>
        )}
      </AnimatePresence>

      {fairOpen && (
        <div className={styles.fairModal} onClick={() => setFairOpen(false)}>
          <div className={styles.fairCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.fairClose} onClick={() => setFairOpen(false)}>✕</button>
            <h3 className={styles.fairTitle}>Provably fair</h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Every outcome is derived from HMAC-SHA256 over your client seed, a nonce and the
              hashed server seed committed here before you bet. Rotate to reveal the active seed
              and verify every past round.
            </p>
            <div>
              <p className={styles.fairLabel}>Server seed hash (active commit)</p>
              <p className={styles.fairValue}>{fair?.serverSeedHash || '—'}</p>
            </div>
            <div>
              <p className={styles.fairLabel}>Client seed (editable)</p>
              <input className={styles.fairInput} value={newClientSeed}
                placeholder={fair?.clientSeed || 'new client seed'}
                onChange={(e) => setNewClientSeed(e.target.value)} />
            </div>
            <div>
              <p className={styles.fairLabel}>Nonce</p>
              <p className={styles.fairValue}>{fair?.nonce ?? 0}</p>
            </div>
            {fair?.prevServerSeed && (
              <>
                <div>
                  <p className={styles.fairLabel}>Previous server seed (revealed)</p>
                  <p className={styles.fairValue}>{fair.prevServerSeed}</p>
                </div>
                <div>
                  <p className={styles.fairLabel}>Previous hash — SHA-256 must match the old commit</p>
                  <p className={styles.fairValue}>{fair.prevServerSeedHash}</p>
                </div>
              </>
            )}
            <button className={styles.betBtn} onClick={rotate} disabled={rotating}>
              {rotating ? <LoaderCircle size={15} className={styles.spin} /> : <RefreshCw size={15} />}
              Rotate seeds
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function applyBalance(setProfile, profile, delta) {
  if (!profile || !setProfile) return;
  setProfile({
    ...profile,
    spendableBalance: Math.max(0, (profile.spendableBalance ?? profile.points ?? 0) + Math.round(delta)),
  });
}

// src/pages/Wallet.jsx
// The Wallet: live point balance with USD equivalence, crypto payout requests
// (XMR · BTC · LTC · DOGE · POL), and the unified ledger of every point ever
// earned, spent or locked.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon, Zap, Lock, TrendingUp, ArrowDownToLine, Copy, Check,
  ShieldCheck, Info, Loader2, X, CircleAlert, ChevronDown, ExternalLink, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  COINS, COIN_MAP, getPayoutRate, getMinPayoutUsd, pointsToUsd, minPayoutPoints,
  validateAddress, getLedger, requestPayout, cancelPayout,
} from '../services/walletService';
import styles from './Wallet.module.css';

const fmtUsd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtPts = (n) => Math.round(n).toLocaleString();

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/* ── balance hero ────────────────────────────────────────────────────────── */

function BalanceHero({ profile, pending }) {
  const rate = getPayoutRate();
  const spendable = profile?.spendableBalance ?? profile?.points ?? 0;
  const lifetime = profile?.lifetimePoints || profile?.points || 0;
  const usd = pointsToUsd(spendable);
  const minUsd = getMinPayoutUsd();
  const minPts = minPayoutPoints();
  const pct = Math.min(100, (spendable / minPts) * 100);

  return (
    <motion.section className={styles.hero} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
      <div className={styles.heroLeft}>
        <span className={styles.kicker}><WalletIcon size={13} /> Wallet</span>
        <p className={styles.balanceLabel}>Spendable balance</p>
        <p className={styles.balance}>{fmtPts(spendable)} <span>pts</span></p>
        <p className={styles.balanceUsd}>≈ {fmtUsd(usd)} <span className={styles.rateNote}>@ {fmtPts(10000)} pts = {fmtUsd(rate)}</span></p>
        <div className={styles.heroRow}>
          <span className={styles.heroChip}><TrendingUp size={13} /> Lifetime earned <strong>{fmtPts(lifetime)}</strong></span>
          {pending > 0 && (
            <span className={styles.heroChipGold}><Lock size={13} /> Locked in payouts <strong>{fmtPts(pending)}</strong></span>
          )}
        </div>
      </div>
      <div className={styles.heroRight}>
        <div className={styles.minCard}>
          <p className={styles.minTitle}>Crypto payout</p>
          <p className={styles.minText}>Minimum {fmtUsd(minUsd)} per withdrawal</p>
          <div className={styles.minBar}>
            <motion.div className={styles.minFill} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
          </div>
          <p className={styles.minPct}>
            {pct >= 100
              ? <><Sparkles size={12} /> Eligible for payout</>
              : <>{pct.toFixed(1)}% of the {fmtUsd(minUsd)} minimum · {(minPts - spendable).toLocaleString()} pts to go</>}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

/* ── payout panel ────────────────────────────────────────────────────────── */

function PayoutPanel({ profile, onRequestDraft }) {
  const spendable = profile?.spendableBalance ?? profile?.points ?? 0;
  const minPts = minPayoutPoints();
  const eligible = spendable >= minPts;

  const [coinId, setCoinId] = useState('xmr');
  const [address, setAddress] = useState('');
  const [points, setPoints] = useState('');
  const [max, setMax] = useState(false);
  const [copied, setCopied] = useState(false);

  const coin = COIN_MAP[coinId];
  const pts = max ? Math.max(0, Math.floor(spendable)) : Math.floor(Number(points) || 0);
  const usd = pointsToUsd(pts);
  const addrErr = address ? validateAddress(coinId, address) : null;
  const belowMin = pts > 0 && pts < minPts;
  const overBal = pts > spendable;
  const canSubmit = eligible && pts >= minPts && !addrErr && address.trim() && !busy;

  const copyMin = async () => {
    try { await navigator.clipboard.writeText(minPts.toLocaleString()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const submit = () => {
    if (!canSubmit) return;
    onRequestDraft({ coinId, address: address.trim(), points: pts, usd });
  };

  return (
    <motion.section className={styles.panel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08, duration: 0.45 }}>
      <div className={styles.panelHead}>
        <span className={styles.panelIcon}><ArrowDownToLine size={17} /></span>
        <div>
          <h2>Withdraw to crypto</h2>
          <p>Sent manually by the EcoSpark treasury · network fees included in processing</p>
        </div>
      </div>

      {!eligible ? (
        <div className={styles.lockedNote}>
          <Lock size={15} />
          <span>
            Payouts unlock at {fmtUsd(getMinPayoutUsd())} ({fmtPts(minPts)} points). Keep earning — you're {fmtPts(minPts - spendable)} points away.
          </span>
        </div>
      ) : (
        <>
          <p className={styles.fieldLabel}>1 · Choose your coin</p>
          <div className={styles.coinRow}>
            {COINS.map((c) => (
              <button
                key={c.id}
                className={`${styles.coinBtn} ${coinId === c.id ? styles.coinOn : ''}`}
                style={{ '--accent': c.accent }}
                onClick={() => setCoinId(c.id)}
                type="button"
              >
                <span className={styles.coinGlyph}>{c.glyph}</span>
                <span className={styles.coinName}>{c.name}</span>
                <span className={styles.coinTicker}>{c.ticker}</span>
              </button>
            ))}
          </div>

          <p className={styles.fieldLabel}>2 · {coin.name} wallet address <span className={styles.netTag}>{coin.network}</span></p>
          <input
            className={`${styles.addrInput} ${addrErr ? styles.addrBad : ''}`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={coin.addrHint}
            spellCheck={false}
            autoComplete="off"
          />
          {addrErr && <p className={styles.fieldErr}><CircleAlert size={12} /> {addrErr}</p>}
          <p className={styles.fieldWarn}><Info size={12} /> Triple-check the address — crypto transfers are irreversible.</p>

          <p className={styles.fieldLabel}>3 · Amount</p>
          <div className={styles.amountRow}>
            <div className={styles.amountBox}>
              <input
                type="number"
                min="0"
                value={max ? '' : points}
                onChange={(e) => { setMax(false); setPoints(e.target.value); }}
                placeholder="0"
                disabled={max}
              />
              <span>pts</span>
            </div>
            <button className={styles.maxBtn} onClick={() => setMax(true)} type="button" disabled={!spendable}>MAX</button>
            <div className={styles.usdChip}>≈ {fmtUsd(usd)}</div>
          </div>
          {(belowMin || overBal) && (
            <p className={styles.fieldErr}>
              <CircleAlert size={12} />
              {belowMin ? `Minimum is ${fmtPts(minPts)} points (${fmtUsd(getMinPayoutUsd())}).` : 'Amount exceeds your spendable balance.'}
            </p>
          )}
          <p className={styles.minHint}>
            Minimum: {fmtPts(minPts)} pts
            <button className={styles.copyMin} onClick={copyMin} type="button">{copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'copied' : 'copy'}</button>
          </p>

          <button className={styles.submitBtn} onClick={submit} disabled={!canSubmit} type="button">
            <ArrowDownToLine size={16} />
            Request {pts > 0 ? `${fmtUsd(usd)} in ${coin.ticker}` : 'payout'}
          </button>
        </>
      )}
    </motion.section>
  );
}

/* ── pending payouts ─────────────────────────────────────────────────────── */

function PayoutCard({ p, onCancel }) {
  const coin = COIN_MAP[p.coin] || {};
  const busy = p._busy;
  const statusStyle = { pending: styles.stPending, paid: styles.stPaid, rejected: styles.stRejected, cancelled: styles.stCancelled }[p.status];

  return (
    <div className={styles.payoutCard} style={{ '--accent': coin.accent || '#2DD4A7' }}>
      <span className={styles.payoutGlyph}>{coin.glyph || '?'}</span>
      <div className={styles.payoutBody}>
        <p className={styles.payoutTitle}>
          {fmtUsd(p.usd || 0)} · {coin.ticker || p.coin}
          <span className={`${styles.statusChip} ${statusStyle}`}>{p.status}</span>
        </p>
        <p className={styles.payoutAddr} title={p.address}>{p.address}</p>
        {p.status === 'pending' && <p className={styles.payoutMeta}><Lock size={11} /> {fmtPts(p.points)} pts locked · awaiting treasury transfer</p>}
        {p.status === 'paid' && (
          <p className={styles.payoutMeta}>
            {p.txid && <>
              <ExternalLink size={11} />
              <a href={coin.explorer ? coin.explorer(p.txid) : '#'} target="_blank" rel="noreferrer" className={styles.txLink}>{p.txid.slice(0, 22)}…</a>
            </>}
          </p>
        )}
        {p.status === 'rejected' && p.rejectReason && <p className={styles.payoutMeta}>Reason: {p.rejectReason}</p>}
      </div>
      {p.status === 'pending' && (
        <button className={styles.cancelBtn} onClick={() => onCancel(p)} disabled={busy} type="button">
          {busy ? <Loader2 size={13} className={styles.spin} /> : <X size={13} />} Cancel
        </button>
      )}
    </div>
  );
}

/* ── ledger ──────────────────────────────────────────────────────────────── */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'spent', label: 'Spent' },
  { id: 'payouts', label: 'Payouts' },
];

function Ledger({ rows }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'payouts') return rows.filter((r) => r.kind === 'payout');
    return rows.filter((r) => (filter === 'earned' ? r.type === 'earned' : r.type === 'spent' || r.type === 'locked'));
  }, [rows, filter]);

  const shown = expanded ? filtered : filtered.slice(0, 14);

  return (
    <motion.section className={styles.panel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14, duration: 0.45 }}>
      <div className={styles.panelHead}>
        <span className={styles.panelIconLedger}><Zap size={17} /></span>
        <div>
          <h2>Transaction ledger</h2>
          <p>Every point you've ever earned, spent or locked — append-only, auditable</p>
        </div>
      </div>

      <div className={styles.filterRow}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`${styles.filterChip} ${filter === f.id ? styles.filterOn : ''}`} onClick={() => setFilter(f.id)} type="button">
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.ledgerEmpty}><ShieldCheck size={16} /> Nothing here yet.</div>
      ) : (
        <div className={styles.ledger}>
          {shown.map((r) => (
            <div key={`${r.kind}-${r.id}`} className={styles.ledgerRow}>
              <span className={`${styles.ledgerDot} ${r.type === 'earned' ? styles.dotEarned : r.type === 'locked' ? styles.dotLocked : styles.dotSpent}`} />
              <div className={styles.ledgerBody}>
                <p className={styles.ledgerTitle}>{r.title}</p>
                <p className={styles.ledgerTime}>{r.at ? timeAgo(r.at) : ''}</p>
              </div>
              <span className={`${styles.ledgerAmt} ${r.amount > 0 ? styles.amtIn : r.amount < 0 ? styles.amtOut : styles.amtZero}`}>
                {r.amount > 0 ? '+' : ''}{r.amount !== 0 ? fmtPts(r.amount) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 14 && (
        <button className={styles.moreBtn} onClick={() => setExpanded((e) => !e)} type="button">
          {expanded ? 'Show less' : `Show all ${filtered.length} entries`} <ChevronDown size={14} className={expanded ? styles.flip : ''} />
        </button>
      )}
    </motion.section>
  );
}

/* ── request confirm modal ───────────────────────────────────────────────── */

function ConfirmModal({ draft, onClose }) {
  return (
    <motion.div className={styles.modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className={styles.modal} initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 14 }}>
        <h3>Confirm payout</h3>
        <p className={styles.modalSub}>This locks your points immediately. The treasury sends the crypto manually — usually within a few days.</p>
        <div className={styles.modalRows}>
          <div><span>Amount</span><strong>{fmtPts(draft.points)} pts</strong></div>
          <div><span>Value</span><strong>{fmtUsd(pointsToUsd(draft.points))}</strong></div>
          <div><span>Coin</span><strong>{COIN_MAP[draft.coinId]?.name} ({COIN_MAP[draft.coinId]?.ticker})</strong></div>
          <div className={styles.modalAddr}><span>Address</span><strong>{draft.address}</strong></div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnGhost} onClick={onClose} disabled={draft.busy} type="button">Not yet</button>
          <button className={styles.btnPrimary} onClick={draft.onConfirm} disabled={draft.busy} type="button">
            {draft.busy ? <Loader2 size={15} className={styles.spin} /> : <ShieldCheck size={15} />} Lock & request
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function Wallet() {
  const { profile } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const [rows, setRows] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const ledger = await getLedger().catch(() => []);
    setRows(ledger);
    setPayouts(ledger.filter((r) => r.kind === 'payout').map((r) => ({ id: r.id, ...r.raw, at: r.at })));
  };

  useEffect(() => { load(); }, []);

  // keep the ledger fresh when the profile balance changes (earning elsewhere)
  useEffect(() => { if (rows) load(); }, [profile?.spendableBalance]);

  const pending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + (Number(p.points) || 0), 0);

  const handleRequested = () => { setConfirm(null); load(); };

  const onCancel = async (p) => {
    setPayouts((ps) => ps.map((x) => (x.id === p.id ? { ...x, _busy: true } : x)));
    try {
      const res = await cancelPayout(p.id);
      toast.success(`Cancelled — ${fmtPts(res.refunded)} points returned`);
      load();
    } catch (e) {
      toast.error(e.message || 'Cancel failed');
      setPayouts((ps) => ps.map((x) => (x.id === p.id ? { ...x, _busy: false } : x)));
    }
  };

  return (
    <div className={styles.page}>
      <BalanceHero profile={profile} pending={pending} />

      <PayoutPanel profile={profile} onRequestDraft={setConfirm} />

      <AnimatePresence>
        {confirm && (
          <ConfirmModal
            draft={{
              ...confirm,
              busy: false,
              onConfirm: async () => {
                setConfirm((c) => ({ ...c, busy: true }));
                try {
                  const res = await requestPayout(confirm);
                  toast.success(`Payout locked — ${fmtUsd(res.usd)} on the way`);
                  handleRequested();
                } catch (e) {
                  toast.error(e.message || 'Payout failed');
                  setConfirm(null);
                }
              },
            }}
            onClose={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      {payouts.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}><Lock size={16} /> Your payouts</h2>
          <div className={styles.payoutList}>
            {payouts.slice(0, 6).map((p) => <PayoutCard key={p.id} p={p} onCancel={onCancel} />)}
          </div>
        </>
      )}

      <h2 className={styles.sectionTitle}><Zap size={16} /> Ledger</h2>
      {rows === null ? (
        <div className={styles.ledgerEmpty}><Loader2 size={15} className={styles.spin} /> Counting your points…</div>
      ) : (
        <Ledger rows={rows} />
      )}
    </div>
  );
}

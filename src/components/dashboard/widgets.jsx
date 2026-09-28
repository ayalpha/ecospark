// src/components/dashboard/widgets.jsx
// Compact dashboard widgets: Next Unlock, Weekly Mission, Verification Status,
// Leaderboard Mini. All data comes from stores/services that already exist.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { REWARDS_DB, TIER_CONFIG } from '../../constants/rewards';
import {
  subscribeLeaderboard,
  subscribeUserSubmissions,
} from '../../services/firestoreService';
import { useAuthStore } from '../../store/authStore';
import {
  Gift, Target, ShieldCheck, LoaderCircle, CheckCircle2, Trophy, ChevronRight, Flame,
  Award, Sparkle, Bot, ImageIcon, DoorOpen, Crown,
} from 'lucide-react';
import styles from './widgets.module.css';

/* ── Next Unlock ───────────────────────────────────────────────────────────── */

// Professional iconography per reward type — no emoji, ever.
const REWARD_ICONS = {
  frame: Award,
  glow: Sparkle,
  companion: Bot,
  background: ImageIcon,
  entry: DoorOpen,
};

function rewardIcon(reward, color) {
  const Icon = REWARD_ICONS[reward.type] || Award;
  return <Icon size={22} color={color || 'var(--color-gold)'} strokeWidth={1.8} />;
}

export function NextUnlockCard({ profile }) {
  const balance = profile?.spendableBalance ?? profile?.points ?? 0;

  const owned = new Set([
    ...(profile?.unlockedFrames || []),
    ...(profile?.inventory?.frames || []),
    ...(profile?.inventory?.glows || []),
    ...(profile?.inventory?.companions || []),
    ...(profile?.inventory?.backgrounds || []),
    ...(profile?.inventory?.entries || []),
  ]);

  const next = REWARDS_DB.filter(
    (r) => !owned.has(r.id) && r.pointCost > 0 && !r.id.startsWith('entry-')
  ).sort((a, b) => a.pointCost - b.pointCost)[0];

  if (!next) return null;

  const tier = TIER_CONFIG[next.tier] || {};
  const pct = Math.min(100, Math.round((balance / next.pointCost) * 100));
  const toGo = Math.max(0, next.pointCost - balance);
  const affordable = toGo === 0;

  return (
    <motion.div className={styles.widget} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <div className={styles.widgetHead}>
        <span className={styles.widgetIcon} style={{ color: tier.color || 'var(--color-gold)' }}>
          <Gift size={17} />
        </span>
        <span className={styles.widgetTitle}>Next Unlock</span>
        <Link to="/rewards" className={styles.widgetLink}><ChevronRight size={15} /></Link>
      </div>

      <div className={styles.unlockBody}>
        <div>
          <p className={styles.unlockName}>{next.name}</p>
          <p className={styles.unlockTier} style={{ color: tier.color || 'var(--color-text-tertiary)' }}>
            {tier.label || next.tier} · {next.pointCost.toLocaleString()} pts
          </p>
        </div>
        <span
          className={styles.unlockIcon}
          style={{ borderColor: (tier.color || '#F59E0B') + '55', boxShadow: `0 0 18px ${(tier.color || '#F59E0B')}22` }}
        >
          {rewardIcon(next, tier.color)}
        </span>
      </div>

      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
        />
      </div>
      <p className={styles.unlockFootnote}>
        {affordable
          ? <span className={styles.ready}>Unlocked — redeem it in Rewards!</span>
          : <><strong>{toGo.toLocaleString()}</strong> pts to go</>}
      </p>
    </motion.div>
  );
}

/* ── Weekly Mission (goal ring) ────────────────────────────────────────────── */

function GoalRing({ pct, color, label }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className={styles.ringWrap}>
      <svg width="66" height="66" viewBox="0 0 66 66">
        <circle cx="33" cy="33" r={R} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <motion.circle
          cx="33" cy="33" r={R} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - Math.min(pct, 1)) }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          transform="rotate(-90 33 33)"
        />
      </svg>
      <div className={styles.ringLabel}>
        <strong>{label}</strong>
        <span>{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

export function WeeklyMissionCard({ profile }) {
  const tasks = profile?.totalTasksCompleted || 0;
  const taskPct = (tasks % 5) / 5;
  const co2kg = (profile?.totalCO2Saved || 0) / 1000;
  const co2Pct = Math.min(1, co2kg / 10);

  return (
    <motion.div className={styles.widget} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <div className={styles.widgetHead}>
        <span className={styles.widgetIcon} style={{ color: 'var(--color-info)' }}><Target size={17} /></span>
        <span className={styles.widgetTitle}>Weekly Mission</span>
      </div>

      <div className={styles.missionBody}>
        <GoalRing pct={taskPct} color="var(--color-primary-light)" label="Tasks" />
        <GoalRing pct={co2Pct} color="var(--color-secondary-light)" label="CO₂" />
        <div className={styles.missionMeta}>
          <p><strong>{tasks % 5}</strong> / 5 tasks this week</p>
          <p><strong>{co2kg.toFixed(1)}</strong> / 10 kg CO₂ saved</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Verification status ───────────────────────────────────────────────────── */

export function VerificationCard({ profile }) {
  const [subs, setSubs] = useState(null); // null = loading
  const { profile: p } = useAuthStore();

  useEffect(() => {
    const uid = profile?.id || p?.id;
    if (!uid) return;
    return subscribeUserSubmissions(uid, (rows) => {
      setSubs(rows.filter((s) => ['pending', 'checking', 'flagged'].includes(s.status)).slice(0, 2));
    });
  }, [profile?.id, p?.id]);

  if (!subs || subs.length === 0) return null;

  return (
    <motion.div className={`${styles.widget} ${styles.verifyWidget}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.widgetHead}>
        <span className={styles.widgetIcon} style={{ color: 'var(--color-warning)' }}><ShieldCheck size={17} /></span>
        <span className={styles.widgetTitle}>Verifying your eco-actions</span>
        <Link to="/tasks" className={styles.widgetLink}><ChevronRight size={15} /></Link>
      </div>

      <ul className={styles.verifyList}>
        {subs.map((s) => (
          <li key={s.id} className={styles.verifyRow}>
            {s.status === 'flagged'
              ? <CheckCircle2 size={15} color="var(--color-warning)" />
              : <LoaderCircle size={15} color="var(--color-info)" className={styles.spin} />}
            <span className={styles.verifyTitle}>{s.taskTitle || s.verificationPrompt?.slice(0, 46) || 'Eco-task photo'}</span>
            <span className={styles.verifyState}>
              {s.status === 'flagged' ? 'needs review' : 'AI checking…'}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.verifyNote}>Points land automatically the moment they're approved.</p>
    </motion.div>
  );
}

/* ── Leaderboard mini ──────────────────────────────────────────────────────── */

export function LeaderboardMini({ profile }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    return subscribeLeaderboard('weekly', null, setRows, () => setRows([]));
  }, [profile?.id]);

  if (!rows) return null;

  const idx = rows.findIndex((r) => r.id === profile.id);
  const around = [];
  if (idx === -1) {
    around.push(...rows.slice(0, 3));
  } else {
    around.push(rows[idx - 1], rows[idx], rows[idx + 1]);
  }
  const visible = around.filter(Boolean);
  if (visible.length === 0) return null;

  const myRank = idx >= 0 ? idx + 1 : null;

  return (
    <motion.div className={styles.widget} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <div className={styles.widgetHead}>
        <span className={styles.widgetIcon} style={{ color: 'var(--color-gold)' }}><Trophy size={17} /></span>
        <span className={styles.widgetTitle}>This Week's Race</span>
        <Link to="/leaderboard" className={styles.widgetLink}><ChevronRight size={15} /></Link>
      </div>

      {myRank && (
        <p className={styles.rankLine}>
          You're <strong>#{myRank}</strong>
          {idx > 0 && rows[idx - 1] && (
            <> — {(rows[idx - 1].weeklyPoints || 0) - (profile.weeklyPoints || 0)} pts behind #{idx}</>
          )}
          {idx === 0 && <span className={styles.crown}> — leading! <Crown size={14} color="var(--color-gold)" /></span>}
        </p>
      )}

      <ul className={styles.lbList}>
        {visible.map((r) => {
          const rank = rows.findIndex((x) => x.id === r.id) + 1;
          const isMe = r.id === profile.id;
          return (
            <li key={r.id} className={`${styles.lbRow} ${isMe ? styles.lbMe : ''}`}>
              <span className={styles.lbRank}>#{rank}</span>
              <span className={styles.lbName}>{r.displayName || r.email?.split('@')[0] || 'EcoHero'}</span>
              <span className={styles.lbPts}>
                <Flame size={12} color="var(--color-streak)" /> {r.weeklyPoints || 0} pts
              </span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

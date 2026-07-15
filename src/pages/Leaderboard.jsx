// src/pages/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { subscribeLeaderboard } from '../services/firestoreService';
import styles from './Leaderboard.module.css';

const RANK_STYLE = {
  1: { bg: 'linear-gradient(135deg, #F59E0B, #FBBF24)', glow: 'var(--glow-gold)', icon: '🥇' },
  2: { bg: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)', glow: '0 0 16px rgba(156,163,175,0.5)', icon: '🥈' },
  3: { bg: 'linear-gradient(135deg, #CD7F32, #B8864E)', glow: '0 0 16px rgba(205,127,50,0.5)', icon: '🥉' },
};

function LeaderboardRow({ entry, myId, index }) {
  const isMe = entry.userId === myId;
  const style = RANK_STYLE[entry.rank];

  return (
    <motion.div
      className={`${styles.row} ${isMe ? styles.myRow : ''}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      layout
      style={isMe ? { boxShadow: 'var(--glow-primary)' } : {}}
    >
      {/* Rank */}
      <div
        className={styles.rank}
        style={style ? { background: style.bg, boxShadow: style.glow } : {}}
      >
        {style ? style.icon : entry.rank}
      </div>

      {/* Avatar */}
      <div className={styles.avatar}>
        {entry.photoURL
          ? <img src={entry.photoURL} alt={entry.displayName} />
          : <span>{(entry.displayName || '?')[0].toUpperCase()}</span>
        }
      </div>

      {/* Name */}
      <div className={styles.nameBlock}>
        <p className={styles.name}>
          {entry.displayName || 'EcoUser'}
          {isMe && <span className={styles.youBadge}>You</span>}
        </p>
        <p className={styles.streak}>🔥 {entry.streak || 0} day streak</p>
      </div>

      {/* Points */}
      <div className={styles.pointsBlock}>
        <span className={`${styles.points} ${entry.rank <= 3 ? styles.topPoints : ''}`}>
          {(entry.points || 0).toLocaleString()}
        </span>
        <span className={styles.ptLabel}>pts</span>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('global');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeLeaderboard(tab, null, (data) => {
      setEntries(data);
      setLoading(false);
    }, (err) => {
      console.error('[Leaderboard] Failed to load:', err);
      setError(err?.message || 'Unknown error loading leaderboard');
      setLoading(false);
    });
    return unsub;
  }, [tab]);

  const myRank = entries.findIndex((e) => e.userId === user?.uid) + 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Leaderboard</h1>
          {myRank > 0 && (
            <p className={styles.myRank}>Your rank: <strong>#{myRank}</strong></p>
          )}
        </div>
        <div className={styles.trophy}>🏆</div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {['global', 'group'].map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'global' ? '🌍 Global' : '👥 My Group'}
          </button>
        ))}
      </div>

      {/* Top 3 podium (desktop) */}
      {!loading && entries.length >= 3 && (
        <div className={styles.podium}>
          {[entries[1], entries[0], entries[2]].map((e, i) => e && (
            <motion.div
              key={e.id}
              className={`${styles.podiumSlot} ${i === 1 ? styles.podiumFirst : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={styles.podiumAvatar}>
                {e.photoURL ? <img src={e.photoURL} alt={e.displayName} /> : (e.displayName || '?')[0].toUpperCase()}
              </div>
              <div className={styles.podiumName}>{e.displayName || 'EcoUser'}</div>
              <div className={styles.podiumPts}>{(e.points || 0).toLocaleString()} pts</div>
              <div className={styles.podiumBar} style={{ height: i === 1 ? 80 : 60 }}>
                {RANK_STYLE[e.rank]?.icon}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full list */}
      <div className={styles.list}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.rowSkeleton}`} />
            ))
          : error 
          ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <span style={{ fontSize: '3rem' }}>⚠️</span>
              <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Failed to load leaderboard</p>
              <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, wordBreak: 'break-all' }}>
                {error}
              </code>
            </div>
          )
          : entries.length === 0
          ? (
            <div className={styles.empty}>
              <span>🌱</span>
              <p>No entries yet — be the first!</p>
            </div>
          )
          : entries.map((e, i) => (
              <LeaderboardRow key={e.id} entry={e} myId={user?.uid} index={i} />
            ))
        }
      </div>
    </div>
  );
}

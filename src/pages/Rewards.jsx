// src/pages/Rewards.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getRewards, redeemReward } from '../services/firestoreService';
import toast from 'react-hot-toast';
import styles from './Rewards.module.css';

const TIER_CONFIG = {
  bronze: { color: '#CD7F32', glow: '0 0 20px rgba(205,127,50,0.4)', label: 'Bronze' },
  silver: { color: '#9CA3AF', glow: '0 0 20px rgba(156,163,175,0.5)', label: 'Silver' },
  gold: { color: '#F59E0B', glow: 'var(--glow-gold)', label: 'Gold' },
  platinum: { color: '#7C3AED', glow: '0 0 20px rgba(124,58,237,0.5)', label: 'Platinum' },
};

function ConfettiParticle({ delay }) {
  const colors = ['#2E7D32', '#F59E0B', '#00897B', '#EF4444', '#3B82F6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  return (
    <motion.div
      style={{
        position: 'fixed', top: '30%', left: `${left}%`,
        width: 8, height: 8, borderRadius: 2,
        background: color, pointerEvents: 'none', zIndex: 9999,
      }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{ y: window.innerHeight * 0.6, opacity: 0, rotate: 360 }}
      transition={{ duration: 1.5, delay, ease: 'easeIn' }}
    />
  );
}

function RewardCard({ reward, userPoints, owned, onRedeem }) {
  const cfg = TIER_CONFIG[reward.tier] || TIER_CONFIG.bronze;
  const canAfford = userPoints >= reward.pointCost;

  return (
    <motion.div
      className={`${styles.card} ${owned ? styles.owned : ''} ${!canAfford && !owned ? styles.locked : ''}`}
      whileHover={canAfford && !owned ? { y: -4, boxShadow: cfg.glow } : {}}
      transition={{ duration: 0.2 }}
      style={{ '--reward-color': cfg.color }}
    >
      <div className={styles.badgeArt}>
        <div className={styles.badgeGlow} style={{ background: cfg.color }} />
        <span className={styles.badgeEmoji}>{reward.icon || '🏅'}</span>
      </div>

      <div className={styles.tierLabel} style={{ color: cfg.color }}>
        {cfg.label} Tier
      </div>

      <h3 className={styles.rewardName}>{reward.name}</h3>
      <p className={styles.rewardDesc}>{reward.description}</p>

      <div className={styles.cardFooter}>
        <div className={styles.cost}>
          <span className={styles.costNum}>{reward.pointCost.toLocaleString()}</span>
          <span className={styles.costLabel}>pts</span>
        </div>

        {owned ? (
          <div className={styles.ownedBadge}>✅ Unlocked</div>
        ) : (
          <motion.button
            className={styles.redeemBtn}
            disabled={!canAfford}
            onClick={() => onRedeem(reward)}
            whileTap={{ scale: 0.95 }}
            style={canAfford ? { boxShadow: cfg.glow } : {}}
          >
            {canAfford ? 'Redeem 🎁' : `Need ${(reward.pointCost - userPoints).toLocaleString()} more`}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default function Rewards() {
  const { user, profile } = useAuthStore();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadRewards = () => {
    setLoading(true);
    setError(null);
    getRewards()
      .then(setRewards)
      .catch((err) => {
        console.error('[Rewards] Failed to load:', err);
        setError(err?.message || 'Unknown error loading rewards');
        toast.error('Could not load rewards — check console for details');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const handleRedeem = async (reward) => {
    if (!user || !profile) return;
    setUnlocking(reward.id);
    try {
      await redeemReward(user.uid, reward.id, reward.pointCost);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      toast.success(`🎉 ${reward.name} unlocked!`);
    } catch (err) {
      toast.error(err.message || 'Could not redeem reward');
    } finally {
      setUnlocking(null);
    }
  };

  const ownedIds = profile?.badges || [];
  const userPoints = profile?.points || 0;

  return (
    <div className={styles.page}>
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 0.04} />
        ))}
      </AnimatePresence>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Rewards</h1>
          <p className={styles.subtitle}>You have <strong>{userPoints.toLocaleString()} pts</strong> to spend</p>
        </div>
        <span className={styles.headerIcon}>🎁</span>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.cardSkeleton}`} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '48px 24px', gap: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Failed to load rewards</p>
          <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, maxWidth: '100%', wordBreak: 'break-all', display: 'block' }}>
            {error}
          </code>
          <button
            onClick={loadRewards}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-sm)' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {rewards.map((r) => (
            <RewardCard
              key={r.id}
              reward={r}
              userPoints={userPoints}
              owned={ownedIds.includes(r.id)}
              onRedeem={handleRedeem}
            />
          ))}
          {rewards.length === 0 && (
            <div className={styles.empty}>
              <span>🎁</span>
              <p>Rewards are coming soon!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

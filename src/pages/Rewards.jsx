// src/pages/Rewards.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getRewards, redeemReward, equipFrame, unequipFrame, subscribeUserTransactions } from '../services/firestoreService';
import { BronzeFrame, SilverFrame, GoldFrame, PlatinumFrame, GodFrame, GaiaFrame, SupernovaFrame, PrimeFrame } from '../components/common/Frames';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import styles from './Rewards.module.css';

const FRAME_COMPONENTS = {
  'frame-bronze': BronzeFrame,
  'frame-silver': SilverFrame,
  'frame-gold': GoldFrame,
  'frame-platinum': PlatinumFrame,
  'frame-god': GodFrame,
  'frame-gaia': GaiaFrame,
  'frame-supernova': SupernovaFrame,
  'frame-prime': PrimeFrame,
};

const TIER_CONFIG = {
  bronze: { color: '#CD7F32', glow: '0 0 20px rgba(205,127,50,0.4)', label: 'Bronze' },
  silver: { color: '#9CA3AF', glow: '0 0 20px rgba(156,163,175,0.5)', label: 'Silver' },
  gold: { color: '#F59E0B', glow: 'var(--glow-gold)', label: 'Gold' },
  platinum: { color: '#7C3AED', glow: '0 0 20px rgba(124,58,237,0.5)', label: 'Platinum' },
  god: { color: '#FACC15', glow: '0 0 30px rgba(250,204,21,0.8)', label: 'God' },
  gaia: { color: '#10B981', glow: '0 0 35px rgba(16,185,129,0.6)', label: 'Legendary' },
  supernova: { color: '#8B5CF6', glow: '0 0 40px rgba(139,92,246,0.7)', label: 'Legendary' },
  prime: { color: '#FFD700', glow: '0 0 50px rgba(255,215,0,1)', label: 'Prime' },
};

const HARDCODED_FRAMES = [
  { id: 'frame-bronze', name: 'Bronze Frame', description: 'A sturdy bronze frame for your avatar.', pointCost: 500, tier: 'bronze', icon: '🥉' },
  { id: 'frame-silver', name: 'Silver Frame', description: 'An elegant silver frame.', pointCost: 1000, tier: 'silver', icon: '🥈' },
  { id: 'frame-gold', name: 'Gold Frame', description: 'A luxurious gold frame.', pointCost: 2500, tier: 'gold', icon: '🥇' },
  { id: 'frame-platinum', name: 'Platinum Frame', description: 'A shining platinum frame.', pointCost: 5000, tier: 'platinum', icon: '💎' },
  { id: 'frame-god', name: 'Supreme God Frame', description: 'The ultimate celestial frame.', pointCost: 10000, tier: 'god', icon: '👑' },
  { id: 'frame-gaia', name: 'Gaia Crown', description: 'Earth\'s Guardian — a legendary emerald aura with golden shimmer. Only the most dedicated eco-warriors wield this.', pointCost: 25000, tier: 'gaia', icon: '🌿' },
  { id: 'frame-supernova', name: 'Supernova', description: 'Cosmic Energy — a legendary deep-space frame with rotating neon gradients and orbiting energy orbs. The rarest frame in existence.', pointCost: 50000, tier: 'supernova', icon: '🌌' },
  { id: 'frame-prime', name: 'Prime Frame', description: 'The Ascended Aura — the ultimate, reality-bending celestial frame. Reserved only for the most elite eco-gods.', pointCost: 999999, tier: 'prime', icon: '✨' },
];

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

function RewardCard({ reward, userPoints, owned, onRedeem, onEquip, onUnequip, isEquipped }) {
  const cfg = TIER_CONFIG[reward.tier] || TIER_CONFIG.bronze;
  const canAfford = userPoints >= reward.pointCost;
  const isFrame = reward.id?.startsWith('frame-');
  const FrameComponent = isFrame ? FRAME_COMPONENTS[reward.id] : null;

  return (
    <motion.div
      className={`${styles.card} ${owned ? styles.owned : ''} ${!canAfford && !owned ? styles.locked : ''}`}
      whileHover={canAfford && !owned ? { y: -4, boxShadow: cfg.glow } : {}}
      transition={{ duration: 0.2 }}
      style={{ '--reward-color': cfg.color, border: isEquipped ? `2px solid ${cfg.color}` : undefined }}
    >
      <div className={styles.badgeArt}>
        <div className={styles.badgeGlow} style={{ background: cfg.color }} />
        {FrameComponent ? (
          <div style={{ width: '80%', height: '80%', position: 'relative', zIndex: 2 }}>
            <FrameComponent />
          </div>
        ) : (
          <span className={styles.badgeEmoji}>{reward.icon || '🏅'}</span>
        )}
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
          isFrame ? (
            isEquipped ? (
              <motion.button 
                className={styles.redeemBtn} 
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} 
                onClick={onUnequip}
                whileTap={{ scale: 0.95 }}
              >
                Unequip
              </motion.button>
            ) : (
              <motion.button 
                className={styles.redeemBtn} 
                style={{ background: cfg.color, color: '#000', boxShadow: cfg.glow }} 
                onClick={() => onEquip(reward.id)}
                whileTap={{ scale: 0.95 }}
              >
                Equip
              </motion.button>
            )
          ) : (
            <div className={styles.ownedBadge}>✅ Unlocked</div>
          )
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
  const { settings } = useSettingsStore();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'history') {
      setTxLoading(true);
      const unsub = subscribeUserTransactions(user.uid, (data) => {
        setTransactions(data);
        setTxLoading(false);
      });
      return unsub;
    }
  }, [user, activeTab]);

  const loadRewards = () => {
    setLoading(true);
    setError(null);
    getRewards()
      .then((fetched) => {
        const combined = [...fetched];
        // Filter legendary frames based on admin settings
        const filteredFrames = HARDCODED_FRAMES.filter(frame => {
          // If the user ALREADY OWNS the frame, ALWAYS show it so they can equip it!
          const ownsFrame = profile?.unlockedFrames?.includes(frame.id);
          if (ownsFrame) return true;

          // Otherwise, hide admin-exclusive frames, or frames disabled in global settings
          if (frame.id === 'frame-prime') return false; 
          if (frame.id === 'frame-gaia' && !settings?.gaiaFrameEnabled) return false;
          if (frame.id === 'frame-supernova' && !settings?.supernovaFrameEnabled) return false;
          
          return true;
        });
        filteredFrames.forEach(frame => {
          if (!combined.find(r => r.id === frame.id)) {
            combined.push(frame);
          }
        });
        combined.sort((a, b) => a.pointCost - b.pointCost);
        setRewards(combined);
      })
      .catch((err) => {
        console.error('[Rewards] Failed to load:', err);
        setError(err?.message || 'Unknown error loading rewards');
        toast.error('Could not load rewards — check console for details');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRewards();
  }, [profile?.unlockedFrames?.length, settings?.gaiaFrameEnabled, settings?.supernovaFrameEnabled]);

  const handleEquip = async (frameId) => {
    if (!user) return;
    try {
      await equipFrame(user.uid, frameId);
      toast.success('Frame equipped!');
    } catch (err) {
      toast.error('Failed to equip frame');
    }
  };

  const handleUnequip = async () => {
    if (!user) return;
    try {
      await unequipFrame(user.uid);
      toast.success('Frame unequipped!');
    } catch (err) {
      toast.error('Failed to unequip frame');
    }
  };

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

  const ownedIds = [...(profile?.badges || []), ...(profile?.unlockedFrames || [])];
  const userPoints = profile?.spendableBalance ?? profile?.points ?? 0;

  // Filter and sort logic
  const filteredRewards = rewards.filter(r => {
    if (activeTab === 'frames') return r.id.startsWith('frame-');
    if (activeTab === 'badges') return !r.id.startsWith('frame-');
    return true; // 'all'
  });

  if (activeTab === 'all') {
    filteredRewards.sort((a, b) => {
      const aIsFrame = a.id.startsWith('frame-');
      const bIsFrame = b.id.startsWith('frame-');
      if (aIsFrame && !bIsFrame) return -1;
      if (!aIsFrame && bIsFrame) return 1;
      return a.pointCost - b.pointCost;
    });
  }

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

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {['all', 'frames', 'badges'].map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          View History 📜
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className={styles.historyList}>
          {txLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading history...</p>
          ) : transactions.length === 0 ? (
            <div className={styles.empty}>
              <span>📜</span>
              <p>No transactions yet. Complete some tasks to earn points!</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const dateObj = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
              return (
                <div key={tx.id} className={styles.txRow}>
                  <div className={styles.txInfo}>
                    <div className={styles.txType} style={{ background: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {tx.type.toUpperCase()}
                    </div>
                    <div className={styles.txDesc}>{tx.description}</div>
                    <div className={styles.txDate}>{dateObj.toLocaleString()}</div>
                  </div>
                  <div className={styles.txAmount} style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {isPositive ? '+' : ''}{tx.amount}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : loading ? (
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
          {filteredRewards.map((r) => (
            <RewardCard
              key={r.id}
              reward={r}
              userPoints={userPoints}
              owned={ownedIds.includes(r.id)}
              onRedeem={handleRedeem}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              isEquipped={profile?.activeFrame === r.id}
            />
          ))}
          {filteredRewards.length === 0 && (
            <div className={styles.empty}>
              <span>🎁</span>
              <p>No rewards found for this category!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

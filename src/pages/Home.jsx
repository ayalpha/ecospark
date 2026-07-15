// src/pages/Home.jsx
import { Suspense, lazy, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import NewsBoard from '../components/news/NewsBoard';
import EcoHeroStatic from '../components/hero/EcoHeroStatic';
import styles from './Home.module.css';

// Lazy-load 3D hero (code-split, never blocks initial paint)
const EcoHero3D = lazy(() => import('../components/hero/EcoHero3D'));

// Capability check for 3D
function canRender3D() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  const mem = navigator?.deviceMemory;
  const cpu = navigator?.hardwareConcurrency;
  if (mem && mem < 4) return false;
  if (cpu && cpu < 4) return false;
  const w = window.innerWidth;
  if (w < 768) return false; // Always static on mobile
  return true;
}

function HeroSection() {
  const use3D = useMemo(() => canRender3D(), []);
  const { reducedMotion } = useUiStore();

  if (reducedMotion || !use3D) {
    return <EcoHeroStatic />;
  }

  return (
    <Suspense fallback={<EcoHeroStatic />}>
      <EcoHero3D />
    </Suspense>
  );
}

function StatCard({ icon, label, value, sublabel, color, to }) {
  const content = (
    <motion.div
      className={styles.statCard}
      whileHover={{ y: -4, boxShadow: 'var(--elevation-3)' }}
      transition={{ duration: 0.2 }}
      style={{ '--card-accent': color }}
    >
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statBody}>
        <motion.p
          className={styles.statValue}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {value}
        </motion.p>
        <p className={styles.statLabel}>{label}</p>
        {sublabel && <p className={styles.statSub}>{sublabel}</p>}
      </div>
      <div className={styles.statAccent} />
    </motion.div>
  );

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function QuickActions() {
  const actions = [
    { icon: '📸', label: 'Log Task', to: '/tasks', color: 'var(--color-primary)' },
    { icon: '🏆', label: 'Leaderboard', to: '/leaderboard', color: 'var(--color-gold)' },
    { icon: '🎁', label: 'Rewards', to: '/rewards', color: 'var(--color-secondary)' },
    { icon: '🌍', label: 'Community', to: '/community', color: '#7C3AED' },
  ];

  return (
    <div className={styles.quickActions}>
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className={styles.quickAction}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className={styles.quickActionInner}
            style={{ '--qa-color': a.color }}
          >
            <span className={styles.qaIcon}>{a.icon}</span>
            <span className={styles.qaLabel}>{a.label}</span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const { profile } = useAuthStore();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const streakMsg = useMemo(() => {
    const s = profile?.streak || 0;
    if (s === 0) return 'Start your streak today!';
    if (s === 1) return "You've started! Keep going 🌱";
    if (s < 7) return `${s} days strong!`;
    if (s < 30) return `${s} days — you're on fire! 🔥`;
    return `${s} days — legend! 🏆`;
  }, [profile?.streak]);

  return (
    <div className={styles.page}>
      {/* Welcome header */}
      <motion.div
        className={styles.welcome}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className={styles.greeting}>
            {greeting}, <span className={styles.name}>{profile?.displayName?.split(' ')[0] || 'EcoHero'}</span> 👋
          </h1>
          <p className={styles.subgreeting}>{streakMsg}</p>
        </div>
        <Link to="/settings" className={styles.settingsBtn} aria-label="Settings">⚙️</Link>
      </motion.div>

      {/* ══════════════════════════════════════════
          LAYOUT GRID
          Mobile: stacked single column
          Tablet: 2-col
          Desktop: 3-col with hero spanning 2 rows
      ══════════════════════════════════════════ */}
      <div className={styles.grid}>

        {/* 3D Hero (desktop only, spans 2 rows) */}
        <motion.div
          className={styles.heroCard}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <HeroSection />
          <div className={styles.heroOverlay}>
            <p className={styles.heroLabel}>Your Eco Impact</p>
            <p className={styles.heroPoints}>
              ⚡ <strong>{(profile?.points || 0).toLocaleString()}</strong> points earned
            </p>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className={styles.statsArea}>
          <StatCard
            icon="🔥"
            label="Day Streak"
            value={profile?.streak || 0}
            sublabel={profile?.longestStreak ? `Longest: ${profile.longestStreak} days` : 'Start your streak today!'}
            color="var(--color-streak)"
            to="/tasks"
          />
          <StatCard
            icon="⚡"
            label="Total Points"
            value={(profile?.points || 0).toLocaleString()}
            sublabel={`This week: ${profile?.weeklyPoints || 0}`}
            color="var(--color-gold)"
            to="/leaderboard"
          />
          <StatCard
            icon="✅"
            label="Tasks Done"
            value={profile?.totalTasksCompleted || 0}
            sublabel="eco actions logged"
            color="var(--color-primary)"
            to="/tasks"
          />
          <StatCard
            icon="🌿"
            label="CO₂ Saved"
            value={`${((profile?.totalCO2Saved || 0) / 1000).toFixed(1)}kg`}
            sublabel="estimated impact"
            color="var(--color-secondary)"
          />
        </div>

        {/* Quick actions */}
        <div className={styles.actionsArea}>
          <h2 className={styles.sectionHeading}>Quick Actions</h2>
          <QuickActions />
        </div>

        {/* News board */}
        <div className={styles.newsArea}>
          <NewsBoard />
        </div>
      </div>
    </div>
  );
}

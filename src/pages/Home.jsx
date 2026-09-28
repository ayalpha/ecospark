// src/pages/Home.jsx
// Mission dashboard. Layout: Earth hero + live news rail up top; quick
// actions, stats, and goal widgets in bands below — news first on the right,
// everything actionable pushed downward.

import { Suspense, lazy, useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { subscribeUserNotifications } from '../services/firestoreService';
import NewsBoard from '../components/news/NewsBoard';
import EcoHeroStatic from '../components/hero/EcoHeroStatic';
import { VerificationCard } from '../components/dashboard/widgets';
import { Camera, Trophy, Gift, Globe, Bell, Zap, Flame, CheckSquare, Leaf, Sparkles } from 'lucide-react';
import styles from './Home.module.css';

// Lazy-load 3D hero (code-split, never blocks initial paint)
const EcoHero3D = lazy(() => import('../components/hero/EcoHero3D'));

// Capability check for 3D
function canRender3D() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  const w = window.innerWidth;
  if (w < 768) return false; // Always static on mobile for battery saving
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

function StatCard({ icon, label, value, sublabel, color, to, current, goal }) {
  const hasProgress = typeof current === 'number' && typeof goal === 'number';
  const progress = hasProgress ? Math.min(1, Math.max(0, current / goal)) : 0;

  const content = (
    <motion.div
      className={styles.statCard}
      whileHover={{ y: -3, boxShadow: 'var(--elevation-3)' }}
      transition={{ duration: 0.2 }}
      style={{ '--card-accent': color }}
    >
      <div className={styles.statHeader}>
        <div className={styles.statIconWrap}>
          {hasProgress && (
            <svg className={styles.progressRing} width="48" height="48">
              <circle stroke="var(--color-border)" strokeWidth="4" fill="transparent" r="20" cx="24" cy="24" />
              <circle
                stroke={color}
                strokeWidth="4"
                fill="transparent"
                r="20"
                cx="24"
                cy="24"
                strokeDasharray={`${20 * 2 * Math.PI}`}
                strokeDashoffset={`${20 * 2 * Math.PI * (1 - progress)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
          )}
          <div className={styles.statIcon}>{icon}</div>
        </div>
      </div>
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
    { icon: <Camera size={22} color="var(--color-primary-light)" />, label: 'Log Task', to: '/tasks' },
    { icon: <Trophy size={22} color="var(--color-gold)" />, label: 'Leaderboard', to: '/leaderboard' },
    { icon: <Gift size={22} color="var(--color-secondary-light)" />, label: 'Rewards', to: '/rewards' },
    { icon: <Globe size={22} color="var(--color-info)" />, label: 'Community', to: '/community' },
  ];

  return (
    <div className={styles.quickActions}>
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className={styles.quickAction}>
          <motion.div
            whileHover={{ y: -4 }}
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

  // Contextual subline: always points at the next useful action.
  const streakMsg = useMemo(() => {
    const s = profile?.streak || 0;
    const doneToday = profile?.lastTaskDate &&
      new Date().toDateString() === profile.lastTaskDate.toDate().toDateString();
    if (doneToday) {
      return (
        <span className={styles.subline}>
          Streak secured for today — <Leaf size={14} color="var(--color-primary-light)" /> nice work.
        </span>
      );
    }
    if (s === 0) return <span className={styles.subline}>Complete one task today to start your streak.</span>;
    return (
      <span className={styles.subline}>
        <Flame size={14} color="var(--color-streak)" /> Do a task today to keep your {s}-day streak alive.
      </span>
    );
  }, [profile?.streak, profile?.lastTaskDate]);

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    const unsubNotifs = subscribeUserNotifications(profile.id, (notifs) => {
      setUnreadNotifs(notifs.filter(n => !n.read).length);
    });
    return () => unsubNotifs();
  }, [profile?.id]);

  return (
    <div className={styles.page}>
      {/* Welcome header */}
      <motion.div
        className={styles.welcome}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className={styles.greeting}>
            {greeting}, <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}><span className={styles.name}>{profile?.displayName?.split(' ')[0] || 'EcoHero'}</span> <Sparkles color="var(--color-gold)" size={22} /></span>
          </h1>
          {streakMsg}
        </div>
        <Link to="/notifications" className={styles.settingsBtn} aria-label="Notifications" style={{ position: 'relative' }}>
          <Bell color="var(--color-text)" size={22} />
          {unreadNotifs > 0 && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              background: '#EF4444', color: '#FFF', fontSize: '10px',
              fontWeight: 'bold', width: '18px', height: '18px',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </div>
          )}
        </Link>
      </motion.div>

      {/* ═══════════════ MAIN GRID: hero+actions left · stats+news right ═══════════════ */}
      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <motion.div
            className={styles.heroCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <HeroSection />
            <div className={styles.heroOverlay}>
              <p className={styles.heroLabel}>Your Eco Impact</p>
              <p className={styles.heroPoints} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
                <Zap color="var(--color-gold)" size={20} /> <strong>{(profile?.lifetimePoints || profile?.points || 0).toLocaleString()}</strong> points earned
              </p>
            </div>
          </motion.div>

          {/* Quick actions — compact 4-tile row */}
          <motion.div
            className={styles.actionsArea}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.45 }}
          >
            <h2 className={styles.sectionHeading}>Quick Actions</h2>
            <QuickActions />
          </motion.div>
        </div>

        <div className={styles.rightCol}>
          <motion.div
            className={styles.statsArea}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            <StatCard
              icon={<Flame color="var(--color-streak)" size={24} />}
              label="Day Streak"
              value={profile?.streak || 0}
              sublabel={
                profile?.lastTaskDate && new Date().toDateString() === profile.lastTaskDate.toDate().toDateString()
                  ? 'Task completed today!'
                  : profile?.longestStreak
                    ? `Longest: ${profile.longestStreak} days`
                    : 'Do a task to start!'
              }
              color="var(--color-streak)"
              to="/tasks"
            />
            <StatCard
              icon={<Zap color="var(--color-gold)" size={24} />}
              label="Available Points"
              value={(profile?.spendableBalance ?? profile?.points ?? 0).toLocaleString()}
              sublabel={`This week: ${profile?.weeklyPoints || 0}`}
              color="var(--color-gold)"
              to="/leaderboard"
            />
            <StatCard
              icon={<CheckSquare color="var(--color-primary-light)" size={24} />}
              label="Tasks Done"
              value={profile?.totalTasksCompleted || 0}
              sublabel="Weekly Goal: 5 Tasks"
              color="var(--color-primary)"
              to="/tasks"
              current={profile?.totalTasksCompleted || 0}
              goal={5}
            />
            <StatCard
              icon={<Leaf color="var(--color-secondary-light)" size={24} />}
              label="CO₂ Saved"
              value={`${((profile?.totalCO2Saved || 0) / 1000).toFixed(1)}kg`}
              sublabel="Weekly Goal: 10kg"
              color="var(--color-secondary)"
              current={(profile?.totalCO2Saved || 0) / 1000}
              goal={10}
            />
          </motion.div>

          {/* Live verification status — renders only when needed */}
          <VerificationCard profile={profile} />

          {/* News board */}
          <div className={styles.newsArea}>
            <NewsBoard />
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/layout/BottomTabBar.jsx
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './BottomTabBar.module.css';

const TABS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/tasks', icon: '✅', label: 'Tasks' },
  { path: '/leaderboard', icon: '🏆', label: 'Rank' },
  { path: '/rewards', icon: '🎁', label: 'Rewards' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export default function BottomTabBar() {
  return (
    <nav className={styles.tabBar}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <span className={styles.icon}>{tab.icon}</span>
              <span className={styles.label}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomTabActive"
                  className={styles.activePill}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

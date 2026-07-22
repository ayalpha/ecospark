// src/components/layout/BottomTabBar.jsx
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './BottomTabBar.module.css';

import { Home, CheckSquare, Trophy, Gift, User } from 'lucide-react';
import PremiumIcon from '../common/PremiumIcon';

const TABS = [
  { path: '/', icon: <PremiumIcon icon={Home} color="emerald" size={24} />, label: 'Home' },
  { path: '/tasks', icon: <PremiumIcon icon={CheckSquare} color="sapphire" size={24} />, label: 'Tasks' },
  { path: '/leaderboard', icon: <PremiumIcon icon={Trophy} color="gold" size={24} />, label: 'Rank' },
  { path: '/rewards', icon: <PremiumIcon icon={Gift} color="ruby" size={24} />, label: 'Rewards' },
  { path: '/profile', icon: <PremiumIcon icon={User} color="amethyst" size={24} />, label: 'Profile' },
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

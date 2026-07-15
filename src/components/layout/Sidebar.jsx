// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/tasks', icon: '✅', label: 'Tasks' },
  { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { path: '/rewards', icon: '🎁', label: 'Rewards' },
  { path: '/community', icon: '🌍', label: 'Community' },
  { path: '/about', icon: 'ℹ️', label: 'About' },
];

export default function Sidebar() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <img src="/logo-8k.jpeg" alt="EcoSpark Icon" className={styles.logoIconImg} />
        <span className={styles.logoText}>EcoSpark</span>
      </div>

      {/* Nav Links */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className={styles.activeIndicator}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {profile?.role === 'teacher' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>👨‍🏫</span>
            <span className={styles.navLabel}>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* User mini card */}
      <div className={styles.userCard}>
        <NavLink to="/profile" className={styles.userLink}>
          <div className={styles.userAvatar}>
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} />
            ) : (
              <span>{(profile?.displayName || user?.email || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{profile?.displayName || 'EcoUser'}</p>
            <p className={styles.userPoints}>⚡ {profile?.points || 0} pts</p>
          </div>
        </NavLink>
        <button onClick={handleLogout} className={styles.logoutBtn} title="Sign out">
          ↩
        </button>
      </div>
    </aside>
  );
}

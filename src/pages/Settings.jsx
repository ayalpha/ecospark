// src/pages/Settings.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Accessibility, Bell, Lock, Settings2, KeyRound, Mail, Download,
  Trash2, SunMoon, Contrast, Smartphone, Flame, Globe2, Trophy, Sparkles,
  Type, Film,
} from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { updateUserProfile } from '../services/firestoreService';
import { auth, db } from '../lib/firebase';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail, deleteUser } from 'firebase/auth';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './Settings.module.css';

function ToggleRow({ icon, label, desc, checked, onChange, disabled }) {
  return (
    <div className={styles.row} style={{ opacity: disabled ? 0.6 : 1 }}>
      <div>
        <div className={styles.rowLabel}><div className={styles.iconWrapper}>{icon}</div> {label}</div>
        {desc && <div className={styles.rowDesc}>{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <motion.div
          className={styles.toggleThumb}
          animate={{ x: checked ? 30 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function SelectRow({ icon, label, value, options, onChange }) {
  return (
    <div className={styles.row} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      <div className={styles.rowLabel} style={{ marginBottom: '16px' }}>
        <div className={styles.iconWrapper}>{icon}</div> {label}
      </div>
      <div className={styles.pills}>
        {options.map((o) => (
          <button
            key={o.value}
            className={`${styles.pill} ${value === o.value ? styles.pillActive : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
  { id: 'accessibility', label: 'Accessibility', icon: <Accessibility size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { id: 'privacy', label: 'Privacy', icon: <Lock size={18} /> },
  { id: 'account', label: 'Account Actions', icon: <Settings2 size={18} /> },
];

export default function Settings() {
  const { activeTheme, reducedMotion, textSize, highContrast, themeContrast, setTheme, setReducedMotion, setTextSize, setHighContrast, setThemeContrast } = useUiStore();
  const { user, profile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');

  const notificationsEnabled = profile?.notificationsEnabled ?? true;
  const streakAlerts = profile?.streakAlerts ?? true;
  const publicProfile = profile?.publicProfile ?? true;
  const showOnLeaderboard = profile?.showOnLeaderboard ?? true;

  const updateProfileSetting = async (field, value) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { [field]: value });
      toast.success('Setting saved');
    } catch (err) {
      toast.error('Could not save setting');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (actionName) => {
    if (actionName === 'Change Password') {
      try {
        await sendPasswordResetEmail(auth, user.email, {
          url: `${window.location.origin}/auth`,
        });
        toast.success(`Password reset email sent to ${user.email}`);
      } catch (err) {
        toast.error('Failed to send reset email: ' + err.message);
      }
      return;
    }

    if (actionName === 'Change Email') {
      const newEmail = prompt('Enter your new email address:');
      if (!newEmail || newEmail.trim() === '') return;
      try {
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim(), {
          url: `${window.location.origin}/auth?verified=1`,
          handleCodeInApp: false,
        });
        toast.success(`Verification link sent to ${newEmail}`);
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          toast.error('Please log out and log back in to change your email.');
        } else {
          toast.error('Failed to update email: ' + err.message);
        }
      }
      return;
    }

    if (actionName === 'Export Data') {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const jsonString = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ecospark_data_${user.uid}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Data exported successfully!');
        } else {
          toast.error('No data found to export.');
        }
      } catch (err) {
        toast.error('Failed to export data: ' + err.message);
      }
      return;
    }

    if (actionName === 'Delete Account') {
      const confirmDelete = window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and all your points and data will be lost forever.");
      if (!confirmDelete) return;

      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(auth.currentUser);
        toast.success('Account deleted permanently.');
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          toast.error('For security reasons, please log out and log back in before deleting your account.');
        } else {
          toast.error('Failed to delete account: ' + err.message);
        }
      }
      return;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <motion.section
            key="appearance"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}><div className={styles.iconWrapper}><Palette size={18} /></div> Appearance</h2>
            <SelectRow
              icon={<SunMoon size={18} />} label="Theme" value={activeTheme}
              options={[
                { value: 'regalia-noir', label: 'Regalia Noir' },
                { value: 'regalia', label: 'Regalia' },
                { value: 'metallic', label: 'Metallic Black' },
                { value: 'midnight', label: 'Midnight Dark' },
              ]}
              onChange={setTheme}
            />
            {activeTheme === 'regalia' && (
              <SelectRow
                icon={<Sparkles size={18} />} label="Golden Contrast" value={themeContrast || 'default'}
                options={[
                  { value: 'default', label: 'Default' },
                  { value: 'gold', label: 'Bolder Gold' },
                ]}
                onChange={setThemeContrast}
              />
            )}
            <SelectRow
              icon={<Type size={18} />} label="Text Size" value={textSize}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Large' },
                { value: 'xlarge', label: 'X-Large' },
              ]}
              onChange={setTextSize}
            />
          </motion.section>
        );
      case 'accessibility':
        return (
          <motion.section
            key="accessibility"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}><div className={styles.iconWrapper}><Accessibility size={18} /></div> Accessibility</h2>
            <ToggleRow
              icon={<Film size={18} />} label="Reduce Motion" desc="Turns off animations and transitions"
              checked={reducedMotion} onChange={setReducedMotion}
            />
            <ToggleRow
              icon={<Contrast size={18} />} label="High Contrast" desc="Increases contrast for better visibility"
              checked={highContrast} onChange={setHighContrast}
            />
          </motion.section>
        );
      case 'notifications':
        return (
          <motion.section
            key="notifications"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}><div className={styles.iconWrapper}><Bell size={18} /></div> Notifications</h2>
            <ToggleRow
              icon={<Smartphone size={18} />} label="Daily Reminders" desc="Get a reminder to complete your eco-tasks"
              checked={notificationsEnabled} onChange={(val) => updateProfileSetting('notificationsEnabled', val)} disabled={saving}
            />
            <ToggleRow
              icon={<Flame size={18} />} label="Streak Alerts" desc="Get warned before your streak expires"
              checked={streakAlerts} onChange={(val) => updateProfileSetting('streakAlerts', val)} disabled={saving}
            />
          </motion.section>
        );
      case 'privacy':
        return (
          <motion.section
            key="privacy"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}><div className={styles.iconWrapper}><Lock size={18} /></div> Privacy</h2>
            <ToggleRow
              icon={<Globe2 size={18} />} label="Show Real Name" desc="When off, other users see your display handle instead of your full name"
              checked={publicProfile} onChange={(val) => updateProfileSetting('publicProfile', val)} disabled={saving}
            />
            <ToggleRow
              icon={<Trophy size={18} />} label="Show on Leaderboard" desc="Appear on global and group leaderboards"
              checked={showOnLeaderboard} onChange={(val) => updateProfileSetting('showOnLeaderboard', val)} disabled={saving}
            />
          </motion.section>
        );
      case 'account':
        return (
          <motion.section
            key="account"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}><div className={styles.iconWrapper}><Settings2 size={18} /></div> Account Actions</h2>
            <div className={styles.row}>
              <button className={styles.actionBtn} onClick={() => handleAction('Change Password')}>
                <div className={styles.iconWrapper}><KeyRound size={18} /></div> Change Password
              </button>
            </div>
            <div className={styles.row}>
              <button className={styles.actionBtn} onClick={() => handleAction('Change Email')}>
                <div className={styles.iconWrapper}><Mail size={18} /></div> Change Email
              </button>
            </div>
            <div className={styles.row}>
              <button className={styles.actionBtn} onClick={() => handleAction('Export Data')}>
                <div className={styles.iconWrapper}><Download size={18} /></div> Export My Data
              </button>
            </div>
            <div className={`${styles.row} ${styles.dangerRow}`}>
              <button className={`${styles.actionBtn} ${styles.dangerText}`} onClick={() => handleAction('Delete Account')}>
                <div className={styles.iconWrapper} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}><Trash2 size={18} /></div> Delete Account
              </button>
            </div>
          </motion.section>
        );
      default: return null;
    }
  };

  return (
    <div className={styles.page}>

      {/* Epic Header Area */}
      <div className={styles.headerArea}>
        <div className={styles.headerContent}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className={styles.title}
          >
            Settings
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
            className={styles.subtitle}
          >
            Customize your EcoSpark experience
          </motion.p>
        </div>
      </div>

      <div className={styles.dashboardLayout}>
        {/* Navigation Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className={styles.sidebarNav}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Dynamic Content Area */}
        <div className={styles.contentArea}>
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
            className={styles.note}
          >
            Appearance and accessibility settings are saved locally. Account settings are synced across your devices.
          </motion.p>
        </div>
      </div>

    </div>
  );
}

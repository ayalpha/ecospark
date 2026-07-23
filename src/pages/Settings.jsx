// src/pages/Settings.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
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
        <p className={styles.rowLabel}><span>{icon}</span> {label}</p>
        {desc && <p className={styles.rowDesc}>{desc}</p>}
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
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function SelectRow({ icon, label, value, options, onChange }) {
  return (
    <div className={styles.row}>
      <div>
        <p className={styles.rowLabel}><span>{icon}</span> {label}</p>
      </div>
      <div className={styles.pills} style={{ flexWrap: 'wrap' }}>
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

export default function Settings() {
  const { activeTheme, reducedMotion, textSize, highContrast, setTheme, setReducedMotion, setTextSize, setHighContrast } = useUiStore();
  const { user, profile } = useAuthStore();
  const [saving, setSaving] = useState(false);

  // Fallback default values if profile doesn't have them yet
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
        await sendPasswordResetEmail(auth, user.email);
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
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
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

    toast('This feature is coming soon!', { icon: '🚧' });
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🎨 Appearance</h2>
        <SelectRow
          icon="🌈"
          label="Theme"
          value={activeTheme}
          options={[
            { value: 'metallic', label: '🌑 Metallic Black' },
            { value: 'forest', label: '🌿 Forest Green' },
            { value: 'ocean', label: '🌊 Ocean Blue' },
            { value: 'sunset', label: '🌅 Sunset' },
            { value: 'midnight', label: '🌌 Midnight Dark' },
          ]}
          onChange={setTheme}
        />
        <SelectRow
          icon="🔤"
          label="Text Size"
          value={textSize}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Large' },
            { value: 'xlarge', label: 'X-Large' },
          ]}
          onChange={setTextSize}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>♿ Accessibility</h2>
        <ToggleRow
          icon="🎞️"
          label="Reduce Motion"
          desc="Turns off animations and transitions"
          checked={reducedMotion}
          onChange={setReducedMotion}
        />
        <ToggleRow
          icon="🔲"
          label="High Contrast"
          desc="Increases contrast for better visibility"
          checked={highContrast}
          onChange={setHighContrast}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔔 Notifications</h2>
        <ToggleRow
          icon="📱"
          label="Daily Reminders"
          desc="Get a reminder to complete your eco-tasks"
          checked={notificationsEnabled}
          onChange={(val) => updateProfileSetting('notificationsEnabled', val)}
          disabled={saving}
        />
        <ToggleRow
          icon="🔥"
          label="Streak Alerts"
          desc="Get warned before your streak expires"
          checked={streakAlerts}
          onChange={(val) => updateProfileSetting('streakAlerts', val)}
          disabled={saving}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔒 Privacy</h2>
        <ToggleRow
          icon="🌍"
          label="Show Real Name"
          desc="When off, other users see your display handle instead of your full name"
          checked={publicProfile}
          onChange={(val) => updateProfileSetting('publicProfile', val)}
          disabled={saving}
        />
        <ToggleRow
          icon="🏆"
          label="Show on Leaderboard"
          desc="Appear on global and group leaderboards"
          checked={showOnLeaderboard}
          onChange={(val) => updateProfileSetting('showOnLeaderboard', val)}
          disabled={saving}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>⚙️ Account Actions</h2>
        <div className={styles.actionsGrid} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <button 
            className={styles.actionBtn} 
            onClick={() => handleAction('Change Password')}
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'left', fontWeight: '500', cursor: 'pointer' }}
          >
            🔑 Change Password
          </button>
          <button 
            className={styles.actionBtn} 
            onClick={() => handleAction('Change Email')}
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'left', fontWeight: '500', cursor: 'pointer' }}
          >
            ✉️ Change Email
          </button>
          <button 
            className={styles.actionBtn} 
            onClick={() => handleAction('Export Data')}
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'left', fontWeight: '500', cursor: 'pointer' }}
          >
            📥 Export My Data
          </button>
          <button 
            className={styles.actionBtn} 
            onClick={() => handleAction('Delete Account')}
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'left', fontWeight: '500', cursor: 'pointer' }}
          >
            🗑️ Delete Account
          </button>
        </div>
      </section>

      <p className={styles.note}>
        Appearance and accessibility settings are saved locally. Account settings are synced across your devices.
      </p>
    </div>
  );
}

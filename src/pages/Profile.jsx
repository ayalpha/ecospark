// src/pages/Profile.jsx
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getWeeklyImpact, updateUserProfile } from '../services/firestoreService';
import { compressImageToBase64 } from '../lib/imageUtils';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/common/Avatar';
import styles from './Profile.module.css';

function WeeklyImpactCard({ profile }) {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    getWeeklyImpact(profile.id).then(setImpact).catch(console.error);
  }, [profile?.id]);

  return (
    <div className={styles.impactCard}>
      <div className={styles.impactHeader}>
        <h3 className={styles.impactTitle}>📊 Weekly Impact Report</h3>
        <span className={styles.impactWeek}>This week</span>
      </div>
      <div className={styles.impactStats}>
        <div className={styles.impactStat}>
          <span className={styles.impactVal}>{impact?.count ?? '–'}</span>
          <span className={styles.impactLabel}>Tasks</span>
        </div>
        <div className={styles.impactDivider} />
        <div className={styles.impactStat}>
          <span className={styles.impactVal}>{profile?.weeklyPoints ?? 0}</span>
          <span className={styles.impactLabel}>Points</span>
        </div>
        <div className={styles.impactDivider} />
        <div className={styles.impactStat}>
          <span className={styles.impactVal}>{impact?.co2 ? `${impact.co2}g` : '–'}</span>
          <span className={styles.impactLabel}>CO₂ saved</span>
        </div>
      </div>
      <p className={styles.impactShare}>📸 Screenshot to share your weekly impact!</p>
    </div>
  );
}

function ReferralCard({ profile }) {
  const link = `${window.location.origin}/auth?ref=${profile?.referralCode}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Join EcoSpark!', text: 'Join me on EcoSpark and earn bonus points!', url: link });
    } catch {
      copy();
    }
  };

  return (
    <div className={styles.referralCard}>
      <h3 className={styles.referralTitle}>🤝 Invite a Classmate</h3>
      <p className={styles.referralDesc}>
        Earn <strong>50 bonus points</strong> when a friend joins and completes their first task.
      </p>
      <div className={styles.referralCode}>{profile?.referralCode}</div>
      <p className={styles.referralCount}>{profile?.referralCount || 0} friends invited</p>
      <motion.button
        className={styles.shareBtn}
        onClick={share}
        whileTap={{ scale: 0.96 }}
      >
        {copied ? '✅ Copied!' : '📤 Share Invite Link'}
      </motion.button>
    </div>
  );
}

export default function Profile() {
  const { user, profile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const base64Photo = await compressImageToBase64(file);
      await updateUserProfile(user.uid, { photoURL: base64Photo });
      toast.success('Profile photo updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { 
        displayName: name.trim(),
        bio: bio.trim()
      });
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!editing && profile) {
      setName(profile.displayName || '');
      setBio(profile.bio || '');
    }
  }, [profile, editing]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile</h1>

      {/* Avatar + name */}
      <div className={styles.profileCard}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar} onClick={() => !uploadingPhoto && fileInputRef.current?.click()}>
            {uploadingPhoto ? (
              <span className={styles.spinner}>⏳</span>
            ) : (
              <Avatar
                src={profile?.photoURL}
                activeFrame={profile?.activeFrame}
                size={96}
                alt={profile?.displayName}
              />
            )}
            <div className={styles.avatarOverlay}>
              <span>📷</span>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
        </div>
        {editing ? (
          <div className={styles.editName}>
            <input
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display Name"
              autoFocus
            />
            <textarea
              className={styles.nameInput}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio..."
              rows={2}
              maxLength={100}
              style={{ marginTop: '8px', resize: 'none', height: '60px' }}
            />
            <div className={styles.editActions}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? '...' : 'Save'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className={styles.profileName}>{profile?.displayName || 'EcoUser'}</h2>
            <p className={styles.profileBio} style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', marginTop: '4px', maxWidth: '300px' }}>
              {profile?.bio || (profile?.role === 'admin' ? '✨ Platform Admin' : 'Sustainability Advocate')}
            </p>
            <p className={styles.profileEmail}>{user?.email}</p>
            <button className={styles.editBtn} onClick={() => setEditing(true)}>✏️ Edit Profile</button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { icon: '⚡', val: (profile?.spendableBalance ?? profile?.points ?? 0).toLocaleString(), label: 'Points' },
          { icon: '🔥', val: profile?.streak || 0, label: 'Current Streak' },
          { icon: '🏆', val: profile?.longestStreak || 0, label: 'Longest Streak' },
          { icon: '✅', val: profile?.totalTasksCompleted || 0, label: 'Tasks Completed' },
          { icon: '🌿', val: `${((profile?.totalCO2Saved || 0) / 1000).toFixed(1)}kg`, label: 'CO₂ Saved' },
          { icon: '💧', val: `${profile?.totalWaterSaved || 0}L`, label: 'Water Saved' },
        ].map((s) => (
          <div key={s.label} className={styles.statItem}>
            <span className={styles.statIcon}>{s.icon}</span>
            <span className={styles.statVal}>{s.val}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Badges */}
      {profile?.badges?.length > 0 && (
        <div className={styles.badgesSection}>
          <h3 className={styles.sectionTitle}>🏅 Badges Earned</h3>
          <div className={styles.badges}>
            {profile.badges.map((b) => (
              <div key={b} className={styles.badge}>
                <span className={styles.badgeIcon}>🏅</span>
                <span className={styles.badgeLabel}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly impact */}
      <WeeklyImpactCard profile={profile} />

      {/* Referral */}
      <ReferralCard profile={profile} />

      {/* Settings link */}
      <Link to="/settings" className={styles.settingsLink}>
        ⚙️ Accessibility & Theme Settings →
      </Link>
    </div>
  );
}

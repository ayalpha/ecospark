// src/pages/Profile.jsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getWeeklyImpact, updateUserProfile } from '../services/firestoreService';
import { compressImageToBase64 } from '../lib/imageUtils';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/common/Avatar';
import { Settings, Edit2, Camera, BarChart3, Handshake, Medal, Camera as CameraIcon, Zap, Flame, Trophy, CheckSquare, Leaf, Droplets } from 'lucide-react';
import { REWARDS_DB } from '../constants/rewards';
import styles from './Profile.module.css';

function WeeklyImpactCard({ profile }) {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    getWeeklyImpact(profile.id).then(setImpact).catch(console.error);
  }, [profile?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className={styles.dashboardCard}
      style={{ marginTop: '0', padding: '32px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '24px', alignItems: 'center' }}>
        <h3 className={styles.badgesTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <BarChart3 size={20} color="var(--color-primary-light)" /> Weekly Impact
        </h3>
        <span className={styles.weekPill}>This week</span>
      </div>
      <div className={styles.hologramStats} style={{ marginTop: '0' }}>
        <div className={styles.holoBox}>
          <span className={styles.holoVal}>{profile?.weeklyPoints ?? 0}</span>
          <span className={styles.holoLabel}>Points</span>
        </div>
        <div className={styles.holoBox}>
          <span className={styles.holoVal}>{impact?.co2 ? `${impact.co2}g` : '–'}</span>
          <span className={styles.holoLabel}>CO₂ saved</span>
        </div>
      </div>
      <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <CameraIcon size={14} /> Screenshot to share your weekly impact!
      </p>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className={styles.dashboardCard}
      style={{ marginTop: '0', padding: '32px' }}
    >
      <h3 className={styles.badgesTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Handshake size={20} color="var(--color-gold)" /> Invite a Classmate
      </h3>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: 'var(--text-base)' }}>
        Earn <strong style={{ color: 'var(--color-primary-light)' }}>50 bonus points</strong> when a friend joins and completes their first task.
      </p>

      <div className={styles.referralCodeBox}>
        <span>{profile?.referralCode}</span>
      </div>

      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: '24px', fontWeight: 'bold' }}>
        {profile?.referralCount || 0} friends invited
      </p>

      <motion.button
        className={styles.saveBtn}
        onClick={share}
        whileTap={{ scale: 0.95 }}
        style={{ width: '100%', padding: '16px', fontSize: 'var(--text-md)' }}
      >
        {copied ? '✓ Copied!' : 'Share Invite Link'}
      </motion.button>
    </motion.div>
  );
}

export default function Profile() {
  const { user, profile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!editing && profile) {
      setName(profile.displayName || '');
      setBio(profile.bio || '');
    }
  }, [profile, editing]);

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

  if (!profile) return null;

  const equippedGlow = profile?.equipped?.glow;
  const equippedCompanion = profile?.equipped?.companion;
  const equippedBg = profile?.equipped?.background;

  const glowReward = REWARDS_DB.find(r => r.id === equippedGlow);
  const companionReward = REWARDS_DB.find(r => r.id === equippedCompanion);
  const bgReward = REWARDS_DB.find(r => r.id === equippedBg);

  return (
    <div className={`${styles.page} ${bgReward ? bgReward.cssClass : ''}`}>
      
      {/* Epic Hero Background */}
      <div className={styles.heroBanner} style={bgReward ? { background: 'transparent' } : undefined} />
      
      {/* Top Bar */}
      <div className={styles.topControls}>
        <Link to="/settings" className={styles.settingsLink}>
          <Settings size={18} /> Settings
        </Link>
      </div>

      {/* Main Dashboard Card */}
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
        className={styles.dashboardCard}
      >
        {/* Floating Avatar Showcase */}
        <div className={styles.avatarShowcase}>
          <div className={styles.avatarOrbit} />
          <div className={styles.avatarContainer} onClick={() => !uploadingPhoto && fileInputRef.current?.click()} style={{ position: 'relative' }}>
            {uploadingPhoto ? (
              <span className={styles.spinner} style={{ fontSize: '32px', margin: '32px' }}>⏳</span>
            ) : (
              <Avatar
                src={profile?.photoURL}
                activeFrame={profile?.activeFrame}
                size={100}
                alt={profile?.displayName}
              />
            )}
            {companionReward && (
              <div className="companion-wrapper" style={{ 
                position: 'absolute', 
                bottom: -15, 
                left: (companionReward.id === 'comp-terrabot' || companionReward.id === 'comp-waterwisp') ? -45 : undefined,
                right: (companionReward.id === 'comp-terrabot' || companionReward.id === 'comp-waterwisp') ? undefined : -45, 
                pointerEvents: 'none' 
              }}>
                {companionReward.imageUrl ? (
                  <img src={companionReward.imageUrl} alt="companion" style={{ width: '90px', height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }} />
                ) : (
                  <span style={{ fontSize: '2.5rem' }}>{companionReward.icon}</span>
                )}
              </div>
            )}
            <div className={styles.avatarOverlay}>
              <Camera size={32} color="white" />
            </div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>

        {/* Identity & Editing */}
        {editing ? (
          <div className={styles.editContainer}>
            <input
              className={styles.glassInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display Name"
              autoFocus
            />
            <textarea
              className={styles.glassInput}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio..."
              rows={2}
              maxLength={100}
              style={{ resize: 'none' }}
            />
            <div className={styles.editControls}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className={styles.identity}>
            <h1 className={`${styles.profileName} ${glowReward ? glowReward.cssClass : ''}`}>{profile?.displayName || 'EcoUser'}</h1>
            <p className={styles.profileBio}>
              {profile?.bio || (profile?.role === 'admin' ? '✨ Platform Admin' : 'Sustainability Advocate')}
            </p>
            <p className={styles.profileEmail}>{user?.email}</p>
            <button className={styles.editBtn} onClick={() => setEditing(true)}>
              <Edit2 size={14} style={{ display: 'inline', marginRight: '6px' }} /> Edit Profile
            </button>
          </div>
        )}

        {/* Holographic Top Stats */}
        {!editing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={styles.hologramStats}
          >
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>
                {profile?.streak || 0}
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  style={{ display: 'inline-flex', marginLeft: '8px', verticalAlign: 'middle' }}
                >
                  <Flame size={22} color="var(--color-streak)" />
                </motion.span>
              </span>
              <span className={styles.holoLabel}>Day Streak</span>
            </div>
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>{(profile?.lifetimePoints || profile?.points || 0).toLocaleString()}</span>
              <span className={styles.holoLabel}>Lifetime Pts</span>
            </div>
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>{profile?.totalTasksCompleted || 0}</span>
              <span className={styles.holoLabel}>Tasks Done</span>
            </div>
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>{profile?.badges?.length || 0}</span>
              <span className={styles.holoLabel}>Badges</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Advanced Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={styles.advancedGrid}
      >
        {[
          { Icon: Zap, val: (profile?.spendableBalance ?? profile?.points ?? 0).toLocaleString(), label: 'Points', color: 'var(--color-gold)' },
          { Icon: Flame, val: profile?.streak || 0, label: 'Current Streak', color: 'var(--color-streak)' },
          { Icon: Trophy, val: profile?.longestStreak || 0, label: 'Longest Streak', color: 'var(--color-gold)' },
          { Icon: CheckSquare, val: profile?.totalTasksCompleted || 0, label: 'Completed', color: 'var(--color-primary-light)' },
          { Icon: Leaf, val: `${((profile?.totalCO2Saved || 0) / 1000).toFixed(1)}kg`, label: 'CO₂ Saved', color: 'var(--color-secondary-light)' },
          { Icon: Droplets, val: `${profile?.totalWaterSaved || 0}L`, label: 'Water Saved', color: 'var(--color-info)' },
        ].map(({ Icon, val, label, color }) => (
          <motion.div
            key={label}
            className={styles.gridCard}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <span className={styles.gridIcon}><Icon size={26} color={color} /></span>
            <span className={styles.gridVal}>{val}</span>
            <span className={styles.gridLabel}>{label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Badges Showcase */}
      {profile?.badges?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className={styles.badgesShowcase}
        >
          <h3 className={styles.badgesTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Medal size={20} color="var(--color-gold)" /> Badges Earned
          </h3>
          <div className={styles.badgesGrid}>
            {profile.badges.map((b) => (
              <div key={b} className={styles.premiumBadge}>
                <span className={styles.badgeIcon}><Medal size={22} color="var(--color-gold)" /></span>
                <span className={styles.badgeLabel}>{b}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly impact */}
      <WeeklyImpactCard profile={profile} />

      {/* Referral */}
      <ReferralCard profile={profile} />

    </div>
  );
}

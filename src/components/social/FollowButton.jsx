// src/components/social/FollowButton.jsx
// Optimistic follow/unfollow with rollback on failure. The server
// transaction (api/follow.js) is the source of truth; the UI never waits
// for it — it flips instantly and rolls back if the request fails.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { followUser, unfollowUser } from '../../services/followService';
import styles from './social.module.css';

export default function FollowButton({
  targetUid, initialFollowing = false, initialFollowsMe = false,
  size = 'md', onCountChange, onStateChange, className = '',
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Optimistic flip with rollback: the UI never waits on the network.
  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || !targetUid) return;
    const next = !following;
    setFollowing(next); // optimistic
    setBusy(true);
    try {
      const res = next ? await followUser(targetUid) : await unfollowUser(targetUid);
      // Reconcile with the server's authoritative counters.
      onCountChange?.({
        followersCount: res.followersCount,
        followingCount: res.followingCount,
      });
      onStateChange?.({ isFollowing: next, followsMe: initialFollowsMe });
    } catch (err) {
      setFollowing(!next); // rollback
      toast.error(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (following) {
    return (
      <motion.button
        className={`${styles.followBtn} ${styles.following} ${styles[size]} ${className}`}
        onClick={toggle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        whileTap={{ scale: 0.96 }}
        disabled={busy}
        aria-pressed="true"
        type="button"
      >
        {busy ? <Loader2 size={15} className={styles.spin} />
          : hovering ? <UserPlus size={15} /> : <UserCheck size={15} />}
        {busy ? '…' : hovering ? 'Unfollow' : 'Following'}
      </motion.button>
    );
  }

  return (
    <motion.button
      className={`${styles.followBtn} ${styles.follow} ${styles[size]} ${className}`}
      onClick={toggle}
      whileTap={{ scale: 0.96 }}
      disabled={busy}
      aria-pressed="false"
      type="button"
    >
      {busy ? <Loader2 size={15} className={styles.spin} /> : <UserPlus size={15} />}
      Follow{initialFollowsMe ? ' back' : ''}
    </motion.button>
  );
}

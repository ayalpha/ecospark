// src/pages/Community.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { subscribeCommunityPosts, createCommunityPost, toggleLike } from '../services/firestoreService';
import toast from 'react-hot-toast';
import styles from './Community.module.css';

function PostCard({ post, myId }) {
  const hasLiked = post.likes?.includes(myId);
  const timeAgo = post.createdAt?.toDate ? (() => {
    const diff = Date.now() - post.createdAt.toDate().getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })() : '';

  return (
    <motion.article
      className={styles.post}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className={styles.postHeader}>
        <div className={styles.postAvatar}>
          {post.photoURL
            ? <img src={post.photoURL} alt={post.displayName} />
            : (post.displayName || '?')[0].toUpperCase()
          }
        </div>
        <div>
          <p className={styles.postName}>{post.displayName || 'EcoUser'}</p>
          <p className={styles.postTime}>{timeAgo}</p>
        </div>
      </div>

      <p className={styles.postContent}>{post.content}</p>

      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className={styles.postImage} loading="lazy" />
      )}

      <div className={styles.postActions}>
        <button
          className={`${styles.likeBtn} ${hasLiked ? styles.liked : ''}`}
          onClick={() => myId && toggleLike(post.id, myId)}
        >
          {hasLiked ? '❤️' : '🤍'} {post.likes?.length || 0}
        </button>
        <span className={styles.commentCount}>💬 {post.commentCount || 0}</span>
      </div>
    </motion.article>
  );
}

export default function Community() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeCommunityPosts((data) => {
      setPosts(data);
      setLoading(false);
    }, (err) => {
      console.error('[Community] Failed to load:', err);
      setError(err?.message || 'Unknown error loading posts');
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePost = async () => {
    const text = newPost.trim();
    if (!text || !user || posting) return;
    setPosting(true);
    try {
      await createCommunityPost(user.uid, profile?.displayName || 'EcoUser', profile?.photoURL, text);
      setNewPost('');
      toast.success('Posted! 🌍');
    } catch {
      toast.error('Could not post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Community</h1>
        <p className={styles.subtitle}>Share your eco-wins with classmates 🌍</p>
      </div>

      {/* Post composer */}
      <div className={styles.composer}>
        <div className={styles.composerAvatar}>
          {profile?.photoURL
            ? <img src={profile.photoURL} alt={profile.displayName} />
            : (profile?.displayName || '?')[0].toUpperCase()
          }
        </div>
        <div className={styles.composerInput}>
          <textarea
            className={styles.textarea}
            placeholder="Share an eco-action you completed..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={2}
          />
          <motion.button
            className={styles.postBtn}
            onClick={handlePost}
            disabled={!newPost.trim() || posting}
            whileTap={{ scale: 0.96 }}
          >
            {posting ? '...' : 'Share 🌿'}
          </motion.button>
        </div>
      </div>

      {/* Feed */}
      <div className={styles.feed}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.postSkeleton}`} />
            ))
          : error
          ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <span style={{ fontSize: '3rem' }}>⚠️</span>
              <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Failed to load community posts</p>
              <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, wordBreak: 'break-all' }}>
                {error}
              </code>
            </div>
          )
          : posts.length === 0
          ? (
            <div className={styles.empty}>
              <span>🌱</span>
              <p>Be the first to share an eco-win!</p>
            </div>
          )
          : posts.map((p) => (
              <PostCard key={p.id} post={p} myId={user?.uid} />
            ))
        }
      </div>
    </div>
  );
}

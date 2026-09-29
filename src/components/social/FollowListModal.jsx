// src/components/social/FollowListModal.jsx
// Paginated followers / following list with search and inline follow
// buttons. Cursor-based pagination keeps reads bounded on the free tier.

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Users } from 'lucide-react';
import { listFollows } from '../../services/followService';
import UserCard from './UserCard';
import styles from './social.module.css';

export default function FollowListModal({
  open, onClose, uid, dir = 'followers', myId, myFollowingSet,
  title, onCountChange,
}) {
  const [users, setUsers] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !uid) return;
    setUsers([]); setCursor(null); setExhausted(false);
    setLoading(true); setError(null); setSearch('');
    let alive = true;
    listFollows(uid, dir, 20, null)
      .then((res) => {
        if (!alive) return;
        setUsers(res.users);
        setCursor(res.nextCursor);
        setExhausted(!res.nextCursor);
        setLoading(false);
      })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [open, uid, dir]);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await listFollows(uid, dir, 20, cursor);
      setUsers((u) => [...u, ...res.users]);
      setCursor(res.nextCursor);
      setExhausted(!res.nextCursor);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.displayName || '').toLowerCase().includes(q));
  }, [users, search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.modalBackdrop}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 14 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>{title || (dir === 'followers' ? 'Followers' : 'Following')}</h3>
              <button className={styles.modalClose} onClick={onClose} aria-label="Close" type="button"><X size={17} /></button>
            </div>

            <div className={styles.modalSearch}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${dir}…`}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            <div className={styles.modalBody}>
              {loading && users.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className={`skeleton ${styles.modalSkeleton}`} />)
              ) : error ? (
                <div className={styles.modalEmpty}><Users size={22} /><p>{error}</p></div>
              ) : visible.length === 0 ? (
                <div className={styles.modalEmpty}>
                  <Users size={22} />
                  <p>{search ? 'No matches.' : dir === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
                </div>
              ) : (
                visible.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    myId={myId}
                    isFollowing={myFollowingSet?.has(u.id)}
                    size="sm"
                    onCountChange={onCountChange}
                  />
                ))
              )}

              {!exhausted && visible.length > 0 && (
                <button className={styles.moreBtn} onClick={loadMore} disabled={loading} type="button">
                  {loading ? <Loader2 size={14} className={styles.spin} /> : 'Load more'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

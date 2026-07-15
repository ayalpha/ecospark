// src/pages/Admin.jsx — Teacher/admin view (role-gated)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getFlaggedSubmissions, updateSubmissionStatus, awardPointsAndUpdateStreak } from '../services/firestoreService';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './Admin.module.css';

export default function Admin() {
  const { profile } = useAuthStore();
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0, flagged: 0 });

  // Role gate
  if (profile && profile.role !== 'teacher' && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    getFlaggedSubmissions(profile?.groupId)
      .then((data) => { setFlagged(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile?.groupId]);

  const handleDecision = async (sub, status) => {
    try {
      await updateSubmissionStatus(sub.id, status, {
        reviewedBy: profile?.id,
        reason: status === 'approved' ? 'Manually approved by teacher' : 'Manually rejected by teacher',
        pointsAwarded: status === 'approved' ? true : false,
      });

      if (status === 'approved' && !sub.pointsAwarded) {
        await awardPointsAndUpdateStreak(sub.userId, sub.taskId, sub.points || 50, {
          co2: sub.co2 || 0,
          water: sub.water || 0,
          waste: sub.waste || 0,
        });
      }

      setFlagged((prev) => prev.filter((s) => s.id !== sub.id));
      toast.success(`Submission ${status}!`);
    } catch {
      toast.error('Could not update submission');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>👨‍🏫 Admin Dashboard</h1>
        <p className={styles.subtitle}>Review pending and flagged submissions</p>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.cardSkel}`} />
          ))}
        </div>
      ) : flagged.length === 0 ? (
        <div className={styles.empty}>
          <span>🎉</span>
          <p>No submissions waiting for review! All clear.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {flagged.map((sub) => (
            <motion.div
              key={sub.id}
              className={styles.card}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {sub.imageUrl && (
                <a href={sub.imageUrl} target="_blank" rel="noopener noreferrer">
                  <img src={sub.imageUrl} alt="Submission" className={styles.photo} />
                </a>
              )}
              <div className={styles.cardBody}>
                <p className={styles.cardId}>Submission #{sub.id.slice(0, 8)}</p>
                <p className={styles.cardReason}>
                  <strong>AI reasoning:</strong> {sub.reason || 'No reasoning provided'}
                </p>
                {sub.confidence != null && (
                  <p className={styles.cardConf}>
                    Confidence: {Math.round(sub.confidence * 100)}%
                  </p>
                )}
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleDecision(sub, 'approved')}
                >
                  ✅ Approve
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => handleDecision(sub, 'rejected')}
                >
                  ❌ Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

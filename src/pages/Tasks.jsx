// src/pages/Tasks.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getTasks, getUserSubmissions } from '../services/firestoreService';
import TaskLogModal from '../components/tasks/TaskLogModal';
import toast from 'react-hot-toast';
import styles from './Tasks.module.css';

const CATEGORY_ICONS = {
  energy: '⚡',
  water: '💧',
  waste: '♻️',
  food: '🥗',
  transport: '🚲',
  nature: '🌿',
  community: '🤝',
};

const STATUS_CONFIG = {
  approved: { icon: '✅', label: 'Approved', color: 'var(--color-success)' },
  rejected: { icon: '❌', label: 'Rejected', color: 'var(--color-error)' },
  pending: { icon: '⏳', label: 'Verifying...', color: 'var(--color-warning)' },
  flagged: { icon: '🚩', label: 'Flagged', color: 'var(--color-warning)' },
};

function TaskCard({ task, submissions, onLog }) {
  const latestSub = submissions
    .filter((s) => s.taskId === task.id)
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
    [0];

  const status = latestSub?.status;
  const statusCfg = STATUS_CONFIG[status];
  const isCompleted = status === 'approved';

  return (
    <motion.div
      className={`${styles.taskCard} ${isCompleted ? styles.completed : ''}`}
      layout
      whileHover={!isCompleted ? { y: -3, boxShadow: 'var(--elevation-3)' } : {}}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.taskHeader}>
        <div className={styles.catBadge}>
          <span>{CATEGORY_ICONS[task.category] || '🌱'}</span>
          <span>{task.category}</span>
        </div>
        <span className={styles.points}>+{task.points} pts</span>
      </div>

      <h3 className={styles.taskTitle}>{task.title}</h3>
      <p className={styles.taskDesc}>{task.description}</p>

      <div className={styles.taskImpact}>
        {task.co2 && <span>🌍 {task.co2}g CO₂ saved</span>}
        {task.water && <span>💧 {task.water}L water saved</span>}
      </div>

      <div className={styles.taskFooter}>
        {statusCfg ? (
          <div className={styles.statusBadge} style={{ '--status-color': statusCfg.color }}>
            {statusCfg.icon} {statusCfg.label}
          </div>
        ) : (
          <div />
        )}

        {!isCompleted && (
          <motion.button
            className={styles.logBtn}
            onClick={() => onLog(task)}
            whileTap={{ scale: 0.95 }}
            disabled={status === 'pending'}
          >
            {status === 'pending' ? '⏳ Verifying' : '📸 Log Task'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default function Tasks() {
  const { profile } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  const loadData = () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getTasks(),
      getUserSubmissions(profile.id, 50),
    ])
      .then(([t, s]) => { setTasks(t); setSubmissions(s); })
      .catch((err) => {
        console.error('[Tasks] Failed to load:', err);
        setError(err?.message || 'Unknown error loading tasks');
        toast.error('Could not load tasks — check console for details');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const categories = ['all', ...new Set(tasks.map((t) => t.category))];

  const filtered = filter === 'all' ? tasks
    : filter === 'done'
    ? tasks.filter((t) => submissions.some((s) => s.taskId === t.id && s.status === 'approved'))
    : tasks.filter((t) => t.category === filter);

  const doneCount = tasks.filter((t) =>
    submissions.some((s) => s.taskId === t.id && s.status === 'approved')
  ).length;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.empty} style={{ padding: '48px 24px', gap: '16px' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 0 }}>Failed to load tasks</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, maxWidth: '100%', wordBreak: 'break-all' }}>
            {error}
          </p>
          <button
            onClick={loadData}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-sm)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Eco Tasks</h1>
          <p className={styles.subtitle}>
            {doneCount} of {tasks.length} completed today
          </p>
        </div>
        <div className={styles.progressRing}>
          <svg viewBox="0 0 48 48" className={styles.ring}>
            <circle cx="24" cy="24" r="20" className={styles.ringBg} />
            <circle
              cx="24" cy="24" r="20"
              className={styles.ringFill}
              strokeDasharray={`${tasks.length > 0 ? (doneCount / tasks.length) * 125.6 : 0} 125.6`}
            />
          </svg>
          <span className={styles.ringText}>{tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}%</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className={styles.filters}>
        {['all', 'done', ...new Set(tasks.map((t) => t.category))].map((cat) => (
          <button
            key={cat}
            className={`${styles.chip} ${filter === cat ? styles.chipActive : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? '🌍 All' : cat === 'done' ? '✅ Done' : `${CATEGORY_ICONS[cat] || '🌱'} ${cat}`}
          </button>
        ))}
      </div>

      {/* Task grid */}
      <motion.div className={styles.grid} layout>
        <AnimatePresence>
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              submissions={submissions}
              onLog={setSelectedTask}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <span>🌱</span>
            <p>No tasks in this category yet.</p>
          </div>
        )}
      </motion.div>

      {/* Task log modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskLogModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onSuccess={(sub) => {
              setSubmissions((prev) => [sub, ...prev]);
              setSelectedTask(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

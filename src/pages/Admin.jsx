import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getFlaggedSubmissions, updateSubmissionStatus, awardPointsAndUpdateStreak, resolveReport, getTasks, getRewards, createNotification } from '../services/firestoreService';
import { getAdminUsers, adminUpdateUserPoints, adminAwardFrame, adminBanUser, adminDeletePost, getReportedPosts, getAdminStats, getAdminChartData, getResolvedSubmissions, adminDeleteSubmission, adminCreateTask, adminUpdateTask, adminDeleteTask, adminCreateReward, adminUpdateReward, adminDeleteReward, getGlobalSettings, updateGlobalSettings, getFrameRequests, resolveFrameRequest } from '../services/adminService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './Admin.module.css';
import { FileText, Shield, Users, Globe, Leaf, Ban, CheckSquare, Sparkles, XCircle, AlertTriangle, Trash2, Inbox, Crown, Diamond, Medal, Save } from 'lucide-react';
import PremiumIcon from '../components/common/PremiumIcon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'submissions', label: 'Flagged Submissions' },
  { id: 'reports', label: 'Reported Posts' },
  { id: 'past', label: 'Past Submissions' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'frames', label: 'Frames' },
  { id: 'settings', label: 'Settings' }
];

export default function Admin() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, approvedSubmissions: 0 });
  const [chartData, setChartData] = useState([]);
  const [users, setUsers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [reports, setReports] = useState([]);
  const [pastSubmissions, setPastSubmissions] = useState([]);
  
  const [tasksData, setTasksData] = useState([]);
  const [rewardsData, setRewardsData] = useState([]);
  const [frameRequests, setFrameRequests] = useState([]);
  const [settingsData, setSettingsData] = useState(null);

  // Modals
  const [pointsModal, setPointsModal] = useState({ open: false, user: null, amount: 0 });
  const [frameModal, setFrameModal] = useState({ open: false, user: null, frameId: 'frame-god' });
  const [directAward, setDirectAward] = useState({ userId: '', frameId: 'frame-prime' });
  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [rewardModal, setRewardModal] = useState({ open: false, reward: null });

  // Role gate
  if (profile && profile.role !== 'teacher' && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!profile) return;
    loadTabData(activeTab);
  }, [activeTab, profile]);

  const loadTabData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const [s, c] = await Promise.all([
          getAdminStats(),
          getAdminChartData()
        ]);
        setStats(s);
        setChartData(c);
      } else if (tab === 'users') {
        const u = await getAdminUsers();
        setUsers(u);
      } else if (tab === 'submissions') {
        const f = await getFlaggedSubmissions(profile?.groupId);
        setFlagged(f);
      } else if (tab === 'reports') {
        const r = await getReportedPosts();
        setReports(r);
      } else if (tab === 'past') {
        const p = await getResolvedSubmissions();
        setPastSubmissions(p);
      } else if (tab === 'tasks') {
        const t = await getTasks();
        setTasksData(t);
      } else if (tab === 'rewards') {
        const r = await getRewards();
        setRewardsData(r);
      } else if (tab === 'frames' || tab === 'settings') {
        const setg = await getGlobalSettings();
        setSettingsData(setg);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // --- Submissions Logic ---
  const handleDecision = async (sub, status) => {
    try {
      await updateSubmissionStatus(sub.id, status, {
        reviewedBy: profile?.id,
        reason: status === 'approved' ? 'Manually approved by admin' : 'Manually rejected by admin',
        pointsAwarded: status === 'approved',
      });

      if (status === 'approved' && !sub.pointsAwarded) {
        await awardPointsAndUpdateStreak(sub.userId, sub.taskId, sub.points || 50, {
          co2: sub.co2 || 0, water: sub.water || 0, waste: sub.waste || 0,
        });
        
        await createNotification(sub.userId, 'system', {
          message: `Your task verification was approved by an Admin! You've been credited ${sub.points || 50} points.`
        });
      }

      setFlagged((prev) => prev.filter((s) => s.id !== sub.id));
      toast.success(`Submission ${status}!`);
    } catch {
      toast.error('Could not update submission');
    }
  };

  const handleDeletePastSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to permanently delete this submission?')) return;
    try {
      await adminDeleteSubmission(subId);
      toast.success('Submission deleted!');
      setPastSubmissions(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete submission');
    }
  };

  // --- Users Logic ---
  const handleUpdatePoints = async () => {
    try {
      await adminUpdateUserPoints(pointsModal.user.id, Number(pointsModal.amount));
      toast.success('Points updated successfully!');
      setPointsModal({ open: false, user: null, amount: 0 });
      loadTabData('users'); // refresh
    } catch (err) {
      toast.error(err.message || 'Failed to update points');
    }
  };

  const handleAwardFrame = async (e) => {
    e.preventDefault();
    try {
      await adminAwardFrame(frameModal.user.id, frameModal.frameId);
      toast.success(`Successfully awarded ${frameModal.frameId} to ${frameModal.user.displayName}!`);
      setFrameModal({ open: false, user: null, frameId: 'frame-god' });
      // Users array doesn't track frames directly, but we can refresh just in case
      loadTabData('users');
    } catch (err) {
      toast.error(err.message || 'Failed to award frame');
    }
  };

  const handleBanUser = async (user, ban) => {
    if (!window.confirm(`Are you sure you want to ${ban ? 'ban' : 'unban'} ${user.displayName}?`)) return;
    try {
      await adminBanUser(user.id, ban);
      toast.success(ban ? 'User banned' : 'User unbanned');
      loadTabData('users');
    } catch (err) {
      toast.error(err.message || 'Failed to ban/unban user');
    }
  };

  const handleResetPassword = async (email) => {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    }
  };

  // --- Reports Logic ---
  const handleDeletePost = async (postId, reportId) => {
    if (!window.confirm('Are you sure you want to delete this reported post?')) return;
    try {
      await adminDeletePost(postId, reportId);
      toast.success('Post deleted successfully');
      loadTabData('reports');
    } catch (err) {
      toast.error(err.message || 'Failed to delete post');
    }
  };

  const handleDismissReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to dismiss this report? The post will be kept safe.')) return;
    try {
      await resolveReport(reportId, 'dismissed');
      toast.success('Report dismissed');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      toast.error(err.message || 'Failed to dismiss report');
    }
  };

  // --- Tasks Logic ---
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const t = taskModal.task;
    try {
      if (t.id) {
        await adminUpdateTask(t.id, t);
        toast.success('Task updated!');
      } else {
        await adminCreateTask(t);
        toast.success('Task created!');
      }
      setTaskModal({ open: false, task: null });
      loadTabData('tasks');
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await adminDeleteTask(taskId);
      toast.success('Task deleted');
      loadTabData('tasks');
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  // --- Rewards Logic ---
  const handleSaveReward = async (e) => {
    e.preventDefault();
    const r = rewardModal.reward;
    try {
      if (r.id) {
        await adminUpdateReward(r.id, r);
        toast.success('Reward updated!');
      } else {
        await adminCreateReward(r);
        toast.success('Reward created!');
      }
      setRewardModal({ open: false, reward: null });
      loadTabData('rewards');
    } catch (err) {
      toast.error(err.message || 'Failed to save reward');
    }
  };

  const handleDeleteReward = async (rewardId) => {
    if (!window.confirm('Are you sure you want to delete this reward?')) return;
    try {
      await adminDeleteReward(rewardId);
      toast.success('Reward deleted');
      loadTabData('rewards');
    } catch (err) {
      toast.error(err.message || 'Failed to delete reward');
    }
  };

  // --- Settings Logic ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await updateGlobalSettings(settingsData);
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title} style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><PremiumIcon icon={Shield} color="slate" size={32} /> Admin Panel</h1>
        <p className={styles.subtitle}>Manage users, content, and review flagged submissions</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="adminTabIndicator" className={styles.activeIndicator} />
            )}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'submissions' && activeTab !== 'past' ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)' }}><PremiumIcon icon={Users} color="sapphire" size={24} /></div>
                  <div>
                    <span className={styles.statLabel}>Total Users</span>
                    <span className={styles.statValue}>{stats.totalUsers}</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}><PremiumIcon icon={Globe} color="gold" size={24} /></div>
                  <div>
                    <span className={styles.statLabel}>Community Posts</span>
                    <span className={styles.statValue}>{stats.totalPosts}</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}><PremiumIcon icon={Leaf} color="emerald" size={24} /></div>
                  <div>
                    <span className={styles.statLabel}>Approved Eco-Actions</span>
                    <span className={styles.statValue}>{stats.approvedSubmissions}</span>
                  </div>
                </div>
              </div>

              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Platform Activity (Last 7 Days)</h3>
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
                        itemStyle={{ color: 'var(--color-text)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="Signups" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Posts" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Actions" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Points</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ opacity: user.banned ? 0.5 : 1 }}>
                      <td>{user.displayName}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>{user.points || 0}</td>
                      <td>{user.role || 'user'}</td>
                      <td>{user.banned ? <><PremiumIcon icon={Ban} color="ruby" size={16} /> Banned</> : <><PremiumIcon icon={CheckSquare} color="emerald" size={16} /> Active</>}</td>
                      <td className={styles.actionCell}>
                        <button className={styles.btnSm} onClick={() => setPointsModal({ open: true, user, amount: 0 })}>Points</button>
                        <button className={styles.btnSm} onClick={() => handleResetPassword(user.email)}>Reset Pwd</button>
                        <button 
                          className={`${styles.btnSm} ${user.banned ? '' : styles.danger}`} 
                          onClick={() => handleBanUser(user, !user.banned)}
                        >
                          {user.banned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: FLAGGED SUBMISSIONS */}
          {activeTab === 'submissions' && (
            loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton ${styles.cardSkel}`} />)}
              </div>
            ) : flagged.length === 0 ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Sparkles} color="gold" size={32} />
                <p>No submissions waiting for review! All clear.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {flagged.map((sub) => (
                  <motion.div key={sub.id} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                        <p className={styles.cardConf}>Confidence: {Math.round(sub.confidence * 100)}%</p>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.approveBtn} onClick={() => handleDecision(sub, 'approved')}><PremiumIcon icon={CheckSquare} size={16} /> Approve</button>
                      <button className={styles.rejectBtn} onClick={() => handleDecision(sub, 'rejected')}><PremiumIcon icon={XCircle} size={16} /> Reject</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}

          {/* TAB 4: REPORTED POSTS */}
          {activeTab === 'reports' && (
             reports.length === 0 ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Sparkles} color="gold" size={32} />
                <p>No reported posts!</p>
              </div>
             ) : (
              <div className={styles.grid}>
                {reports.map((report) => (
                  <motion.div key={report.id} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Media Preview */}
                    {report.post?.imageUrl && (
                      <div style={{ width: '100%', maxHeight: '300px', overflow: 'hidden', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {report.post.imageUrl.startsWith('data:image/') && (
                          <a href={report.post.imageUrl} target="_blank" rel="noopener noreferrer">
                            <img src={report.post.imageUrl} alt="Reported Post" className={styles.photo} style={{ height: 'auto', maxHeight: '300px', objectFit: 'contain' }} />
                          </a>
                        )}
                        {report.post.imageUrl.startsWith('data:video/') && (
                          <video src={report.post.imageUrl} controls style={{ width: '100%', maxHeight: '300px', backgroundColor: '#000' }} />
                        )}
                        {report.post.imageUrl.startsWith('data:audio/') && (
                          <div style={{ padding: '24px', width: '100%' }}>
                            <audio src={report.post.imageUrl} controls style={{ width: '100%' }} />
                          </div>
                        )}
                        {report.post.imageUrl.startsWith('data:application/pdf') && (
                          <div style={{ padding: '24px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <FileText size={48} style={{ color: 'var(--color-text-secondary)' }} />
                            <a href={report.post.imageUrl} download="document.pdf" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>Download PDF to Review</a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={styles.cardBody}>
                      <p className={styles.cardReason} style={{ color: 'var(--color-error)', fontWeight: 'bold', fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PremiumIcon icon={AlertTriangle} color="ruby" size={20} /> Report: {report.reason || 'No reason'}
                      </p>
                      <p className={styles.cardConf}>Reporter ID: {report.reporterId}</p>
                      
                      {report.post ? (
                        <>
                          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <p style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                              Original Post by <strong>{report.post.displayName || report.post.userId}</strong>:
                            </p>
                            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                              {report.post.content}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p style={{ marginTop: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                          <em>Original post not found or already deleted.</em>
                        </p>
                      )}
                    </div>
                    
                    <div className={styles.cardActions}>
                      <button 
                        className={styles.rejectBtn} 
                        onClick={() => handleDeletePost(report.postId, report.id)}
                        disabled={!report.post}
                        style={{ opacity: !report.post ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <PremiumIcon icon={Trash2} color="white" size={16} /> Delete Post
                      </button>
                      <button 
                        className={styles.approveBtn} 
                        style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        onClick={() => handleDismissReport(report.id)}
                      >
                        Dismiss Report
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
             )
          )}

          {/* TAB 5: PAST SUBMISSIONS */}
          {activeTab === 'past' && (
            loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton ${styles.cardSkel}`} />)}
              </div>
            ) : pastSubmissions.length === 0 ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Inbox} color="slate" size={32} />
                <p>No past submissions found.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {pastSubmissions.map((sub) => (
                  <motion.div key={sub.id} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {sub.imageUrl && (
                      <a href={sub.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={sub.imageUrl} alt="Submission" className={styles.photo} />
                      </a>
                    )}
                    <div className={styles.cardBody}>
                      <p className={styles.cardId}>Submission #{sub.id.slice(0, 8)}</p>
                      <p className={styles.cardReason}>
                        <strong>Status:</strong> 
                        <span style={{ 
                          color: sub.status === 'approved' ? 'var(--color-success)' : 'var(--color-error)',
                          fontWeight: 'bold', marginLeft: '4px'
                        }}>
                          {sub.status.toUpperCase()}
                        </span>
                      </p>
                      <p className={styles.cardReason}>
                        <strong>User ID:</strong> <span style={{ fontSize: '10px' }}>{sub.userId}</span>
                      </p>
                      <p className={styles.cardReason}>
                        <strong>AI reasoning:</strong> {sub.reason || 'No reasoning provided'}
                      </p>
                      {sub.confidence != null && (
                        <p className={styles.cardConf}>Confidence: {Math.round(sub.confidence * 100)}%</p>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        className={styles.rejectBtn} 
                        style={{ background: 'transparent', border: '1px solid var(--color-error)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleDeletePastSubmission(sub.id)}
                      >
                        <PremiumIcon icon={Trash2} color="ruby" size={16} /> Delete Permanently
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}
          {/* TAB 6: TASKS MANAGER */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className={styles.approveBtn} 
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => setTaskModal({ open: true, task: { title: '', description: '', category: 'nature', points: 50, co2: 0, water: 0, waste: 0, verificationPrompt: '', difficulty: 'easy' }})}
                >
                  + Add New Task
                </button>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Points</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksData.map(t => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td style={{ textTransform: 'capitalize' }}>{t.category}</td>
                        <td>{t.points}</td>
                        <td className={styles.actionCell}>
                          <button className={styles.btnSm} onClick={() => setTaskModal({ open: true, task: t })}>Edit</button>
                          <button className={`${styles.btnSm} ${styles.danger}`} onClick={() => handleDeleteTask(t.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: REWARDS MANAGER */}
          {activeTab === 'rewards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className={styles.approveBtn} 
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => setRewardModal({ open: true, reward: { name: '', description: '', icon: '', pointCost: 100, tier: 'bronze' }})}
                >
                  + Add New Reward
                </button>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Icon</th>
                      <th>Name</th>
                      <th>Cost</th>
                      <th>Tier</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewardsData.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontSize: '24px' }}>{r.icon}</td>
                        <td>{r.name}</td>
                        <td>{r.pointCost}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.tier}</td>
                        <td className={styles.actionCell}>
                          <button className={styles.btnSm} onClick={() => setRewardModal({ open: true, reward: r })}>Edit</button>
                          <button className={`${styles.btnSm} ${styles.danger}`} onClick={() => handleDeleteReward(r.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: FRAMES (Settings, Direct Award & Requests) */}
          {activeTab === 'frames' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Legendary Frame Settings */}
              {settingsData && (
                <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className={styles.chartTitle} style={{ margin: 0 }}>Legendary Frame Visibility</h3>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Toggle whether legendary frames appear in the Rewards shop.</p>
                    </div>
                    <button onClick={handleSaveSettings} className={styles.approveBtn} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PremiumIcon icon={Save} color="white" size={16} /> Save Settings
                    </button>
                  </div>

                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                      <input 
                        type="checkbox" 
                        checked={settingsData.gaiaFrameEnabled ?? false} 
                        onChange={e => setSettingsData({...settingsData, gaiaFrameEnabled: e.target.checked})}
                        style={{ width: '20px', height: '20px' }}
                      />
                      🌿 Enable Gaia Crown Frame (25,000 pts)
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                      <input 
                        type="checkbox" 
                        checked={settingsData.supernovaFrameEnabled ?? false} 
                        onChange={e => setSettingsData({...settingsData, supernovaFrameEnabled: e.target.checked})}
                        style={{ width: '20px', height: '20px' }}
                      />
                      🌌 Enable Supernova Frame (50,000 pts)
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                      <input 
                        type="checkbox" 
                        checked={settingsData.primeFrameEnabled ?? false} 
                        onChange={e => setSettingsData({...settingsData, primeFrameEnabled: e.target.checked})}
                        style={{ width: '20px', height: '20px' }}
                      />
                      ✨ Enable Prime Frame (999,999 pts)
                    </label>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 9: GLOBAL SETTINGS */}
          {activeTab === 'settings' && settingsData && (
            <form onSubmit={handleSaveSettings} className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 className={styles.chartTitle}>Global Application Settings</h3>
              
              <div className={styles.inputGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                  <input 
                    type="checkbox" 
                    checked={settingsData.maintenanceMode} 
                    onChange={e => setSettingsData({...settingsData, maintenanceMode: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  Maintenance Mode (Currently active users only)
                </label>
              </div>
              
              <div className={styles.inputGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                  <input 
                    type="checkbox" 
                    checked={settingsData.allowSignups} 
                    onChange={e => setSettingsData({...settingsData, allowSignups: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  Allow New User Signups
                </label>
              </div>
              
              <div className={styles.inputGroup} style={{ maxWidth: '300px' }}>
                <label>Global Points Multiplier (e.g. 1.5 for +50% points)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={settingsData.pointsMultiplier || 1} 
                  onChange={e => setSettingsData({...settingsData, pointsMultiplier: parseFloat(e.target.value)})}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
                <button type="submit" className={styles.approveBtn} style={{ width: 'auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PremiumIcon icon={Save} color="white" size={16} /> Save Global Settings
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Points Modal */}
      {pointsModal.open && pointsModal.user && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Edit Points for {pointsModal.user.displayName}</h3>
            <p style={{ fontSize: '14px', color: 'gray', margin: 0 }}>
              Current Points: {pointsModal.user.points || 0}
            </p>
            <div className={styles.inputGroup}>
              <label>Amount to Add / Deduct (Use negative numbers to deduct)</label>
              <input 
                type="number" 
                value={pointsModal.amount} 
                onChange={(e) => setPointsModal({ ...pointsModal, amount: e.target.value })}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSm} onClick={() => setPointsModal({ open: false, user: null, amount: 0 })}>Cancel</button>
              <button className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}} onClick={handleUpdatePoints}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Frame Modal */}
      {frameModal.open && frameModal.user && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Award Frame to {frameModal.user.displayName}</h3>
            <form onSubmit={handleAwardFrame} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Select Frame to Award</label>
                <select 
                  value={frameModal.frameId} 
                  onChange={(e) => setFrameModal({ ...frameModal, frameId: e.target.value })}
                  style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                >
                  <option value="frame-prime">✨ PRIME FRAME (Admin Exclusive)</option>
                  <option value="frame-supernova">🌌 Supernova Frame (Legendary)</option>
                  <option value="frame-gaia">🌿 Gaia Crown Frame (Legendary)</option>
                  <option value="frame-god">👑 God Frame (Ultimate Celestial)</option>
                  <option value="frame-platinum">💎 Platinum Frame</option>
                  <option value="frame-gold">🥇 Gold Frame</option>
                  <option value="frame-silver">🥈 Silver Frame</option>
                  <option value="frame-bronze">🥉 Bronze Frame</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setFrameModal({ open: false, user: null, frameId: 'frame-god' })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Award Frame</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModal.open && taskModal.task && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{taskModal.task.id ? 'Edit Task' : 'Create New Task'}</h3>
            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Title</label>
                <input required value={taskModal.task.title} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, title: e.target.value }})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea required rows={3} value={taskModal.task.description} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, description: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>Category</label>
                  <select value={taskModal.task.category} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, category: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="waste">Waste</option>
                    <option value="water">Water</option>
                    <option value="energy">Energy</option>
                    <option value="transport">Transport</option>
                    <option value="food">Food</option>
                    <option value="nature">Nature</option>
                    <option value="community">Community</option>
                  </select>
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>Difficulty</label>
                  <select value={taskModal.task.difficulty} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, difficulty: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.inputGroup}>
                  <label>Points</label>
                  <input type="number" required value={taskModal.task.points} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, points: parseInt(e.target.value) }})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>CO2 Savings (g)</label>
                  <input type="number" required value={taskModal.task.co2} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, co2: parseInt(e.target.value) }})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Water Savings (L)</label>
                  <input type="number" required value={taskModal.task.water} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, water: parseInt(e.target.value) }})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Waste Savings (g)</label>
                  <input type="number" required value={taskModal.task.waste} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, waste: parseInt(e.target.value) }})} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Verification Prompt (Instructions for AI validation)</label>
                <input required value={taskModal.task.verificationPrompt} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, verificationPrompt: e.target.value }})} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setTaskModal({ open: false, task: null })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {rewardModal.open && rewardModal.reward && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{rewardModal.reward.id ? 'Edit Reward' : 'Create New Reward'}</h3>
            <form onSubmit={handleSaveReward} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Name</label>
                <input required value={rewardModal.reward.name} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, name: e.target.value }})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <input required value={rewardModal.reward.description} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, description: e.target.value }})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
                <div className={styles.inputGroup}>
                  <label>Icon</label>
                  <input required value={rewardModal.reward.icon} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, icon: e.target.value }})} style={{ fontSize: '24px', textAlign: 'center' }} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Tier</label>
                  <select value={rewardModal.reward.tier} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, tier: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Point Cost</label>
                <input type="number" required value={rewardModal.reward.pointCost} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, pointCost: parseInt(e.target.value) }})} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setRewardModal({ open: false, reward: null })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Save Reward</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

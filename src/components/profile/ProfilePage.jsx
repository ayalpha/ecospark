// src/components/profile/ProfilePage.jsx
// ONE profile system, two views: `isOwn` adds owner controls (edit, settings,
// share, completion prompt, heatmap); the public view adds Follow / Message /
// Share and mutual-follower context. Instagram-style header, stats row and
// tabs adapted to EcoSpark's eco-gamification identity.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Share2, Pencil, MessageCircle, Flame, Leaf, Award, Info,
  BadgeCheck, ChevronRight, Loader2, MapPin, CalendarDays, Link2, UserPlus,
  Grid3X3, BarChart3, Sparkles, AtSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../common/Avatar';
import FollowButton from '../social/FollowButton';
import FollowListModal from '../social/FollowListModal';
import { getFollowState, subscribeMyFollowing } from '../../services/followService';
import {
  setUsername, checkUsernameAvailable, usernameQuota,
  normalizeUsername, usernameFormatError,
} from '../../services/usernameService';
import { createOrGetChat, updateUserProfile } from '../../services/firestoreService';
import { pinnedAchievements, computeAchievements, profileCompletion } from '../../lib/achievements';
import { getLedger } from '../../services/walletService';
import { getProfileSuggestions } from '../../services/aiService';
import { useAuthStore } from '../../store/authStore';
import { collection, query, where, limit as qLimit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import styles from './ProfilePage.module.css';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.35, delay: i * 0.05 },
});

/* ── cover: deterministic gradient per uid ─────────────────────────────── */
function coverFor(id) {
  const gradients = [
    'linear-gradient(120deg, #0E2B22, #14532D 45%, #0E7490)',
    'linear-gradient(120deg, #052E16, #065F46 50%, #0C4A6E)',
    'linear-gradient(120deg, #1E1B4B, #312E81 50%, #134E4A)',
    'linear-gradient(120deg, #052E16, #365314 55%, #14532D)',
    'linear-gradient(120deg, #0C4A6E, #155E75 50%, #064E3B)',
  ];
  let h = 0;
  const key = id || 'eco';
  for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
  return gradients[Math.abs(h) % gradients.length];
}

/* ── 12-week heatmap (own profile only — reads the private ledger) ─────── */
function Heatmap({ days }) {
  const cells = useMemo(() => {
    const out = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ key, count: days?.[key] || 0, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return out;
  }, [days]);
  const level = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 12 ? 3 : 4);
  return (
    <div className={styles.heatmap}>
      <div className={styles.heatGrid}>
        {cells.map((c) => (
          <div
            key={c.key}
            className={`${styles.heatCell} ${styles[`h${level(c.count)}`]}`}
            title={`${c.label}: ${c.count ? `${c.count} actions` : 'no activity'}`}
          />
        ))}
      </div>
      <div className={styles.heatLegend}>
        <span>12 weeks</span>
        <span className={styles.heatScale}>
          <i className={styles.h0} /><i className={styles.h1} /><i className={styles.h2} /><i className={styles.h3} /><i className={styles.h4} />
        </span>
        <span>more</span>
      </div>
    </div>
  );
}

/* ── pinned achievements strip ─────────────────────────────────────────── */
function PinnedRow({ profile }) {
  const pinned = useMemo(() => pinnedAchievements(profile, 3), [profile]);
  if (!pinned.length) return null;
  return (
    <div className={styles.pinRow}>
      {pinned.map((a, i) => (
        <motion.div key={a.id} className={styles.pinCard} style={{ '--accent': a.accent }} {...fadeUp(i)}>
          <span className={styles.pinIcon}>{a.icon}</span>
          <span className={styles.pinName}>{a.name}</span>
          {a.unlocked
            ? <span className={styles.pinDone}><BadgeCheck size={12} /> Unlocked</span>
            : <span className={styles.pinProgress}>{Math.round(a.progress * 100)}%</span>}
        </motion.div>
      ))}
    </div>
  );
}

/* ── the shared page ───────────────────────────────────────────────────── */
export default function ProfilePage({ profileId, isOwn }) {
  const navigate = useNavigate();
  const { profile: myProfile, user } = useAuthStore();
  const myId = user?.uid || myProfile?.id;

  const [profile, setProfile] = useState(isOwn ? myProfile : null);
  const [loading, setLoading] = useState(!isOwn);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState(null); // null = loading
  const [followState, setFollowState] = useState(null);
  const [myFollowingSet, setMyFollowingSet] = useState(new Set());
  const [listModal, setListModal] = useState(null); // 'followers' | 'following'
  const [heatDays, setHeatDays] = useState(null);
  const [messaging, setMessaging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef = useRef(null);

  /* username editing (own only) */
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameCheck, setUsernameCheck] = useState({ status: 'idle' });

  /* AI profile coach (own + incomplete only) — headline, bio, next steps */
  const [aiCoach, setAiCoach] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiSigRef = useRef(null);
  useEffect(() => {
    if (!isOwn || !profile?.id) return;
    const { pct, missing } = profileCompletion(profile);
    if (pct >= 1) { setAiCoach(null); aiSigRef.current = null; return; }
    const sig = profileSuggestionsSignature(profile, missing);
    if (aiSigRef.current === sig) return;
    aiSigRef.current = sig;
    setAiLoading(true);
    getProfileSuggestions(profile, missing).then((s) => {
      setAiCoach(s);
      setAiLoading(false);
    });
  }, [isOwn, profile]);

  /* achievements must live above the early returns — hooks can't be conditional */
  const ach = useMemo(() => computeAchievements(profile || {}), [profile]);

  /* live availability probe for the username field (debounced) */
  useEffect(() => {
    if (!editing) return;
    const next = normalizeUsername(usernameInput);
    if (!next || next === (profile?.username || '')) { setUsernameCheck({ status: 'idle' }); return undefined; }
    const formatError = usernameFormatError(next);
    if (formatError) { setUsernameCheck({ status: 'invalid', message: formatError }); return undefined; }
    setUsernameCheck({ status: 'checking' });
    const t = setTimeout(() => {
      checkUsernameAvailable(next).then((r) => {
        setUsernameCheck(r.available ? { status: 'ok' } : { status: 'taken', message: r.message });
      }).catch(() => setUsernameCheck({ status: 'idle' }));
    }, 350);
    return () => clearTimeout(t);
  }, [usernameInput, editing, profile?.username]);

  /* own profile tracks the live store copy */
  useEffect(() => {
    if (isOwn) setProfile(myProfile);
  }, [isOwn, myProfile]);

  /* public profile load — keyed on the profileId only: the auth store's
     profile changes whenever OUR counters change (e.g. right after a follow),
     and re-running this effect would flash the skeleton and remount the
     FollowButton with a stale initial state. */
  useEffect(() => {
    if (isOwn || !profileId) return;
    let alive = true;
    setLoading(true); setError(null);
    import('../../services/firestoreService').then(({ getPublicProfile }) =>
      getPublicProfile(profileId),
    ).then((p) => {
      if (!alive) return;
      setProfile(p);
      setLoading(false);
    }).catch((e) => {
      if (!alive) return;
      setError(e.message || 'Failed to load profile');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [profileId, isOwn]);

  /* follow state (public view) */
  useEffect(() => {
    if (isOwn || !profileId || !myId || myId === profileId) return;
    let alive = true;
    getFollowState(profileId).then((s) => { if (alive) setFollowState(s); }).catch(() => {});
    return () => { alive = false; };
  }, [profileId, isOwn, myId]);

  /* the viewer's own following set — drives the inline Follow/Following state
     inside the followers/following list modal (live, bounded at 200) */
  useEffect(() => {
    if (!myId) { setMyFollowingSet(new Set()); return undefined; }
    return subscribeMyFollowing(myId, setMyFollowingSet);
  }, [myId]);

  /* posts by this user (single where — no composite index needed) */
  useEffect(() => {
    if (!profile?.id) return;
    let alive = true;
    getDocs(query(
      collection(db, 'posts'),
      where('userId', '==', profile.id),
      qLimit(50),
    )).then((snap) => {
      if (!alive) return;
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPosts(rows);
    }).catch(() => alive && setPosts([]));
    return () => { alive = false; };
  }, [profile?.id]);

  /* heatmap (own only) — reuse the wallet ledger, no extra indexes */
  useEffect(() => {
    if (!isOwn) return;
    getLedger().then((rows) => {
      const days = {};
      rows.forEach((r) => {
        if (!r.at) return;
        const d = new Date(r.at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days[key] = (days[key] || 0) + 1;
      });
      setHeatDays(days);
    }).catch(() => setHeatDays({}));
  }, [isOwn]);

  const handleMessage = async () => {
    if (!myId || messaging || !profile?.id) return;
    setMessaging(true);
    try {
      // Username handles make the DM URL pretty (and idempotent); the chat
      // itself is created on arrival by /messages/@name resolution.
      if (profile.username) {
        navigate(`/messages/@${profile.username}`);
        return;
      }
      const chatId = await createOrGetChat(myId, profile.id);
      navigate(`/messages/${chatId}`);
    } catch {
      toast.error('Could not open the chat');
      setMessaging(false);
    }
  };

  const handleShare = async () => {
    const url = profile.username
      ? `${window.location.origin}/@${profile.username}`
      : `${window.location.origin}/user/${profile.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${profile.displayName} on EcoSpark`, url });
      else { await navigator.clipboard.writeText(url); toast.success('Profile link copied'); }
    } catch { /* dismissed */ }
  };

  const saveProfile = async () => {
    if (saving) return;
    const nextUsername = normalizeUsername(usernameInput);
    const currentUsername = profile.username || '';
    if (nextUsername && nextUsername !== currentUsername) {
      if (usernameCheck.status === 'checking') { toast.error('Still checking that username…'); return; }
      if (usernameCheck.status === 'taken' || usernameCheck.status === 'invalid') {
        toast.error(usernameCheck.message || 'That username is not available.');
        return;
      }
      if (usernameQuota(profile).remaining <= 0) {
        toast.error("You've used all 3 username changes for this month.");
        return;
      }
    }
    setSaving(true);
    try {
      if (nextUsername && nextUsername !== currentUsername) {
        await setUsername(nextUsername); // API — authoritative uniqueness + quota
      }
      const updates = { displayName: name.trim(), bio: bio.trim() };
      if (photo) {
        const { convertFileToBase64 } = await import('../../lib/fileUtils');
        updates.photoURL = await convertFileToBase64(photo);
      }
      await updateUserProfile(myId, updates);
      setEditing(false);
      setPhoto(null); setPhotoPreview(null);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) { toast.error('Photo must be under 700 KB'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /* ── loading / error / missing ── */
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={`${styles.cover} ${styles.skeletonCover}`} />
        <div className={styles.skeletonBody}>
          <div className={`skeleton ${styles.avatarSkeleton}`} />
          <div className={`skeleton ${styles.lineSkeleton}`} style={{ width: '40%' }} />
          <div className={`skeleton ${styles.lineSkeleton}`} style={{ width: '65%' }} />
          <div className={styles.statsSkeleton}>
            {[0, 1, 2, 3].map((i) => <div key={i} className={`skeleton ${styles.statSkeleton}`} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <UserPlus size={40} />
          <h2>{error ? 'Could not load this profile' : 'Profile not found'}</h2>
          <p>{error?.message || 'The account may have been removed or renamed.'}</p>
          <button className={styles.btnPrimary} onClick={() => window.location.reload()} type="button">Try again</button>
        </div>
      </div>
    );
  }

  const followers = profile.followersCount ?? 0;
  const following = profile.followingCount ?? 0;
  const completion = isOwn ? profileCompletion(profile) : null;
  const quota = isOwn ? usernameQuota(profile) : null;

  return (
    <div className={styles.page}>
      {/* ── cover + identity header ── */}
      <div className={styles.cover} style={{ background: coverFor(profile.id) }}>
        <div className={styles.coverPattern} aria-hidden="true" />
        {isOwn && (
          <Link to="/settings" className={styles.coverSettings} aria-label="Settings"><Settings size={16} /></Link>
        )}
      </div>

      <div className={styles.head}>
        <div className={`${styles.avatarWrap} ${profile.activeFrame ? styles.avatarFramed : ''}`}>
          <Avatar src={profile.photoURL} activeFrame={profile.activeFrame} size={96} alt={profile.displayName} />
        </div>

        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{profile.displayName || 'EcoUser'}</h1>
            {(profile.role === 'admin' || profile.role === 'owner' || profile.role === 'teacher') && (
              <span className={styles.roleBadge}><BadgeCheck size={13} /> {profile.role === 'owner' ? 'Owner' : 'Staff'}</span>
            )}
            {followState?.followsMe && !isOwn && <span className={styles.followsYou}>Follows you</span>}
          </div>
          {profile.username && <p className={styles.handle}>@{profile.username}</p>}
          <p className={styles.bio}>{profile.bio || (isOwn ? 'Add a bio so people know what you care about.' : 'EcoSpark member')}</p>
          <div className={styles.metaRow}>
            {profile.groupId && <span className={styles.meta}><MapPin size={12} /> Group member</span>}
            {profile.createdAt?.toDate && (
              <span className={styles.meta}><CalendarDays size={12} /> Joined {profile.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            )}
            {profile.website && <span className={styles.meta}><Link2 size={12} /> {profile.website}</span>}
          </div>
        </div>

        <div className={styles.actions}>
          {isOwn ? (
            <>
              <button
                className={styles.btnGhost}
                onClick={() => { setName(profile.displayName || ''); setBio(profile.bio || ''); setUsernameInput(profile.username || ''); setEditing(true); }}
                type="button"
              >
                <Pencil size={15} /> Edit profile
              </button>
              <button className={styles.btnPrimary} onClick={handleShare} type="button">
                <Share2 size={15} /> Share
              </button>
            </>
          ) : (
            <>
              <FollowButton
                targetUid={profile.id}
                initialFollowing={followState?.isFollowing}
                initialFollowsMe={followState?.followsMe}
                size="lg"
                onCountChange={({ followersCount }) => setProfile((p) => ({ ...p, followersCount }))}
                onStateChange={({ isFollowing }) => setFollowState((s) => ({ ...(s || { followsMe: false }), isFollowing }))}
              />
              <button className={styles.btnGhost} onClick={handleMessage} disabled={messaging} type="button">
                {messaging ? <Loader2 size={15} className={styles.spin} /> : <MessageCircle size={15} />} Message
              </button>
              <button className={styles.btnGhostIcon} onClick={handleShare} aria-label="Share profile" type="button">
                <Share2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── stats row ── */}
      <div className={styles.statsRow}>
        <button className={styles.stat} onClick={() => setListModal('followers')} type="button">
          <strong>{followers}</strong><span>Followers</span>
        </button>
        <button className={styles.stat} onClick={() => setListModal('following')} type="button">
          <strong>{following}</strong><span>Following</span>
        </button>
        <div className={styles.stat}><strong>{profile.totalTasksCompleted || 0}</strong><span>Tasks</span></div>
        <div className={styles.stat}><strong>{((profile.totalCO2Saved || 0) / 1000).toFixed(1)}kg</strong><span>CO₂ saved</span></div>
        <div className={styles.stat}><strong>{profile.streak || 0}</strong><span>Day streak</span></div>
      </div>

      {/* ── completion prompt (own only) ── */}
      {isOwn && completion && completion.pct < 1 && (
        <motion.div className={styles.completionCard} {...fadeUp(0)}>
          <div className={styles.completionHead}>
            <span className={styles.completionTitle}><Sparkles size={14} /> Complete your profile</span>
            <span className={styles.completionPct}>{Math.round(completion.pct * 100)}%</span>
          </div>
          <div className={styles.completionBar}><div style={{ width: `${completion.pct * 100}%` }} /></div>
          {(aiCoach?.headline || (aiLoading && !aiCoach)) && (
            <p className={styles.coachLine}>
              <span className={styles.coachTag}>AI</span>
              {aiCoach?.headline || 'Reading your journey…'}
            </p>
          )}
          {aiCoach?.steps.length ? (
            <ul className={styles.completionList}>
              {aiCoach.steps.map((s) => <li key={s}><ChevronRight size={12} /> {s}</li>)}
            </ul>
          ) : (
            !aiLoading && (
              <ul className={styles.completionList}>
                {completion.missing.slice(0, 3).map((m) => <li key={m}><ChevronRight size={12} /> {m}</li>)}
              </ul>
            )
          )}
          {aiCoach?.bio && (
            <div className={styles.bioSuggest}>
              <p className={styles.bioSuggestText}>{aiCoach.bio}</p>
              <button className={styles.bioSuggestBtn} onClick={() => { setBio(aiCoach.bio); setEditing(true); }} type="button">Use this bio</button>
            </div>
          )}
          <button className={styles.completionCta} onClick={() => setEditing(true)} type="button">Fix it</button>
        </motion.div>
      )}

      {/* ── pinned achievements ── */}
      <PinnedRow profile={profile} />

      {/* ── tabs ── */}
      <div className={styles.tabs} role="tablist">
        {[['posts', 'Posts', Grid3X3], ['impact', 'Impact', BarChart3], ['achievements', 'Achievements', Award], ['about', 'About', Info]].map(([t, label, Icon]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tab} ${tab === t ? styles.tabOn : ''}`}
            onClick={() => setTab(t)}
            type="button"
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className={styles.tabBody}>
        {tab === 'posts' && (
          posts === null ? (
            <div className={styles.postsGrid}>{[0, 1, 2].map((i) => <div key={i} className={`skeleton ${styles.postSkeleton}`} />)}</div>
          ) : posts.length === 0 ? (
            <div className={styles.tabEmpty}>
              <Leaf size={26} />
              <p>{isOwn ? 'Share your first eco-win in the community!' : 'No posts yet.'}</p>
              {isOwn && <Link to="/community" className={styles.btnPrimary}>Post something</Link>}
            </div>
          ) : (
            <div className={styles.postsGrid}>
              {posts.map((p) => p.imageUrl ? (
                <img key={p.id} src={p.imageUrl} alt="" className={styles.postImg} loading="lazy" />
              ) : (
                <div key={p.id} className={styles.postText}>{p.content}</div>
              ))}
            </div>
          )
        )}

        {tab === 'impact' && (
          <div className={styles.impactWrap}>
            <div className={styles.impactGrid}>
              <div className={styles.impactCard} style={{ '--accent': '#38BDF8' }}>
                <p className={styles.impactVal}>{((profile.totalCO2Saved || 0) / 1000).toFixed(1)}<small>kg</small></p>
                <p className={styles.impactLabel}>CO₂ saved</p>
              </div>
              <div className={styles.impactCard} style={{ '--accent': '#22D3EE' }}>
                <p className={styles.impactVal}>{((profile.totalWaterSaved || 0) / 1000).toFixed(1)}<small>kL</small></p>
                <p className={styles.impactLabel}>Water saved</p>
              </div>
              <div className={styles.impactCard} style={{ '--accent': '#FBBF24' }}>
                <p className={styles.impactVal}>{((profile.totalWasteSaved || 0) / 1000).toFixed(1)}<small>kg</small></p>
                <p className={styles.impactLabel}>Waste recycled</p>
              </div>
              <div className={styles.impactCard} style={{ '--accent': '#A78BFA' }}>
                <p className={styles.impactVal}>{(profile.lifetimePoints || profile.points || 0).toLocaleString()}</p>
                <p className={styles.impactLabel}>Lifetime points</p>
              </div>
            </div>
            {isOwn && <Heatmap days={heatDays} />}
          </div>
        )}

        {tab === 'achievements' && (
          <div className={styles.achGrid}>
            {ach.all.map((a) => (
              <div key={a.id} className={`${styles.achCard} ${a.unlocked ? styles.achOn : styles.achOff}`} style={{ '--accent': a.accent }}>
                <span className={styles.achIcon}>{a.icon}</span>
                <p className={styles.achName}>{a.name}</p>
                <p className={styles.achDesc}>{a.desc}</p>
                <div className={styles.achBar}><div style={{ width: `${a.progress * 100}%` }} /></div>
                <p className={styles.achMeta}>{a.unlocked ? 'Unlocked' : `${a.value}/${a.goal}`}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'about' && (
          <div className={styles.aboutWrap}>
            <div className={styles.aboutCard}>
              <h3><Info size={15} /> About</h3>
              <p>{profile.bio || 'No bio yet.'}</p>
            </div>
            <div className={styles.aboutCard}>
              <h3><Award size={15} /> Achievements</h3>
              <p>{ach.count} of {ach.all.length} unlocked</p>
            </div>
          </div>
        )}
      </div>

      {/* ── follow lists modal ── */}
      <AnimatePresence>
        {listModal && (
          <FollowListModal
            open
            dir={listModal}
            uid={profile.id}
            myId={myId}
            myFollowingSet={myFollowingSet}
            title={listModal === 'followers' ? 'Followers' : 'Following'}
            onClose={() => setListModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ── edit profile modal (own) ── */}
      <AnimatePresence>
        {editing && (
          <motion.div className={styles.modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(false)}>
            <motion.div className={styles.modal} initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 14 }} onClick={(e) => e.stopPropagation()}>
              <h3>Edit profile</h3>
              <div className={styles.photoRow}>
                <Avatar src={photoPreview || profile.photoURL} activeFrame={profile.activeFrame} size={64} alt={profile.displayName} />
                <button className={styles.btnGhost} onClick={() => photoRef.current?.click()} type="button">
                  <Pencil size={13} /> Change photo
                </button>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </div>
              <label className={styles.fieldLabel}>Username</label>
              <div className={styles.usernameRow}>
                <span className={styles.usernamePrefix}>@</span>
                <input
                  className={`${styles.fieldInput} ${styles.usernameField} ${
                    usernameCheck.status === 'ok' ? styles.usernameOk : usernameCheck.status === 'taken' || usernameCheck.status === 'invalid' ? styles.usernameBad : ''
                  }`}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  maxLength={20}
                  placeholder="eco_warrior"
                  autoComplete="off"
                />
              </div>
              <p className={`${styles.usernameHint} ${
                usernameCheck.status === 'ok' ? styles.usernameHintOk : usernameCheck.status === 'taken' || usernameCheck.status === 'invalid' ? styles.usernameHintBad : ''
              }`}>
                {usernameCheck.status === 'checking' ? 'Checking…'
                  : usernameCheck.status === 'ok' ? 'Available!'
                  : usernameCheck.status === 'taken' || usernameCheck.status === 'invalid' ? usernameCheck.message
                  : quota.remaining > 0
                    ? `${quota.remaining} of 3 changes left this month · ecosprk.vercel.app/@${usernameInput || 'yourname'}`
                    : 'No username changes left this month.'}
              </p>
              <label className={styles.fieldLabel}>Display name</label>
              <input className={styles.fieldInput} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
              <label className={styles.fieldLabel}>Bio</label>
              <textarea className={styles.fieldArea} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={160} />
              <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={() => setEditing(false)} type="button">Cancel</button>
                <button className={styles.btnPrimary} onClick={saveProfile} disabled={saving} type="button">
                  {saving ? <Loader2 size={15} className={styles.spin} /> : null} Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

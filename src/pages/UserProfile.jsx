// src/pages/UserProfile.jsx — public profile (Follow / Message / Share).
// Accepts both address forms: /user/{uid} and /@{username} (the vanity URL —
// the handle is resolved to a uid with one bounded client query).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfilePage from '../components/profile/ProfilePage';
import { resolveUsername } from '../services/usernameService';
import { useAuthStore } from '../store/authStore';

function HandleNotFound({ handle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
      <span style={{ fontSize: 40 }}>🔍</span>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', margin: 0 }}>
        No one goes by @{handle}
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>That username isn't taken by anyone yet.</p>
    </div>
  );
}

export default function UserProfile() {
  const params = useParams();
  const { user } = useAuthStore();
  // /user/{uid} → params.id · /@{username} → params.handle (the @ is part of
  // the value: router dynamic params own a whole segment).
  const raw = params.handle || params.id;
  const isHandle = typeof raw === 'string' && raw.startsWith('@');
  const handleId = isHandle ? raw.slice(1) : null;
  const [uid, setUid] = useState(isHandle ? null : raw);
  const [missed, setMissed] = useState(false);

  useEffect(() => {
    if (!isHandle) { setUid(raw); setMissed(false); return undefined; }
    let alive = true;
    setUid(null); setMissed(false);
    resolveUsername(handleId).then((resolved) => {
      if (!alive) return;
      if (resolved) setUid(resolved);
      else setMissed(true);
    }).catch(() => { if (alive) setMissed(true); });
    return () => { alive = false; };
  }, [raw, isHandle, handleId]);

  if (isHandle && missed) return <HandleNotFound handle={handleId} />;
  if (isHandle && !uid) {
    return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading…</div>;
  }
  // Opening your own handle (/@me) shows the owner view, not Follow yourself.
  if (user?.uid && uid === user.uid) return <ProfilePage isOwn />;
  return <ProfilePage profileId={uid} />;
}

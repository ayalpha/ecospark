// src/components/layout/ActivityTracker.jsx
// Invisible component with two jobs:
//   1. per-user behaviour memory (page time, clicks) for the EcoSpark Agent
//   2. leaderboard mirroring — the economy writes points with increment() from
//      many services, so rankings are kept current by watching the live
//      profile and syncing /leaderboard whenever a ranked value actually
//      changes (one code path covers every flow, present and future).

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { startActivityTracking, trackRoute } from '../../services/activityService';
import { subscribeUserProfile } from '../../services/firestoreService';

export default function ActivityTracker() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  useEffect(() => {
    if (user?.uid) startActivityTracking(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) trackRoute(location.pathname);
  }, [location.pathname, user?.uid]);

  // Leaderboard mirror
  const lbPrev = useRef(null);
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserProfile(user.uid, (p) => {
      if (!p) return;
      const next = {
        userId: user.uid,
        displayName: p.displayName || 'EcoUser',
        photoURL: p.photoURL || null,
        points: p.lifetimePoints ?? p.points ?? 0,
        weeklyPoints: p.weeklyPoints ?? 0,
        streak: p.streak ?? 0,
      };
      const prev = lbPrev.current;
      if (
        prev &&
        prev.points === next.points &&
        prev.weeklyPoints === next.weeklyPoints &&
        prev.streak === next.streak &&
        prev.displayName === next.displayName &&
        prev.photoURL === next.photoURL
      ) return;
      lbPrev.current = next;
      updateDoc(doc(db, 'leaderboard', user.uid), { ...next, updatedAt: serverTimestamp() })
        .catch(async () => {
          await setDoc(doc(db, 'leaderboard', user.uid), next, { merge: true }).catch(() => {});
        });
    });
    return unsub;
  }, [user?.uid]);

  return null;
}

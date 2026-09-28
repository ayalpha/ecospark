// src/components/layout/ActivityTracker.jsx
// Invisible component: starts the per-user behaviour memory on sign-in and
// feeds it every route change. The unified EcoSpark Agent reads this memory.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { startActivityTracking, trackRoute } from '../../services/activityService';

export default function ActivityTracker() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  useEffect(() => {
    if (user?.uid) startActivityTracking(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) trackRoute(location.pathname);
  }, [location.pathname, user?.uid]);

  return null;
}

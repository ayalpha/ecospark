// src/services/activityService.js
// Per-user behaviour memory for the unified EcoSpark Agent.
// Tracks (client-side, on the user's own profile doc):
//   - time spent per page, visit counts per page
//   - recent page segments (path + seconds + when)
//   - recent clicks (button/link labels, capped)
//   - seconds per calendar day (pruned to 30 days)
// The agent reads this to ground its greeting and advice in real behaviour.

import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const CAP_EVENTS = 40;
const CAP_CLICKS = 20;
const CAP_DAYS = 30;
const FLUSH_MS = 45000;

let state = null;           // per-session memory, see reset()
let flushTimer = null;
let clickListener = null;
let currentUid = null;

function blankState() {
  return {
    pageTime: {},        // path -> cumulative seconds
    pageVisits: {},      // path -> visit count
    recentEvents: [],    // [{ path, secs, at }]
    recentClicks: [],    // [{ label, at }]
    days: {},            // 'YYYY-MM-DD' -> seconds
    sessionsCount: 0,
    dirty: false,
    pathEnteredAt: null,
    currentPath: null,
  };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadPersisted(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const a = snap.exists() ? snap.data().activity : null;
    if (!a) return null;
    return {
      pageTime: a.pageTime || {},
      pageVisits: a.pageVisits || {},
      recentEvents: Array.isArray(a.recentEvents) ? a.recentEvents.slice(-CAP_EVENTS) : [],
      recentClicks: Array.isArray(a.recentClicks) ? a.recentClicks.slice(-CAP_CLICKS) : [],
      days: a.days || {},
      sessionsCount: a.sessionsCount || 0,
    };
  } catch {
    return null;
  }
}

/** Accumulate the just-closed page segment into the maps. */
function closeSegment() {
  if (!state?.currentPath || !state.pathEnteredAt) return;
  const secs = Math.round((Date.now() - state.pathEnteredAt) / 1000);
  if (secs < 1) return;
  const path = state.currentPath;
  state.pageTime[path] = (state.pageTime[path] || 0) + secs;
  state.days[todayKey()] = (state.days[todayKey()] || 0) + secs;
  state.recentEvents.push({ path, secs, at: new Date().toISOString() });
  if (state.recentEvents.length > CAP_EVENTS) state.recentEvents.splice(0, state.recentEvents.length - CAP_EVENTS);
  state.dirty = true;
}

/** Called by <ActivityTracker/> whenever the route changes. */
export function trackRoute(path) {
  if (!state) return;
  closeSegment();
  state.currentPath = path;
  state.pathEnteredAt = Date.now();
  state.pageVisits[path] = (state.pageVisits[path] || 0) + 1;
  state.dirty = true;
  flushActivity(); // cheap on route change; throttled by dirty flag
}

function onClickCapture(e) {
  if (!state) return;
  const el = e.target?.closest?.('button, a, [role="button"], [role="tab"]');
  if (!el) return;
  const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!label) return;
  state.recentClicks.push({ label, at: new Date().toISOString() });
  if (state.recentClicks.length > CAP_CLICKS) state.recentClicks.splice(0, state.recentClicks.length - CAP_CLICKS);
  state.dirty = true;
}

export async function flushActivity() {
  if (!state?.dirty || !currentUid) return;
  state.dirty = false;
  // prune day buckets
  const dayKeys = Object.keys(state.days).sort();
  if (dayKeys.length > CAP_DAYS) {
    for (const k of dayKeys.slice(0, dayKeys.length - CAP_DAYS)) delete state.days[k];
  }
  try {
    await updateDoc(doc(db, 'users', currentUid), {
      activity: {
        pageTime: state.pageTime,
        pageVisits: state.pageVisits,
        recentEvents: state.recentEvents,
        recentClicks: state.recentClicks,
        days: state.days,
        sessionsCount: state.sessionsCount,
        lastActiveAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch {
    state.dirty = true; // retry on next tick
  }
}

/** Start tracking for a signed-in user. Safe to call on every mount. */
export async function startActivityTracking(uid) {
  if (currentUid === uid && state) return;
  stopActivityTracking();
  currentUid = uid;
  state = blankState();
  const persisted = await loadPersisted(uid);
  if (persisted) Object.assign(state, persisted);
  state.sessionsCount += 1;
  state.dirty = true;

  clickListener = onClickCapture;
  document.addEventListener('click', clickListener, { capture: true });

  flushTimer = setInterval(flushActivity, FLUSH_MS);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { closeSegment(); flushActivity(); } });

  // best-effort flush when leaving the app
  window.addEventListener('beforeunload', () => { closeSegment(); flushActivity(); });
}

export function stopActivityTracking() {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  if (clickListener) document.removeEventListener('click', clickListener, { capture: true });
  clickListener = null;
  if (state) flushActivity();
  state = null;
  currentUid = null;
}

/** Snapshot for the agent context. Closes the live segment first so the
    current page's time is included. */
export function getActivitySnapshot() {
  if (!state) return null;
  closeSegment();
  state.currentPath = state.currentPath; // keep current segment running
  state.pathEnteredAt = Date.now();      // restart its clock after snapshot
  return {
    pageTime: { ...state.pageTime },
    pageVisits: { ...state.pageVisits },
    recentEvents: [...state.recentEvents],
    recentClicks: [...state.recentClicks],
    days: { ...state.days },
    sessionsCount: state.sessionsCount,
  };
}

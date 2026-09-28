// src/services/agentContext.js
// Builds the personal context digest the unified EcoSpark Agent thinks with.
// Gathers: profile (points, streak, tasks), behaviour memory (page time,
// visits, clicks), learn progress, and the lesson currently open (if any).

import { COURSES } from './learnCatalog';
import { getLearnProgress } from './learnService';
import { getActivitySnapshot } from './activityService';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

let lessonContext = null;

/** Learn page registers the currently-open lesson so the agent tutors in-context. */
export function setAgentLessonContext(lesson) {
  lessonContext = lesson
    ? { courseId: lesson.courseId, courseTitle: lesson.courseTitle, title: lesson.title, minutes: lesson.minutes }
    : null;
}

export function getAgentLessonContext() {
  return lessonContext;
}

// ── persistent chat memory (users/{uid}.agentChat) ─────────────────────────
// The conversation survives refreshes and sessions, so the agent keeps a
// running record of what each user told it (school, plans, preferences).

const CHAT_CAP = 30;

export async function loadAgentChat() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const msgs = snap.exists() ? snap.data().agentChat : null;
    return Array.isArray(msgs) ? msgs.slice(-CHAT_CAP) : [];
  } catch {
    return [];
  }
}

export async function saveAgentChat(messages) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const clean = (messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && (m.content || '').trim())
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-CHAT_CAP);
  try {
    await updateDoc(doc(db, 'users', uid), { agentChat: clean, updatedAt: serverTimestamp() });
  } catch { /* cosmetic persistence — never block the chat */ }
}

function fmtSeconds(total) {
  if (!total) return '0 min';
  if (total < 90) return `${total}s`;
  const mins = Math.round(total / 60);
  if (mins < 90) return `${mins} min`;
  return `${(mins / 60).toFixed(1)}h`;
}

function summarizeActivity(activity) {
  if (!activity) return null;
  const topPages = Object.entries(activity.pageTime || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, secs]) => `${path} (${fmtSeconds(secs)})`);
  const recentPages = (activity.recentEvents || [])
    .slice(-8)
    .reverse()
    .map((e) => `${e.path} for ${fmtSeconds(e.secs)}`);
  const recentClicks = (activity.recentClicks || [])
    .slice(-8)
    .reverse()
    .map((c) => c.label);
  const visits = Object.entries(activity.pageVisits || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([path, n]) => `${path}×${n}`);
  return {
    sessions: activity.sessionsCount || 0,
    topPagesByTime: topPages,
    visitCounts: visits,
    recentPageSegments: recentPages,
    recentClicks,
  };
}

/**
 * Build the full context object for the agent.
 * Everything in here is REAL data — the prompt forbids inventing more.
 */
export async function buildAgentContext() {
  const { useAuthStore } = await import('../store/authStore');
  const { profile } = useAuthStore.getState();
  const learn = await getLearnProgress().catch(() => null);

  const lessonsDone = Object.keys(learn?.lessons || {});
  const lastLesson = lessonsDone[lessonsDone.length - 1] || null;

  const quizEntries = Object.entries(learn?.quiz || {});
  const bestQuiz = quizEntries.length
    ? quizEntries.map(([k, v]) => `${k.replace('quiz/', '')}: ${v}`).join(', ')
    : null;

  return {
    now: new Date().toISOString(),
    user: {
      name: profile?.displayName || 'there',
      spendablePoints: profile?.spendableBalance ?? profile?.points ?? 0,
      lifetimePoints: profile?.lifetimePoints || profile?.points || 0,
      weeklyPoints: profile?.weeklyPoints || 0,
      streakDays: profile?.streak || 0,
      longestStreak: profile?.longestStreak || 0,
      tasksCompletedLifetime: profile?.totalTasksCompleted || 0,
      co2SavedKg: +((profile?.totalCO2Saved || 0) / 1000).toFixed(1),
    },
    behaviour: summarizeActivity(getActivitySnapshot()),
    learn: {
      xp: learn?.xp || 0,
      lessonsCompleted: lessonsDone.length,
      lastLesson: lastLesson,
      bestQuizScores: bestQuiz,
    },
    openLesson: getAgentLessonContext(),
    courseCatalog: COURSES.map((c) => ({ id: c.id, title: c.title, lessons: c.lessons.length })),
  };
}

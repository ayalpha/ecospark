// src/lib/achievements.js
// Achievement engine — pure functions over the real profile fields. Every
// tier checks a number that actually exists on the user doc, so the showcase
// can never display a badge the data doesn't back.

/**
 * @param {Object} p - user profile doc (own or any public one)
 * @returns {{ unlocked: Array, locked: Array, all: Array, count: number }}
 *   Each entry: { id, icon, accent, name, desc, value, goal, progress (0..1) }
 */
export function computeAchievements(p = {}) {
  const tasks = p.totalTasksCompleted || 0;
  const streak = p.streak || 0;
  const points = p.lifetimePoints || p.points || 0;
  const co2g = p.totalCO2Saved || 0;
  const followers = p.followersCount || 0;
  // Lessons live on users/{uid}.learn.lessons (a {courseId/lessonId: …} map
  // written by learnService) — there is no lessonsCompleted counter field.
  const lessons = Object.keys(p.learn?.lessons || {}).length;

  const defs = [
    { id: 'first-task', icon: '🌱', accent: '#2DD4A7', name: 'First Step', desc: 'Complete your first eco-task', value: tasks, goal: 1 },
    { id: 'tasks-10', icon: '♻️', accent: '#34D399', name: 'Green Routine', desc: 'Complete 10 eco-tasks', value: tasks, goal: 10 },
    { id: 'tasks-50', icon: '🏅', accent: '#10B981', name: 'Action Hero', desc: 'Complete 50 eco-tasks', value: tasks, goal: 50 },
    { id: 'streak-3', icon: '🔥', accent: '#FB923C', name: 'Warming Up', desc: 'Keep a 3-day streak', value: streak, goal: 3 },
    { id: 'streak-7', icon: '🔥', accent: '#F97316', name: 'Week Warrior', desc: 'Keep a 7-day streak', value: streak, goal: 7 },
    { id: 'streak-30', icon: '🏆', accent: '#EA580C', name: 'Unstoppable', desc: 'Keep a 30-day streak', value: streak, goal: 30 },
    { id: 'points-1k', icon: '⚡', accent: '#FBBF24', name: 'Point Collector', desc: 'Earn 1,000 lifetime points', value: points, goal: 1000 },
    { id: 'points-25k', icon: '💎', accent: '#F59E0B', name: 'Point Machine', desc: 'Earn 25,000 lifetime points', value: points, goal: 25000 },
    { id: 'co2-1kg', icon: '🌍', accent: '#38BDF8', name: 'Carbon Cutter', desc: 'Save 1kg of CO₂', value: co2g, goal: 1000 },
    { id: 'co2-10kg', icon: '🌍', accent: '#0EA5E9', name: 'Climate Champion', desc: 'Save 10kg of CO₂', value: co2g, goal: 10000 },
    { id: 'followers-5', icon: '🤝', accent: '#A78BFA', name: 'Community Root', desc: 'Reach 5 followers', value: followers, goal: 5 },
    { id: 'followers-25', icon: '🌟', accent: '#8B5CF6', name: 'Local Legend', desc: 'Reach 25 followers', value: followers, goal: 25 },
    { id: 'learn-3', icon: '🎓', accent: '#F472B6', name: 'Curious Mind', desc: 'Finish 3 lessons', value: lessons, goal: 3 },
    { id: 'learn-10', icon: '🎓', accent: '#EC4899', name: 'Deep Diver', desc: 'Finish 10 lessons', value: lessons, goal: 10 },
  ];

  const all = defs.map((d) => ({
    ...d,
    progress: Math.min(1, d.value / d.goal),
    unlocked: d.value >= d.goal,
  }));

  return {
    all,
    unlocked: all.filter((a) => a.unlocked),
    locked: all.filter((a) => !a.unlocked),
    count: all.filter((a) => a.unlocked).length,
  };
}

/** Pinned showcase: unlocked first (closest to the next tier first), then the
    nearest locked ones — capped for the profile header strip. */
export function pinnedAchievements(p = {}, cap = 3) {
  const { unlocked, locked } = computeAchievements(p);
  const byFreshness = [...unlocked].sort((a, b) => b.value / b.goal - a.value / a.goal);
  const byCloseness = [...locked].sort((a, b) => b.progress - a.progress);
  return [...byFreshness, ...byCloseness].slice(0, cap);
}

/** Profile completion 0..1 with the missing pieces named. */
export function profileCompletion(p = {}) {
  const checks = [
    { id: 'photo', done: !!p.photoURL, label: 'Add a profile photo' },
    { id: 'bio', done: !!(p.bio && p.bio.trim()), label: 'Write a short bio' },
    { id: 'task', done: (p.totalTasksCompleted || 0) > 0, label: 'Complete your first task' },
    { id: 'post', done: (p.postCount || 0) > 0, label: 'Share your first post' },
    { id: 'follow', done: (p.followingCount || 0) > 0, label: 'Follow someone' },
  ];
  const done = checks.filter((c) => c.done).length;
  return {
    pct: done / checks.length,
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}

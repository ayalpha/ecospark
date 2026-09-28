// src/services/learnService.js
// Progress persistence + the Learn Agent (Groq llama-3.3-70b — free tier).
// The agent mirrors the Nexora pipeline in spirit: analyse activity → extract
// interests → recommend from the REAL catalog (never invent courses) → tutor.

import { db, auth } from '../lib/firebase';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, collection, addDoc,
} from 'firebase/firestore';
import { COURSES, COURSE_MAP } from './learnCatalog';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

async function groqJSON(system, user) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key missing');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 900,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

// ── progress (users/{uid}.learn) ────────────────────────────────────────────

export async function getLearnProgress() {
  const uid = auth.currentUser?.uid;
  if (!uid) return { lessons: {}, quiz: {}, xp: 0, pointsEarned: 0, streakLastDate: null };
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() && snap.data().learn
    ? snap.data().learn
    : { lessons: {}, quiz: {}, xp: 0, pointsEarned: 0, streakLastDate: null };
}

export async function saveLearnProgress(progress) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { learn: progress, updatedAt: serverTimestamp() }).catch(() => {});
}

/** Mark a lesson complete: +XP, +points, streak bookkeeping. Idempotent per lesson. */
export async function completeLesson(courseId, lessonId, points) {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false };
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const learn = snap.exists() && snap.data().learn
    ? snap.data().learn
    : { lessons: {}, quiz: {}, xp: 0, pointsEarned: 0 };
  const key = `${courseId}/${lessonId}`;
  if (learn.lessons[key]) return { ok: true, alreadyDone: true, learn };

  learn.lessons[key] = { at: new Date().toISOString() };
  learn.xp = (learn.xp || 0) + 25;
  learn.pointsEarned = (learn.pointsEarned || 0) + points;
  await updateDoc(ref, {
    learn,
    spendableBalance: increment(points),
    updatedAt: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, 'transactions'), {
      userId: uid,
      type: 'earned',
      amount: points,
      description: `Learn: ${COURSE_MAP[courseId]?.title || courseId} — ${lessonId}`,
      createdAt: serverTimestamp(),
    });
  } catch { /* history mirror cosmetic */ }
  return { ok: true, learn };
}

/** Submit a quiz score for a course. First pass awards points. */
export async function recordQuiz(courseId, score, total, points) {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false };
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const learn = snap.exists() && snap.data().learn ? snap.data().learn : { lessons: {}, quiz: {}, xp: 0, pointsEarned: 0 };
  const key = `quiz/${courseId}`;
  const first = !learn.quiz[key];
  learn.quiz[key] = Math.max(learn.quiz[key] || 0, score);
  learn.xp = (learn.xp || 0) + score * 5;
  await updateDoc(ref, { learn, updatedAt: serverTimestamp() });
  if (first && points > 0) {
    await updateDoc(ref, { spendableBalance: increment(points), pointsEarned: increment(points) });
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: uid,
        type: 'earned',
        amount: points,
        description: `Learn quiz: ${COURSE_MAP[courseId]?.title || courseId} — ${score}/${total}`,
        createdAt: serverTimestamp(),
      });
    } catch { /* mirror cosmetic */ }
  }
  return { ok: true, first };
}

// ── the Learn Agent (Groq, free tier) ───────────────────────────────────────

const catalogDigest = COURSES.map((c) => ({
  id: c.id,
  title: c.title,
  level: c.level,
  minutes: c.minutes,
  lessons: c.lessons.map((l) => l.title),
}));

const AGENT_SYSTEM = `You are the EcoSpark Learn Agent — an encouraging, evidence-driven eco-learning coach for a gamified sustainability app used by students.

Rules:
- You recommend ONLY courses and lessons from the provided catalog. Never invent a course, lesson, or link.
- Ground every recommendation in the learner's actual data you are given (completed lessons, quiz scores, streaks, task history). Reference it concretely.
- Be warm but concise. 2-4 sentences max per recommendation unless writing a full study plan.
- If the learner has done nothing yet, welcome them and point at the beginner courses.
- Reply in the same language the learner uses.`;

const RECO_SYSTEM = `${AGENT_SYSTEM}

Output STRICT JSON, no prose, no code fences:
{
  "digest": "one short sentence summarising the learner's current state",
  "focus_area": "the single theme the learner should focus on next",
  "recommendations": [
    { "courseId": "one of the catalog ids", "reason": "one specific sentence grounded in their data" }
  ]
}
Give 2-3 recommendations, best first. Only catalog ids.`;

export async function agentRecommendations(progress, activitySummary) {
  const user = `Learner progress: ${JSON.stringify(progress)}

Course catalog: ${JSON.stringify(catalogDigest)}

Recent EcoSpark activity: ${activitySummary}

Produce the recommendation JSON.`;
  const out = await groqJSON(RECO_SYSTEM, user);
  // validate: only catalog ids survive
  const valid = (out.recommendations || []).filter((r) => COURSE_MAP[r.courseId]);
  return { ...out, recommendations: valid.slice(0, 3) };
}

export async function agentQuizFor(courseId, lessonId) {
  const course = COURSE_MAP[courseId];
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  if (!course || !lesson) throw new Error('Lesson not found');
  const sys = `${AGENT_SYSTEM}\n\nOutput STRICT JSON, no prose:\n{ "questions": [ { "q": "...", "options": ["...","...","...","..."], "answer": 0, "explain": "..." } ] }\nGenerate 3 quiz questions on the lesson below, at student level, grounded strictly in the lesson content. Exactly 4 options each; "answer" is the zero-based index of the correct one.`;
  const user = `Course: ${course.title}\nLesson: ${lesson.title}\nContent: ${JSON.stringify(lesson.sections.map((s) => s.h + ': ' + s.p.slice(0, 200)))}\nKey facts: ${JSON.stringify(lesson.keyFacts)}\nGenerate the JSON.`;
  const out = await groqJSON(sys, user);
  const qs = (out.questions || []).filter((q) => q.q && Array.isArray(q.options) && q.options.length >= 3 && typeof q.answer === 'number').slice(0, 3);
  return qs;
}

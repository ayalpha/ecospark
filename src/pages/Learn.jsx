// src/pages/Learn.jsx
// Learn Hub — curated course catalog + the dedicated Learn Agent.
// The agent (Groq llama-3.3-70b, free tier) analyses the learner's real
// EcoSpark activity, recommends from the fixed catalog, tutors inside lessons
// and generates extra quiz questions on demand.

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Sparkles, ArrowLeft, ArrowRight, Check, CheckCircle2,
  Clock, RefreshCw, BookOpen, Award, Zap, BrainCircuit,
  Loader2, MessageCircleQuestion, CircleAlert, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { COURSES, COURSE_MAP } from '../services/learnCatalog';
import {
  getLearnProgress, completeLesson, recordQuiz,
  agentRecommendations, agentQuizFor,
} from '../services/learnService';
import { setAgentLessonContext } from '../services/agentContext';
import styles from './Learn.module.css';

const LESSON_POINTS = 30;
const LEVEL_STEP = 120;
const LEVEL_TITLES = [
  'Seedling', 'Sprout', 'Sapling', 'Grove Keeper', 'Forest Guardian',
  'Canopy Master', 'Ecosystem Architect', 'Biosphere Legend',
];

const levelOf = (xp) => Math.floor((xp || 0) / LEVEL_STEP) + 1;
const levelTitle = (lvl) => LEVEL_TITLES[Math.min(lvl - 1, LEVEL_TITLES.length - 1)];

/* ── Course cover art ────────────────────────────────────────────────────── */
// First-party AI-generated raster covers (public/learn/{courseId}.jpg) in the
// same visual language as the casino covers; the procedural SVG motif is the
// offline fallback, never the primary look.

function CourseArt({ course, size = 'full' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${styles.courseArt} ${size === 'thumb' ? styles.courseArtThumb : ''}`} style={{ '--accent': course.accent }}>
      {!failed ? (
        <img
          src={`/learn/${course.id}.jpg`}
          alt=""
          loading="lazy"
          className={styles.courseArtImg}
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackArt course={course} />
      )}
    </div>
  );
}

function FallbackArt({ course }) {
  const gid = `ag-${course.icon}`;
  return (
    <>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={course.accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0C1119" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect width="200" height="120" fill={`url(#${gid})`} />
        {[26, 44, 62, 80].map((r) => (
          <circle key={r} cx="160" cy="96" r={r} fill="none" stroke={course.accent} strokeOpacity="0.16" strokeWidth="1" />
        ))}
        <path d="M0 96 Q 50 74 100 92 T 200 84 V 120 H 0 Z" fill={course.accent} fillOpacity="0.10" />
        <path d="M0 104 Q 60 86 110 100 T 200 94 V 120 H 0 Z" fill={course.accent} fillOpacity="0.14" />
      </svg>
      <span className={styles.courseArtIcon}>{ART_ICONS[course.icon] || <BookOpen size={26} />}</span>
    </>
  );
}

const ART_ICONS = {
  climate: <span style={{ fontSize: 24 }}>🌍</span>,
  waste: <span style={{ fontSize: 24 }}>♻️</span>,
  water: <span style={{ fontSize: 24 }}>💧</span>,
  energy: <span style={{ fontSize: 24 }}>⚡</span>,
  nature: <span style={{ fontSize: 24 }}>🐦</span>,
  leaf: <span style={{ fontSize: 24 }}>🌿</span>,
};

/* ── Quiz modal (curated course quiz) ────────────────────────────────────── */

function QuizModal({ course, progress, onClose, onDone }) {
  const questions = course.quiz;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [awarded, setAwarded] = useState(0);

  const q = questions[idx];

  const pick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = async () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    const finalScore = score;
    setFinished(true);
    try {
      const res = await recordQuiz(course.id, finalScore, questions.length, finalScore * 10);
      setAwarded(res?.first ? finalScore * 10 : 0);
      if (res?.first && finalScore * 10 > 0) toast.success(`+${finalScore * 10} points · quiz passed!`);
    } catch { /* non-blocking */ }
    onDone?.();
  };

  return (
    <motion.div className={styles.modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <button className={styles.modalClose} onClick={onClose} aria-label="Close quiz"><X size={18} /></button>

        {!finished ? (
          <>
            <div className={styles.quizMeta}>
              <span>{course.title}</span>
              <div className={styles.quizDots}>
                {questions.map((_, i) => (
                  <span key={i} className={i <= idx ? styles.dotOn : styles.dot} />
                ))}
              </div>
            </div>
            <h3 className={styles.quizQ}>{q.q}</h3>
            <div className={styles.quizOptions}>
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answer;
                const isPicked = i === picked;
                const cls = picked === null ? styles.quizOpt
                  : isAnswer ? `${styles.quizOpt} ${styles.quizOptRight}`
                  : isPicked ? `${styles.quizOpt} ${styles.quizOptWrong}`
                  : styles.quizOpt;
                return (
                  <button key={i} className={cls} onClick={() => pick(i)} disabled={picked !== null}>
                    <span className={styles.quizOptLetter}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                    {picked !== null && isAnswer && <Check size={16} className={styles.quizOptCheck} />}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {picked !== null && (
                <motion.div
                  className={styles.quizExplain}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p>{q.explain}</p>
                  <button className={styles.btnPrimary} onClick={next}>
                    {idx + 1 < questions.length ? 'Next question' : 'See results'} <ArrowRight size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className={styles.quizResult}>
            <div className={styles.resultRing} style={{ '--pct': `${(score / questions.length) * 100}%` }}>
              <span>{score}/{questions.length}</span>
            </div>
            <h3>{score === questions.length ? 'Flawless! 🌟' : score >= questions.length / 2 ? 'Solid work! 🌱' : 'Good start — review and retry.'}</h3>
            <p>
              {awarded > 0
                ? <>You earned <strong>+{awarded} points</strong> for your first pass.</>
                : 'You already earned points for this quiz — retakes are for mastery.'}
            </p>
            <div className={styles.resultActions}>
              <button className={styles.btnGhost} onClick={() => { setIdx(0); setPicked(null); setScore(0); setFinished(false); }}>
                Retry quiz
              </button>
              <button className={styles.btnPrimary} onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── AI-generated bonus quiz (inside lesson) ─────────────────────────────── */

function AiQuiz({ course, lesson }) {
  const [state, setState] = useState('idle'); // idle | loading | active | error
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const generate = async () => {
    setState('loading');
    try {
      const qs = await agentQuizFor(course.id, lesson.id);
      if (!qs.length) throw new Error('empty');
      setQuestions(qs);
      setAnswers({});
      setState('active');
    } catch {
      toast.error('The agent could not build a quiz right now.');
      setState('idle');
    }
  };

  const answeredAll = questions.length > 0 && Object.keys(answers).length === questions.length;
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;

  if (state === 'idle') {
    return (
      <button className={styles.aiQuizBtn} onClick={generate}>
        <Sparkles size={16} /> Test me — generate a bonus quiz
      </button>
    );
  }
  if (state === 'loading') {
    return (
      <div className={styles.aiQuizBtn}>
        <Loader2 size={16} className={styles.spin} /> Your agent is writing questions…
      </div>
    );
  }
  return (
    <div className={styles.aiQuizWrap}>
      <div className={styles.aiQuizHead}>
        <Sparkles size={14} /> Agent bonus quiz
        <button className={styles.linkBtn} onClick={generate}><RefreshCw size={12} /> new set</button>
      </div>
      {questions.map((q, qi) => (
        <div key={qi} className={styles.aiQ}>
          <p className={styles.aiQTitle}>{qi + 1}. {q.q}</p>
          <div className={styles.aiQOpts}>
            {q.options.map((opt, oi) => {
              const picked = answers[qi] === oi;
              const revealed = picked || answeredAll;
              const isRight = oi === q.answer;
              return (
                <button
                  key={oi}
                  className={[
                    styles.aiQOpt,
                    revealed && isRight ? styles.aiQOptRight : '',
                    picked && !isRight ? styles.aiQOptWrong : '',
                  ].join(' ')}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  disabled={picked}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {answeredAll && <p className={styles.aiQExplain}>{q.explain}</p>}
        </div>
      ))}
      {answeredAll && (
        <p className={styles.aiQuizScore}>
          <Star size={14} /> {correct}/{questions.length} correct
          {correct === questions.length ? ' — the agent is impressed.' : ' — reread the key facts above.'}
        </p>
      )}
    </div>
  );
}

/* ── Catalog view ────────────────────────────────────────────────────────── */

function CatalogView({ progress, agent, onRefreshAgent, onOpenCourse, onOpenQuiz }) {
  const { profile } = useAuthStore();
  const openCoach = useUiStore((s) => s.openCoach);
  const lessonsDone = progress?.lessons || {};
  const xp = progress?.xp || 0;
  const lvl = levelOf(xp);
  const doneCount = Object.keys(lessonsDone).length;
  const totalLessons = COURSES.reduce((s, c) => s + c.lessons.length, 0);

  return (
    <>
      {/* Hero band */}
      <motion.section className={styles.hero} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className={styles.heroText}>
          <span className={styles.heroKicker}><GraduationCap size={14} /> Learn Hub</span>
          <h1 className={styles.heroTitle}>Learn the planet,<br />level up for real.</h1>
          <p className={styles.heroSub}>
            Six expert-crafted courses. A dedicated AI agent that reads your activity and
            points you at exactly what to learn next.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <Zap size={15} /> <strong>{xp}</strong> XP
            </div>
            <div className={styles.heroStat}>
              <BookOpen size={15} /> <strong>{doneCount}/{totalLessons}</strong> lessons
            </div>
            <div className={styles.heroStat}>
              <Award size={15} /> Level {lvl} · {levelTitle(lvl)}
            </div>
          </div>
          <div className={styles.xpBar}>
            <motion.div
              className={styles.xpFill}
              initial={{ width: 0 }}
              animate={{ width: `${((xp % LEVEL_STEP) / LEVEL_STEP) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className={styles.heroOrbit} aria-hidden="true">
          <div className={styles.orbitRing} />
          <div className={styles.orbitRing2} />
          <div className={styles.orbitCore}><GraduationCap size={34} /></div>
        </div>
      </motion.section>

      {/* Agent panel */}
      <motion.section
        className={styles.agentPanel}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45 }}
      >
        <div className={styles.agentHead}>
          <div className={styles.agentBadge}>
            <BrainCircuit size={18} />
            <span className={styles.liveDot} />
          </div>
          <div className={styles.agentHeadText}>
            <h2>Your Learning Agent</h2>
            <p>Runs on Groq GPT-OSS-120B · free tier · grounded in your activity + the catalog</p>
          </div>
          <div className={styles.agentHeadActions}>
            <button className={styles.btnGhostSm} onClick={onRefreshAgent} disabled={agent.phase === 'loading'}>
              {agent.phase === 'loading' ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
              Refresh
            </button>
            <button className={styles.btnPrimarySm} onClick={openCoach}>
              <MessageCircleQuestion size={14} /> Ask agent
            </button>
          </div>
        </div>

        {agent.phase === 'loading' && (
          <div className={styles.agentLoading}>
            <Loader2 size={16} className={styles.spin} />
            Reading your activity, streaks and progress…
          </div>
        )}

        {agent.phase === 'ready' && (
          <div className={styles.agentBody}>
            <p className={styles.agentDigest}>{agent.digest}</p>
            {agent.focus && (
              <p className={styles.agentFocus}>Focus area: <strong>{agent.focus}</strong></p>
            )}
            <div className={styles.agentRecs}>
              {agent.recs.map((r, i) => {
                const c = COURSE_MAP[r.courseId];
                if (!c) return null;
                const courseDone = c.lessons.filter((l) => lessonsDone[`${c.id}/${l.id}`]).length;
                return (
                  <motion.button
                    key={r.courseId}
                    className={styles.recCard}
                    style={{ '--accent': c.accent }}
                    onClick={() => onOpenCourse(c.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -3 }}
                  >
                    <span className={styles.recRank}>#{i + 1} pick</span>
                    <span className={styles.recTitle}>{c.title}</span>
                    <span className={styles.recReason}>{r.reason}</span>
                    <span className={styles.recMeta}>
                      <Clock size={12} /> {c.minutes} min · {courseDone}/{c.lessons.length} lessons
                      {courseDone === c.lessons.length && <><Check size={12} /> done</>}
                    </span>
                  </motion.button>
                );
              })}
              {agent.recs.length === 0 && <p className={styles.agentEmpty}>Open any course below — the agent learns from what you study.</p>}
            </div>
          </div>
        )}

        {agent.phase === 'error' && (
          <div className={styles.agentLoading}>
            <CircleAlert size={16} /> The agent couldn't reach the AI service. Check the API key and retry.
            <button className={styles.linkBtn} onClick={onRefreshAgent}>retry</button>
          </div>
        )}

        {agent.phase === 'idle' && (
          <div className={styles.agentLoading}>Press refresh to wake your agent.</div>
        )}
      </motion.section>

      {/* Catalog grid */}
      <h2 className={styles.sectionHeading}>Course Catalog</h2>
      <div className={styles.catalog}>
        {COURSES.map((c, i) => {
          const courseDone = c.lessons.filter((l) => lessonsDone[`${c.id}/${l.id}`]).length;
          const pct = Math.round((courseDone / c.lessons.length) * 100);
          const quizKey = `quiz/${c.id}`;
          const quizScore = progress?.quiz?.[quizKey];
          return (
            <motion.article
              key={c.id}
              className={styles.courseCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              whileHover={{ y: -4 }}
            >
              <button className={styles.courseCardBtn} onClick={() => onOpenCourse(c.id)}>
                <CourseArt course={c} />
                <div className={styles.courseCardBody}>
                  <div className={styles.courseCardTop}>
                    <span className={styles.levelChip} style={{ '--accent': c.accent }}>{c.level}</span>
                    <span className={styles.minutesChip}><Clock size={12} /> {c.minutes} min</span>
                  </div>
                  <h3 className={styles.courseCardTitle}>{c.title}</h3>
                  <p className={styles.courseCardTagline}>{c.tagline}</p>
                  <div className={styles.courseCardFoot}>
                    <div className={styles.courseProgress}>
                      <div className={styles.courseProgressFill} style={{ width: `${pct}%`, background: c.accent }} />
                    </div>
                    <span className={styles.courseProgressLabel}>
                      {courseDone}/{c.lessons.length} lessons{quizScore != null ? ` · quiz ${quizScore}/${c.quiz.length}` : ''}
                    </span>
                  </div>
                </div>
              </button>
            </motion.article>
          );
        })}
      </div>
    </>
  );
}

/* ── Course view ─────────────────────────────────────────────────────────── */

function CourseView({ course, progress, onBack, onOpenLesson, onOpenQuiz }) {
  const lessonsDone = progress?.lessons || {};
  const courseDone = course.lessons.filter((l) => lessonsDone[`${course.id}/${l.id}`]).length;
  const nextLesson = course.lessons.find((l) => !lessonsDone[`${course.id}/${l.id}`]) || course.lessons[0];
  const quizKey = `quiz/${course.id}`;
  const quizScore = progress?.quiz?.[quizKey];

  return (
    <>
      <motion.button className={styles.backBtn} onClick={onBack} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <ArrowLeft size={16} /> All courses
      </motion.button>

      <motion.section
        className={styles.courseHero}
        style={{ '--accent': course.accent }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CourseArt course={course} size="thumb" />
        <div className={styles.courseHeroText}>
          <div className={styles.courseHeroChips}>
            <span className={styles.levelChip} style={{ '--accent': course.accent }}>{course.level}</span>
            <span className={styles.minutesChip}><Clock size={12} /> {course.minutes} min</span>
            <span className={styles.minutesChip}><BookOpen size={12} /> {course.lessons.length} lessons</span>
          </div>
          <h1>{course.title}</h1>
          <p>{course.tagline}</p>
          <div className={styles.courseHeroActions}>
            <button className={styles.btnPrimary} onClick={() => onOpenLesson(course.id, nextLesson.id)}>
              {courseDone === 0 ? 'Start course' : courseDone === course.lessons.length ? 'Review lessons' : 'Continue'}
              <ArrowRight size={15} />
            </button>
            <button className={styles.btnGhost} onClick={() => onOpenQuiz(course.id)}>
              <Award size={15} />
              {quizScore != null ? `Quiz: ${quizScore}/${course.quiz.length}` : 'Take the quiz'}
            </button>
          </div>
        </div>
      </motion.section>

      <div className={styles.lessonList}>
        {course.lessons.map((l, i) => {
          const done = !!lessonsDone[`${course.id}/${l.id}`];
          return (
            <motion.button
              key={l.id}
              className={styles.lessonRow}
              style={{ '--accent': course.accent }}
              onClick={() => onOpenLesson(course.id, l.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 4 }}
            >
              <span className={`${styles.lessonNum} ${done ? styles.lessonNumDone : ''}`}>
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={styles.lessonInfo}>
                <span className={styles.lessonTitle}>{l.title}</span>
                <span className={styles.lessonMinutes}><Clock size={11} /> {l.minutes} min · {l.sections.length} chapters</span>
              </span>
              <ArrowRight size={16} className={styles.lessonArrow} />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

/* ── Lesson view ─────────────────────────────────────────────────────────── */

function LessonView({ course, lesson, progress, onBackToCourse, onNextLesson, onRefreshProgress }) {
  const openCoach = useUiStore((s) => s.openCoach);
  const key = `${course.id}/${lesson.id}`;
  const done = !!progress?.lessons?.[key];
  const idx = course.lessons.findIndex((l) => l.id === lesson.id);
  const next = course.lessons[idx + 1];

  // Register the open lesson so the unified agent tutors in-context.
  useEffect(() => {
    setAgentLessonContext({ ...lesson, courseId: course.id, courseTitle: course.title });
    return () => setAgentLessonContext(null);
  }, [course.id, course.title, lesson]);

  const markComplete = async () => {
    try {
      const res = await completeLesson(course.id, lesson.id, LESSON_POINTS);
      if (res?.ok && !res.alreadyDone) {
        toast.success(`+${LESSON_POINTS} points · +25 XP`);
      } else if (res?.alreadyDone) {
        toast('Already completed — mastery is free.');
      }
      onRefreshProgress?.();
    } catch {
      toast.error('Could not save progress — check connection.');
    }
  };

  return (
    <article className={styles.reader}>
      <div className={styles.readerTop}>
        <button className={styles.backBtn} onClick={onBackToCourse}>
          <ArrowLeft size={16} /> {course.title}
        </button>
        <button className={styles.linkBtn} onClick={openCoach}>
          <MessageCircleQuestion size={14} /> Ask the tutor
        </button>
      </div>

      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className={styles.readerKicker} style={{ color: course.accent }}>
          Lesson {idx + 1} of {course.lessons.length} · {lesson.minutes} min
        </p>
        <h1 className={styles.readerTitle}>{lesson.title}</h1>
      </motion.header>

      <div className={styles.readerBody}>
        {lesson.sections.map((s, i) => (
          <motion.section
            key={i}
            className={styles.readerSection}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.03 * i }}
          >
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </motion.section>
        ))}

        <aside className={styles.keyFacts} style={{ '--accent': course.accent }}>
          <h3><Sparkles size={14} /> Key facts to remember</h3>
          <ul>
            {lesson.keyFacts.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </aside>

        <AiQuiz course={course} lesson={lesson} />
      </div>

      <footer className={styles.readerFooter}>
        {done ? (
          <span className={styles.doneBadge}><CheckCircle2 size={16} /> Lesson completed</span>
        ) : (
          <button className={styles.btnPrimary} onClick={markComplete}>
            <Check size={16} /> Mark complete · +{LESSON_POINTS} pts
          </button>
        )}
        {next && (
          <button className={styles.btnGhost} onClick={() => onNextLesson(next.id)}>
            Next lesson <ArrowRight size={15} />
          </button>
        )}
      </footer>
    </article>
  );
}

/* ── Page shell ──────────────────────────────────────────────────────────── */

export default function Learn() {
  const { profile } = useAuthStore();
  const [progress, setProgress] = useState(null);
  const [view, setView] = useState({ type: 'catalog' });
  const [quizCourseId, setQuizCourseId] = useState(null);
  const [agent, setAgent] = useState({ phase: 'idle', digest: '', focus: '', recs: [] });

  useEffect(() => {
    getLearnProgress().then(setProgress).catch(() => setProgress({ lessons: {}, quiz: {}, xp: 0 }));
  }, []);

  const refreshAgent = useCallback(async () => {
    setAgent((a) => ({ ...a, phase: 'loading' }));
    try {
      const p = progress || (await getLearnProgress());
      const streak = profile?.streak || 0;
      const tasks = profile?.totalTasksCompleted || 0;
      const weekly = profile?.weeklyPoints || 0;
      const summary = `${streak}-day streak, ${tasks} eco-tasks completed lifetime, ${weekly} points earned this week.`;
      const out = await agentRecommendations(p, summary);
      setAgent({
        phase: 'ready',
        digest: out.digest || 'Here is where you stand.',
        focus: out.focus_area || '',
        recs: out.recommendations || [],
      });
    } catch (err) {
      console.error('[Learn] agent error:', err);
      setAgent((a) => ({ ...a, phase: 'error' }));
    }
  }, [progress, profile]);

  // Wake the agent once progress + profile are both in
  const agentBooted = useRef(false);
  useEffect(() => {
    if (!agentBooted.current && progress && profile) {
      agentBooted.current = true;
      refreshAgent();
    }
  }, [progress, profile, refreshAgent]);

  const currentLesson = view.type === 'lesson'
    ? COURSE_MAP[view.courseId]?.lessons.find((l) => l.id === view.lessonId)
    : null;

  const handleCompleted = async () => {
    const p = await getLearnProgress();
    setProgress(p);
  };

  const quizCourse = quizCourseId ? COURSE_MAP[quizCourseId] : null;

  return (
    <div className={styles.page}>
      <AnimatePresence mode="wait">
        {view.type === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <CatalogView
              progress={progress}
              agent={agent}
              onRefreshAgent={refreshAgent}
              onOpenCourse={(courseId) => setView({ type: 'course', courseId })}
              onOpenQuiz={setQuizCourseId}
            />
          </motion.div>
        )}

        {view.type === 'course' && COURSE_MAP[view.courseId] && (
          <motion.div key={`course-${view.courseId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <CourseView
              course={COURSE_MAP[view.courseId]}
              progress={progress}
              onBack={() => setView({ type: 'catalog' })}
              onOpenLesson={(courseId, lessonId) => { setView({ type: 'lesson', courseId, lessonId }); window.scrollTo({ top: 0 }); }}
              onOpenQuiz={setQuizCourseId}
            />
          </motion.div>
        )}

        {view.type === 'lesson' && COURSE_MAP[view.courseId] && currentLesson && (
          <motion.div key={`lesson-${view.courseId}-${view.lessonId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LessonView
              course={COURSE_MAP[view.courseId]}
              lesson={currentLesson}
              progress={progress}
              onBackToCourse={() => { setView({ type: 'course', courseId: view.courseId }); window.scrollTo({ top: 0 }); }}
              onNextLesson={(lessonId) => { setView({ type: 'lesson', courseId: view.courseId, lessonId }); window.scrollTo({ top: 0 }); }}
              onRefreshProgress={handleCompleted}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quizCourse && (
          <QuizModal
            course={quizCourse}
            progress={progress}
            onClose={() => setQuizCourseId(null)}
            onDone={handleCompleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

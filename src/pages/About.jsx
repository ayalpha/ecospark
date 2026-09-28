// src/pages/About.jsx — What EcoSpark is, how it works, and what powers it.
// Kept honest: every claim mirrors the shipped code (see services/ + api/).

import { motion } from 'framer-motion';
import {
  Leaf, ShieldCheck, GraduationCap, Swords, Gift, Users, BrainCircuit,
  Globe2, Camera, RefreshCcw, Gavel, LineChart, Dices, Landmark,
  BookOpenCheck, FlaskConical, HeartHandshake, Compass, Award,
  Cpu, Database, Sparkles, Radio, Heart,
} from 'lucide-react';
import styles from './About.module.css';

const fade = (delay = 0) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, delay },
});

/* ── content ─────────────────────────────────────────────────────────────── */

const MODULES = [
  {
    icon: ShieldCheck, accent: '#2DD4A7', title: 'Eco Tasks',
    desc: 'Real-world actions, photographed and verified. AI reviews each submission in your browser with a lenient, evidence-first prompt — borderline cases go to teachers, never auto-rejected on a guess.',
  },
  {
    icon: GraduationCap, accent: '#22D3EE', title: 'Learn Hub',
    desc: 'Six expert-written courses — climate, waste, water, energy, biodiversity, living — with key-fact callouts, curated quizzes, AI-generated bonus quizzes, XP levels and point rewards.',
  },
  {
    icon: Swords, accent: '#F97316', title: 'Arena',
    desc: 'A prediction market (The Oracle) grounded in live web search, a perps trading desk on real-time Binance prices with stop-loss and take-profit, a staking pool and trivia tournaments.',
  },
  {
    icon: Dices, accent: '#FBBF24', title: 'Casino',
    desc: 'Eleven original games — Dice, Mines, Plinko, Crash, Limbo, Wheel, HiLo, Dragon Tower, Duck Dash, Keno and Blackjack — every roll provably fair via HMAC-SHA256 commit-and-reveal seeds.',
  },
  {
    icon: Gift, accent: '#A78BFA', title: 'Rewards',
    desc: 'Spend earned points on frames, glows, companions and more, with a Fitting Studio to equip them. Loot cases use weighted, transparent tier odds.',
  },
  {
    icon: Users, accent: '#38BDF8', title: 'Community',
    desc: 'A feed for school eco-clubs, direct messages, leaderboards, weekly streaks and green-news briefings pulled from live sources.',
  },
];

const PIPELINE = [
  { icon: Camera, title: 'Submit', text: 'A photo is compressed in the browser and attached to a pending submission document.' },
  { icon: FlaskConical, title: 'AI review', text: 'Google Gemini (vision, free tier) evaluates the photo against the task with a deliberately lenient prompt — poor lighting and weird angles are accepted; only clearly unrelated images fail.' },
  { icon: Gavel, title: 'Verdict', text: 'Confidence ≥ 0.4 approves instantly; anything else is flagged for a teacher with the AI’s reasoning attached. No fake auto-approvals, ever.' },
  { icon: RefreshCcw, title: 'Payout', text: 'Approved actions pay points through an idempotent, transaction-guarded ledger write — closing the tab mid-verification can never lose a payout.' },
];

const AGENT_POINTS = [
  'One companion across the whole app — it tutors inside lessons, celebrates streaks and nudges when activity drops.',
  'It knows your real data: points, streaks, tasks, CO₂ saved, quiz scores, and how long you spend on each page.',
  'It remembers what you tell it — conversations persist on your profile, so it never starts from zero.',
  'It greets you exactly once, then talks like a friend mid-chat. Every number it cites comes from your data — it is never allowed to invent one.',
];

const NEP_PILLARS = [
  { icon: BookOpenCheck, title: 'Experiential learning', text: 'Students perform real-world eco-actions and photograph evidence — not just answer MCQs.' },
  { icon: HeartHandshake, title: 'Holistic development', text: 'Environmental, social and community impact tracked side by side with academic progress.' },
  { icon: Compass, title: '21st-century skills', text: 'Sustainability habits, critical thinking about personal footprints, and digital literacy.' },
  { icon: Award, title: 'Competency-based progress', text: 'Points, streaks, levels and badges tie measurable milestones to genuine behaviour change.' },
];

const STACK = [
  {
    icon: Cpu, title: 'Frontend',
    lines: ['React 19 + Vite with code-split, lazy-loaded routes', 'Framer Motion for motion design, CSS Modules for theming', 'react-three-fiber 3D Earth with adaptive 8K/4K day-night shaders'],
  },
  {
    icon: Database, title: 'Backend & data',
    lines: ['Firebase Auth + Firestore with strict, least-privilege security rules', 'Vercel serverless functions for privileged operations', 'Append-only point ledger — balances are always auditable'],
  },
  {
    icon: Sparkles, title: 'AI — all free tier',
    lines: ['Groq (openai/gpt-oss-120b) powers the EcoSpark Agent, task generation and quizzes', 'Google Gemini (vision + search grounding) verifies photos and settles real-world markets', 'Live price feeds (Binance, Coinbase, CryptoCompare) settle crypto markets — never model guesses'],
  },
  {
    icon: Radio, title: 'Live data',
    lines: ['GNews.io news briefings with server-side caching', 'Real-time Binance WebSocket streams for the perps desk', 'Earth imagery: NASA Blue Marble via Solar System Scope (CC BY 4.0)'],
  },
];

/* ── page ────────────────────────────────────────────────────────────────── */

export default function About() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <motion.section className={styles.hero} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className={styles.heroOrbit} aria-hidden="true">
          <span className={styles.orbitRing} />
          <span className={styles.orbitRing2} />
          <span className={styles.orbitCore}><Leaf size={30} /></span>
        </div>
        <span className={styles.kicker}><Leaf size={13} /> About EcoSpark</span>
        <h1 className={styles.heroTitle}>
          Small habits,<br />planetary impact.
        </h1>
        <p className={styles.heroSub}>
          EcoSpark turns sustainability into a habit loop for students: log real eco-actions,
          learn the science behind them, compete honestly, and watch your impact compound —
          all powered by a personal AI companion and built entirely on free-tier infrastructure.
        </p>
        <div className={styles.badges}>
          {['React 19', 'Firebase', 'Groq', 'Google Gemini', 'Three.js', 'Vercel'].map((b) => (
            <span key={b} className={styles.badge}>{b}</span>
          ))}
        </div>
      </motion.section>

      {/* Modules */}
      <motion.h2 className={styles.sectionTitle} {...fade(0)}><Globe2 size={18} /> What's inside</motion.h2>
      <div className={styles.moduleGrid}>
        {MODULES.map((m, i) => (
          <motion.article key={m.title} className={styles.moduleCard} style={{ '--accent': m.accent }} {...fade(i * 0.05)}>
            <span className={styles.moduleIcon}><m.icon size={21} /></span>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </motion.article>
        ))}
      </div>

      {/* Verification pipeline */}
      <motion.h2 className={styles.sectionTitle} {...fade(0)}><ShieldCheck size={18} /> How photo verification works</motion.h2>
      <motion.p className={styles.sectionLead} {...fade(0.05)}>
        Trust is the currency of eco-action. Every submission walks the same four-step path.
      </motion.p>
      <div className={styles.pipeline}>
        {PIPELINE.map((p, i) => (
          <motion.div key={p.title} className={styles.pipeStep} {...fade(i * 0.06)}>
            <div className={styles.pipeMarker}>
              <span className={styles.pipeNum}>{i + 1}</span>
              <span className={styles.pipeIcon}><p.icon size={17} /></span>
            </div>
            <div className={styles.pipeBody}>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* The Agent */}
      <motion.section className={styles.agentPanel} {...fade(0)}>
        <div className={styles.agentHead}>
          <span className={styles.agentChip}><BrainCircuit size={20} /></span>
          <div>
            <h2>The EcoSpark Agent</h2>
            <p>Your personal companion — one brain, whole app, free tier</p>
          </div>
        </div>
        <ul className={styles.agentList}>
          {AGENT_POINTS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </motion.section>

      {/* NEP 2020 */}
      <motion.h2 className={styles.sectionTitle} {...fade(0)}><Landmark size={18} /> NEP 2020 alignment</motion.h2>
      <div className={styles.pillarGrid}>
        {NEP_PILLARS.map((p, i) => (
          <motion.div key={p.title} className={styles.pillar} {...fade(i * 0.05)}>
            <span className={styles.pillarIcon}><p.icon size={19} /></span>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </motion.div>
        ))}
      </div>

      {/* Under the hood */}
      <motion.h2 className={styles.sectionTitle} {...fade(0)}><Cpu size={18} /> Under the hood</motion.h2>
      <div className={styles.stackGrid}>
        {STACK.map((s, i) => (
          <motion.div key={s.title} className={styles.stackCard} {...fade(i * 0.05)}>
            <div className={styles.stackHead}>
              <s.icon size={17} />
              <h3>{s.title}</h3>
            </div>
            <ul>
              {s.lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Market honesty strip */}
      <motion.div className={styles.honestyStrip} {...fade(0)}>
        <LineChart size={18} />
        <p>
          <strong>Fair play by design.</strong> Casino outcomes use HMAC-SHA256 commit-and-reveal seeds you can
          verify yourself; market settlements come from live price APIs and dated news sources — a market is
          voided and refunded rather than paid on a guess.
        </p>
      </motion.div>

      <footer className={styles.footer}>
        <p className={styles.footerMain}>Built with <Heart size={14} className={styles.heart} /> for sustainability education</p>
        <p className={styles.footerSub}>Zero paid APIs · 100% free-tier infrastructure · Earth imagery © Solar System Scope (CC BY 4.0)</p>
      </footer>
    </div>
  );
}

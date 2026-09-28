// src/components/coach/CoachPanel.jsx
// THE EcoSpark Agent — one unified companion for the whole app.
// Opens with a greeting generated from the user's REAL profile + behaviour
// (name, points, streak, tasks, page-time, clicks, learn progress), and every
// reply is grounded in that same context. When a lesson is open on /learn it
// tutors that lesson.

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { streamAgentReply } from '../../services/aiService';
import { buildAgentContext, loadAgentChat, saveAgentChat } from '../../services/agentContext';
import { BrainCircuit, Trash2, X, Send, Loader2 } from 'lucide-react';
import styles from './CoachPanel.module.css';

const GREETING_INSTRUCTION =
  '(Open the session: greet me like a friend who knows my data. One short paragraph — greet me by name, one specific real observation about my activity, one gentle nudge or question.)';

const firstName = (full) => (full || '').trim().split(/\s+/)[0] || '';

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}
    >
      {!isUser && (
        <span className={styles.botAvatar}><BrainCircuit size={16} /></span>
      )}
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
        {message.content || (message.streaming ? <TypingDots /> : '')}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className={styles.typingDots}>
      <span />
      <span />
      <span />
    </span>
  );
}

export default function CoachPanel() {
  const { coachMessages, appendCoachMessage, updateLastCoachMessage, clearCoachHistory, closeCoach } = useUiStore();
  const { profile } = useAuthStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [context, setContext] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const greetedRef = useRef(coachMessages.length > 0); // don't re-greet mid-session
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachMessages]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => abortRef.current?.abort();
  }, []);

  // Restore the persisted conversation (users/{uid}.agentChat) on first open,
  // so the agent keeps its record of the user across refreshes and sessions.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (useUiStore.getState().coachMessages.length === 0) {
        const hist = await loadAgentChat();
        if (!alive) return;
        if (hist.length > 0) {
          useUiStore.getState().setCoachMessages(hist);
          greetedRef.current = true; // a greeting already exists in history
        }
      }
      if (alive) setHistoryLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  // Build the personal context once per open (chat keeps working if the user
  // keeps the panel open across a page change — context refreshes per send).
  useEffect(() => {
    let alive = true;
    buildAgentContext().then((ctx) => { if (alive) setContext(ctx); });
    return () => { alive = false; };
  }, []);

  // Personalized greeting — only when there is genuinely no prior conversation.
  useEffect(() => {
    if (!historyLoaded || greetedRef.current || !context) return;
    greetedRef.current = true;
    runStream([{ role: 'user', content: GREETING_INSTRUCTION }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, historyLoaded]);

  const runStream = async (history) => {
    setStreaming(true);
    appendCoachMessage({ role: 'assistant', content: '', streaming: true });

    let ctx = context;
    try { ctx = await buildAgentContext(); setContext(ctx); } catch { /* keep stale ctx */ }
    if (!ctx) {
      setStreaming(false);
      updateLastCoachMessage("I couldn't load your profile just now — try again in a moment. 🌿");
      return;
    }

    let accumulated = '';
    abortRef.current = streamAgentReply(
      history,
      ctx,
      (token) => {
        accumulated += token;
        updateLastCoachMessage(accumulated);
      },
      () => {
        setStreaming(false);
        updateLastCoachMessage(accumulated);
        saveAgentChat(useUiStore.getState().coachMessages);
      },
      () => {
        setStreaming(false);
        updateLastCoachMessage("Sorry, I'm having trouble connecting right now. Try again in a moment! 🌿");
      },
    );
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    const userMsg = { role: 'user', content: text };
    appendCoachMessage(userMsg);
    const history = [...coachMessages, userMsg].slice(-10);
    await runStream(history);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    clearCoachHistory();
    saveAgentChat([]); // wipe the persistent record too
    greetedRef.current = false;
    setStreaming(false);
    // regenerate greeting from fresh context
    buildAgentContext().then((ctx) => {
      setContext(ctx);
      greetedRef.current = true;
      appendCoachMessage({ role: 'assistant', content: '', streaming: true });
      let accumulated = '';
      abortRef.current = streamAgentReply(
        [{ role: 'user', content: GREETING_INSTRUCTION }],
        ctx,
        (token) => { accumulated += token; updateLastCoachMessage(accumulated); },
        () => {
          updateLastCoachMessage(accumulated);
          saveAgentChat(useUiStore.getState().coachMessages);
        },
        () => updateLastCoachMessage("Sorry, connection hiccup — try the chat again! 🌿"),
      );
    });
  };

  const dynamicSuggestions = context?.openLesson
    ? ['Explain this lesson simply', 'Give me a real-world example', 'Quiz me on this']
    : ['How am I doing?', 'What should I do next?', "What's my biggest impact?"];

  // Desktop: slide-in side panel; Mobile: slide-up sheet
  const panelVariants = {
    hidden: { opacity: 0, x: '100%', y: 0 },
    visible: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: '100%', y: 0 },
  };

  const mobileVariants = {
    hidden: { opacity: 0, y: '100%' },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' },
  };

  const isMobile = window.innerWidth < 768;
  const variants = isMobile ? mobileVariants : panelVariants;

  return (
    <motion.div
      className={styles.panel}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: 'spring', stiffness: 340, damping: 35 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.headerAvatar}>
            <BrainCircuit size={22} />
            <span className={styles.liveDot} />
          </div>
          <div>
            <h3 className={styles.headerTitle}>EcoSpark Agent</h3>
            <p className={styles.headerSub}>
              {context ? `${firstName(context.user.name)}'s personal eco companion · knows your activity` : 'Loading your profile…'}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleClear} className={styles.iconBtn} title="Clear chat" aria-label="Clear chat">
            <Trash2 size={18} />
          </button>
          <button onClick={closeCoach} className={styles.iconBtn} title="Close" aria-label="Close agent">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {coachMessages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {!context && coachMessages.length === 0 && (
          <div className={styles.contextLoading}>
            <Loader2 size={16} className={styles.spin} /> Reading your points, streaks and activity…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only before the first user message) */}
      {coachMessages.length <= 1 && !streaming && context && (
        <div className={styles.suggestions}>
          {dynamicSuggestions.map((s) => (
            <button
              key={s}
              className={styles.suggestionChip}
              onClick={() => { setInput(s); setTimeout(sendMessage, 0); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={context?.openLesson ? 'Ask about this lesson…' : `Ask anything, ${firstName(context?.user.name) || 'eco-hero'}…`}
          rows={1}
          disabled={streaming}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
          aria-label="Send message"
        >
          {streaming ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
        </button>
      </div>
    </motion.div>
  );
}

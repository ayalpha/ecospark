// src/components/coach/AICoachWidget.jsx
// Hosts THE single EcoSpark Agent: one FAB, one panel, global across pages.
import { Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import CoachPanel from './CoachPanel';
import styles from './AICoachWidget.module.css';

export default function AICoachWidget() {
  const { coachOpen, toggleCoach } = useUiStore();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!coachOpen && (
          <motion.button
            id="ai-coach-fab"
            className={styles.fab}
            onClick={toggleCoach}
            aria-label="Open EcoSpark Agent"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Bot size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Agent Panel */}
      <AnimatePresence>
        {coachOpen && <CoachPanel />}
      </AnimatePresence>
    </>
  );
}

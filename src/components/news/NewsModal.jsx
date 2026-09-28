// src/components/news/NewsModal.jsx
// The in-app article reader: hero image, editorial typography, FULL article
// text (server-side extraction via /api/article), and the two banner ad slots
// that render only when an article is open — never on the news list pages.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AdBanner from '../ads/AdBanner';
import { fetchArticleContent } from '../../services/newsService';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import styles from './NewsModal.module.css';

function Shimmer({ w }) {
  return <div className={styles.shimmer} style={{ width: w }} />;
}

export default function NewsModal({ article, onClose }) {
  const [content, setContent] = useState(null); // null = loading

  const published = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '';

  useEffect(() => {
    let alive = true;
    setContent(null);
    fetchArticleContent(article.url).then((c) => {
      if (alive) setContent(c);
    });
    return () => { alive = false; };
  }, [article.url]);

  const fullText = content?.ok && content.paragraphs?.length > 0;

  return (
    <>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "-46%" }}
        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
        exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-46%" }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        role="dialog"
        aria-label={article.title}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className={styles.scrollArea}>
          {article.image && (
            <div className={styles.imgContainer}>
              <img src={article.image} alt={article.title} className={styles.img} />
              <div className={styles.imgGradient} />
            </div>
          )}

          <div className={styles.body}>
            <p className={styles.meta}>
              <span className={styles.sourceBadge}>{article.source?.name || content?.publisher || 'News'}</span>
              {published && <span className={styles.dot}>•</span>}
              {published && <span>{published}</span>}
            </p>

            <h2 className={styles.title}>{article.title}</h2>

            <div className={styles.adSlot}>
              <AdBanner slot="top" />
            </div>

            {/* ── Body: full text when extraction succeeds ── */}
            {content === null ? (
              <div className={styles.loadingBody}>
                <span className={styles.loadingTag}><LoaderCircle size={15} className={styles.spin} /> Loading full story…</span>
                <Shimmer w="100%" /><Shimmer w="94%" /><Shimmer w="97%" /><Shimmer w="88%" /><Shimmer w="60%" />
              </div>
            ) : fullText ? (
              <div className={styles.articleText}>
                {content.paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? styles.lead : styles.para}>{p}</p>
                ))}
                <p className={styles.creditNote}>
                  Republished preview from {content.publisher || article.source?.name}. Open the original for the full licensed version.
                </p>
              </div>
            ) : (
              <div className={styles.articleText}>
                {article.description && <p className={styles.lead}>{article.description}</p>}
                <p className={styles.fallbackNote}>
                  This publisher doesn't allow full-text extraction — continue on their site for the whole story.
                </p>
              </div>
            )}

            <div className={styles.adSlot}>
              <AdBanner slot="bottom" />
            </div>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.readMore}
            >
              <ExternalLink size={16} />
              Continue reading on {article.source?.name || 'the publisher'}
            </a>

            <p className={styles.disclaimer}>
              Story previews via GNews. Full articles belong to their publishers.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

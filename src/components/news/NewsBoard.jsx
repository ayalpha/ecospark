// src/components/news/NewsBoard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGreenNews } from '../../services/newsService';
import ErrorBoundary from '../common/ErrorBoundary';
import NewsModal from './NewsModal';
import PremiumIcon from '../common/PremiumIcon';
import { Globe, Newspaper, WifiOff, Leaf } from 'lucide-react';
import styles from './NewsBoard.module.css';

function NewsCardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <div className={`skeleton ${styles.imgSkel}`} />
      <div className={styles.skelBody}>
        <div className={`skeleton ${styles.skelLine}`} style={{ width: '90%' }} />
        <div className={`skeleton ${styles.skelLine}`} style={{ width: '70%' }} />
        <div className={`skeleton ${styles.skelLine}`} style={{ width: '40%', height: 12, marginTop: 8 }} />
      </div>
    </div>
  );
}

function NewsCard({ article, onClick }) {
  return (
    <motion.article
      className={styles.card}
      onClick={() => onClick(article)}
      whileHover={{ y: -3, boxShadow: 'var(--elevation-3)' }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(article)}
    >
      {article.image ? (
        <div className={styles.imgWrapper}>
          <img src={article.image} alt={article.title} className={styles.img} loading="lazy" />
          <div className={styles.imgOverlay} />
        </div>
      ) : (
        <div className={styles.imgPlaceholder}><PremiumIcon icon={Globe} color="sapphire" size={32} /></div>
      )}
      <div className={styles.cardBody}>
        <p className={styles.source}>{article.source?.name}</p>
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.snippet}>{article.description}</p>
      </div>
    </motion.article>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function NewsBoardInner({ layout = 'grid' }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const column = layout === 'column';

  useEffect(() => {
    fetchGreenNews()
      .then(setArticles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading} style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <PremiumIcon icon={Newspaper} size={24} />
          Latest Green News
        </h2>
        {!loading && !error && (
          <Link to="/news" className={styles.badge} style={{ textDecoration: 'none' }}>
            View More
          </Link>
        )}
      </div>

      {/* Column: compact rail; Grid: standard dashboard board */}
      {column ? (
        <div className={loading ? styles.gridLoading : styles.columnList}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <NewsCardSkeleton key={i} />)
            : error
            ? (
              <div className={styles.empty}>
                <PremiumIcon icon={WifiOff} color="slate" size={28} />
                <p>News is temporarily unavailable.</p>
              </div>
            )
            : articles.slice(0, 6).map((a, i) => (
              <button key={i} className={styles.columnItem} onClick={() => setSelected(a)}>
                {a.image ? (
                  <img src={a.image} alt="" loading="lazy" className={styles.columnThumb} />
                ) : (
                  <span className={styles.columnThumbPlaceholder}><PremiumIcon icon={Globe} color="sapphire" size={22} /></span>
                )}
                <span className={styles.columnText}>
                  <span className={styles.columnSource}>{a.source?.name}</span>
                  <span className={styles.columnTitle}>{a.title}</span>
                  <span className={styles.columnTime}>{timeAgo(a.publishedAt)}</span>
                </span>
              </button>
            ))
          }
        </div>
      ) : (
        <div className={loading ? styles.gridLoading : styles.grid}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <NewsCardSkeleton key={i} />)
            : error
            ? (
              <div className={styles.empty}>
                <PremiumIcon icon={WifiOff} color="slate" size={32} />
                <p>News is temporarily unavailable. Check back soon!</p>
              </div>
            )
            : articles.length === 0
            ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Leaf} color="emerald" size={32} />
                <p>No stories found. Try refreshing later.</p>
              </div>
            )
            : articles.slice(0, 4).map((a, i) => (
              <NewsCard key={i} article={a} onClick={setSelected} />
            ))
          }
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <NewsModal article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

export default function NewsBoard({ layout }) {
  return (
    <ErrorBoundary fullPage={false} message="News board couldn't load, but the rest of your dashboard is working fine.">
      <NewsBoardInner layout={layout} />
    </ErrorBoundary>
  );
}

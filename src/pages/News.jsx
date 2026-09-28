// src/pages/News.jsx
// "The Green Times" — endless edition. Pages pull from the rotating topic pool
// with an IntersectionObserver sentinel, so the feed keeps coming as you read.

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { loadMoreNews, subscribeNewsPool, getPool, hasMoreNews } from '../services/newsService';
import NewsModal from '../components/news/NewsModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ArrowLeft, WifiOff, Leaf, LoaderCircle, RefreshCw, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './News.module.css';

function NewsInner() {
  const [articles, setArticles] = useState(getPool());
  const [loading, setLoading] = useState(getPool().length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [more, setMore] = useState(hasMoreNews());
  const [selected, setSelected] = useState(null);
  const sentinelRef = useRef(null);
  const navigate = useNavigate();

  const loadNext = useCallback(async () => {
    setLoadingMore((busy) => {
      if (busy || !hasMoreNews()) return busy;
      (async () => {
        try {
          const result = await loadMoreNews();
          setArticles(result.articles);
          setMore(result.hasMore);
          setError(null);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoadingMore(false);
          setLoading(false);
        }
      })();
      return true;
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeNewsPool(setArticles);
    if (getPool().length === 0) loadNext();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: approaching the bottom pulls the next topic slice.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNext();
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadNext]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <header className={styles.header}>
        <h1 className={styles.title}>The Green Times</h1>
        <div className={styles.date}>{today} &bull; Endless Edition</div>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading latest stories…</div>
      ) : error && articles.length === 0 ? (
        <div className={styles.loading}>
          <WifiOff size={32} style={{ margin: '0 auto', marginBottom: '1rem', color: 'var(--color-text-secondary)' }} />
          News is temporarily unavailable — check back soon.
        </div>
      ) : articles.length === 0 ? (
        <div className={styles.loading}>
          <Leaf size={32} style={{ margin: '0 auto', marginBottom: '1rem', color: 'var(--color-text-tertiary)' }} />
          No stories found yet.
        </div>
      ) : (
        <div className={styles.grid}>
          {articles.map((article, i) => {
            const isFeatured = i === 0;
            return (
              <article
                key={`${article.url}-${i}`}
                className={`${styles.card} ${isFeatured ? styles.featuredCard : ''}`}
                onClick={() => setSelected(article)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(article)}
              >
                {article.image && (
                  <div className={isFeatured ? styles.featuredImgWrapper : styles.imgWrapper}>
                    <img src={article.image} alt={article.title} className={styles.img} loading="lazy" />
                  </div>
                )}
                <div className={isFeatured ? styles.featuredBody : ''}>
                  <span className={styles.source}>{article.source?.name || 'Eco News'}</span>
                  <h2 className={`${styles.headline} ${isFeatured ? styles.featuredHeadline : ''}`}>
                    {article.title}
                  </h2>
                  <p className={styles.snippet}>{article.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Sentinel — auto-loads more as you approach the bottom */}
      <div ref={sentinelRef} className={styles.sentinel}>
        {loadingMore && (
          <span className={styles.loadingMore}>
            <LoaderCircle size={18} className={styles.spin} /> Fetching more stories…
          </span>
        )}
        {!loadingMore && more && articles.length > 0 && (
          <button className={styles.loadMoreBtn} onClick={loadNext}>
            <RefreshCw size={16} /> Load more stories
          </button>
        )}
        {!more && articles.length > 0 && (
          <p className={styles.endNote}><Globe size={14} style={{ verticalAlign: '-2px' }} /> You're all caught up on the planet.</p>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <NewsModal article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function News() {
  return (
    <ErrorBoundary>
      <NewsInner />
    </ErrorBoundary>
  );
}

// src/components/ads/AdBanner.jsx
// Banner ad slot with a tasteful placeholder while no network code is pasted.
// Injects provider snippets (Adsterra / AdSense / raw HTML) and re-executes
// their <script> tags, which innerHTML alone would leave inert.

import { useEffect, useRef } from 'react';
import { NEWS_READER_ADS, AD_LABEL } from '../../config/ads';
import styles from './AdBanner.module.css';

function runScripts(container) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach((old) => {
    const fresh = document.createElement('script');
    [...old.attributes].forEach((attr) => fresh.setAttribute(attr.name, attr.value));
    fresh.text = old.text;
    old.parentNode.replaceChild(fresh, old);
  });
}

export default function AdBanner({ slot = 'top', className = '' }) {
  const code = NEWS_READER_ADS[slot] || '';
  const ref = useRef(null);

  useEffect(() => {
    if (code && ref.current) {
      ref.current.innerHTML = code;
      try {
        runScripts(ref.current);
      } catch (err) {
        console.warn('[AdBanner] script injection failed:', err);
      }
    }
  }, [code]);

  return (
    <div className={`${styles.wrap} ${className}`} data-ad-slot={slot}>
      <span className={styles.label}>{AD_LABEL}</span>
      {code ? (
        <div ref={ref} className={styles.inner} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <span className={styles.size}>728 × 90</span>
          <span className={styles.hintText}>Banner ad space — configured in src/config/ads.js</span>
        </div>
      )}
    </div>
  );
}

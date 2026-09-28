// src/components/hero/EcoHeroStatic.jsx
// WebGL-free Earth fallback: the real Blue Marble texture carried by CSS —
// sphere shading, terminator, atmosphere glow — plus a slow horizon scroll.
// Used on mobile, reduced-motion devices and as the 3D scene's Suspense face.
import styles from './EcoHeroStatic.module.css';

export default function EcoHeroStatic() {
  return (
    <div className={styles.hero} aria-hidden="true">
      <div className={styles.stars} />
      <div className={styles.scene}>
        <div className={styles.globe}>
          <div className={styles.surface} />
          <div className={styles.clouds} />
          <div className={styles.shade} />
          <div className={styles.atmoGlow} />
        </div>
        <span className={`${styles.drift} ${styles.driftA}`} />
        <span className={`${styles.drift} ${styles.driftB}`} />
        <span className={`${styles.drift} ${styles.driftC}`} />
      </div>
    </div>
  );
}

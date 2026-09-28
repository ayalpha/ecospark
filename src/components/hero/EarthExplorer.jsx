// src/components/hero/EarthExplorer.jsx
// Fullscreen interactive globe. Opens by growing the small hero Earth into a
// big one (in-scene scale + camera dolly), then hands control to the cursor:
// drag to spin, scroll to zoom. Esc or ✕ returns to the dashboard.

import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { X, Crosshair, MousePointer2 } from 'lucide-react';
import Earth from './Earth';
import styles from './EarthExplorer.module.css';

// Note: the entry "grow" is done by scaling the Earth group itself (see
// Earth's scaleIn). The camera stays fixed so OrbitControls' internal state
// and any camera animation never fight each other.

// Smoothly swings the camera back to the default India-facing framing.
function FocusReset() {
  const { camera, controls } = useThree();
  const anim = useRef(null);
  const HOME = new THREE.Vector3(0, 0, 4.3);

  useEffect(() => {
    const handler = () => {
      anim.current = { from: camera.position.clone(), t: 0 };
    };
    window.addEventListener('ecospark:focus-india', handler);
    return () => window.removeEventListener('ecospark:focus-india', handler);
  }, [camera]);

  useFrame((_, delta) => {
    if (anim.current && controls) {
      const a = anim.current;
      a.t = Math.min(a.t + delta / 0.9, 1);
      const p = 1 - Math.pow(1 - a.t, 3);
      camera.position.lerpVectors(a.from, HOME, p);
      controls.target.set(0, 0, 0);
      if (a.t >= 1) anim.current = null;
    }
  });
  return null;
}

export default function EarthExplorer({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      className={styles.overlay}
      initial={false}
      exit={{ opacity: 0 }}
    >
      {/* CSS-driven entrance (wall-clock, immune to rAF throttling); framer
          handles only the exit fade via AnimatePresence. */}
      <div className={styles.stage}>
        <Canvas
          camera={{ position: [0, 0, 4.3], fov: 45 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.75) : 1}
        >
          <color attach="background" args={['#04070b']} />
          <Stars radius={110} depth={45} count={3200} factor={3.4} saturation={0} fade speed={0.4} />
          <Earth cinematic={false} scaleIn />
          <FocusReset />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.55}
            zoomSpeed={0.7}
            minDistance={2.4}
            maxDistance={8}
          />
          <EffectComposer>
            <Bloom
              intensity={0.5}
              luminanceThreshold={0.55}
              luminanceSmoothing={0.75}
              blendFunction={BlendFunction.ADD}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Chrome */}
      <button
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close globe explorer"
      >
        <X size={20} />
      </button>

      <div className={styles.hint}>
        <MousePointer2 size={14} /> Drag to spin
        <span className={styles.hintDot} />
        Scroll to zoom
      </div>

      <button
        className={styles.focusBtn}
        onClick={() => window.dispatchEvent(new Event('ecospark:focus-india'))}
      >
        <Crosshair size={15} /> Focus India
      </button>
    </motion.div>
  );
}

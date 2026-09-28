// src/components/hero/EcoHero3D.jsx
// Cinematic homepage Earth: wanders the globe and always finds its way back to
// India. An "Interact" button grows the small Earth into a fullscreen draggable
// globe (EarthExplorer). The canvas renders opaque deep-space so the hero card
// reads as one seamless window — no compositing flicker, no inner-box seam.
//
// WebGL contexts are a scarce browser resource (Chrome caps active contexts
// and silently returns null / evicts others under pressure — frequent during
// HMR and fast route churn). A failed context used to bubble up as
// "Cannot read properties of null (reading 'alpha')" and replace the whole
// page with an error card. CanvasRecovery now contains it: it remounts the
// canvas twice, and if the GPU still won't serve a context it falls back to a
// static poster instead of an error.

import { Component, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { AnimatePresence } from 'framer-motion';
import { Orbit } from 'lucide-react';
import Earth from './Earth';
import EarthExplorer from './EarthExplorer';
import styles from './EcoHero3D.module.css';

function Rig() {
  return null; // reserved: explorer owns camera motion; hero stays steady
}

function HeroCanvas({ exploring, onContextLost }) {
  const glRef = useRef(null);
  // Free the WebGL context slot when the hero unmounts — otherwise route
  // churn slowly exhausts the browser's context budget until getContext
  // starts returning null for every new canvas.
  useEffect(() => () => { glRef.current?.forceContextLoss?.(); }, []);

  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
      camera={{ position: [0, 0, 4.15], fov: 44 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.75) : 1}
      frameloop={exploring ? 'never' : 'always'}
      onCreated={({ gl }) => {
        glRef.current = gl;
        // A lost context mid-session is recoverable: swallow the default
        // "canvas lost" handling and rebuild the whole scene once.
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onContextLost?.();
        }, { once: true });
      }}
    >
      {/* Opaque deep-space backdrop: no transparent-canvas compositing, so
          hover can no longer trigger backdrop-invalidation flicker, and the
          card interior reads as one continuous window instead of a box-in-box. */}
      <color attach="background" args={['#04070b']} />
      <Stars radius={90} depth={40} count={2600} factor={3.2} saturation={0} fade speed={0.4} />
      <Earth cinematic />
      <Rig />
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
  );
}

const MAX_ATTEMPTS = 3;

/** Swallows errors from the fullscreen explorer: worst case the explorer
    simply fails to open — never a crashed page. */
class QuietBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Contains canvas failures and retries with a fresh context; degrades to a
    static poster after MAX_ATTEMPTS instead of surfacing an error card. */
class CanvasRecovery extends Component {
  constructor(props) {
    super(props);
    this.state = { attempt: 0, failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    const { attempt } = this.state;
    if (attempt + 1 < MAX_ATTEMPTS) {
      // Give the browser a beat to reclaim the dead context, then rebuild.
      setTimeout(() => this.setState((s) => ({ attempt: s.attempt + 1, failed: false })), 900);
    }
  }
  render() {
    const { attempt, failed } = this.state;
    if (failed || attempt >= MAX_ATTEMPTS) {
      if (attempt + 1 < MAX_ATTEMPTS) return null; // mid-retry: brief blank
      return (
        <div
          aria-label="Earth"
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(120% 90% at 65% 40%, rgba(45,212,167,0.16), transparent 55%), url(/textures/earth-day.jpg) center / cover no-repeat #04070b',
          }}
        />
      );
    }
    // key forces a genuinely fresh canvas + context per attempt
    return <div key={attempt} style={{ position: 'absolute', inset: 0 }}>{this.props.render(attempt)}</div>;
  }
}

export default function EcoHero3D() {
  const [exploring, setExploring] = useState(false);
  const [recoveryTick, setRecoveryTick] = useState(0);
  // Bump the recovery generation on a mid-session context loss so the whole
  // boundary remounts (CanvasRecovery's own state is preserved across keys).
  const bust = () => setRecoveryTick((t) => t + 1);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <CanvasRecovery
        render={(attempt) => (
          <HeroCanvas
            key={`${recoveryTick}-${attempt}`}
            exploring={exploring}
            onContextLost={bust}
          />
        )}
      />

      {/* Interact trigger */}
      <button
        className={styles.interactBtn}
        onClick={() => setExploring(true)}
        aria-label="Open interactive globe"
      >
        <Orbit size={15} />
        Interact
      </button>

      <AnimatePresence>
        {exploring && (
          <QuietBoundary key="explorer">
            <EarthExplorer onClose={() => setExploring(false)} />
          </QuietBoundary>
        )}
      </AnimatePresence>
    </div>
  );
}

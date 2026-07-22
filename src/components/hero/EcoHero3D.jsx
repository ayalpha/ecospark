// src/components/hero/EcoHero3D.jsx
// Lazy-loaded WebGL hero using react-three-fiber
// Only rendered on capable devices (deviceMemory >= 4 OR hardwareConcurrency >= 4)

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Stars, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

function EcoOrb() {
  const meshRef = useRef();
  const cloudsRef = useRef();

  // Load textures
  const [colorMap, normalMap, specularMap, cloudsMap] = useTexture([
    '/textures/earth_color.jpg',
    '/textures/earth_normal.jpg',
    '/textures/earth_specular.jpg',
    '/textures/earth_clouds.png'
  ]);

  const earthGeometry = useMemo(() => new THREE.SphereGeometry(1.4, 64, 64), []);
  const cloudsGeometry = useMemo(() => new THREE.SphereGeometry(1.42, 64, 64), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!meshRef.current) return;

    // Extremely simple, bulletproof linear rotation. No complex math.
    meshRef.current.rotation.y = t * 0.1;
    
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = t * 0.12;
    }
  });

  return (
    <group scale={1.4}>
      <mesh ref={meshRef} geometry={earthGeometry} castShadow receiveShadow>
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          specular={new THREE.Color('grey')}
          shininess={15}
        />
      </mesh>
      
      <mesh ref={cloudsRef} geometry={cloudsGeometry}>
        <meshPhongMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function EcoHero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#66BB6A" />
      <pointLight position={[-5, -3, -5]} intensity={0.8} color="#00897B" />
      <pointLight position={[0, 8, 0]} intensity={0.6} color="#ffffff" />

      {/* Stars background */}
      <Stars radius={80} depth={30} count={800} factor={2} saturation={0.3} fade speed={0.5} />

      {/* Main eco orb */}
      <EcoOrb />



      {/* Environment for PBR reflections */}
      <Environment preset="forest" />

      {/* Post-processing: bloom for glow effect */}
      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0005, 0.0005]}
        />
      </EffectComposer>
    </Canvas>
  );
}

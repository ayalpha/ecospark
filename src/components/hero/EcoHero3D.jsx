// src/components/hero/EcoHero3D.jsx
// Lazy-loaded WebGL hero using react-three-fiber
// Only rendered on capable devices (deviceMemory >= 4 OR hardwareConcurrency >= 4)

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Stars, Text3D, Center } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

function EcoOrb() {
  const meshRef = useRef();
  const glowRef = useRef();

  // Create procedural low-poly geo
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.2, 2);
    // Slightly displace vertices for organic look
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = (Math.random() - 0.5) * 0.08;
      positions.setXYZ(i, x + noise, y + noise, z + noise);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#2E7D32'),
        roughness: 0.35,
        metalness: 0.15,
        emissive: new THREE.Color('#1a4a1a'),
        emissiveIntensity: 0.3,
      }),
    []
  );

  // Inner glow sphere
  const glowGeo = useMemo(() => new THREE.SphereGeometry(1.0, 32, 32), []);
  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#66BB6A'),
        emissive: new THREE.Color('#4CAF50'),
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.15,
      }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.002;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.6}>
      <group>
        <mesh ref={meshRef} geometry={geometry} material={material} castShadow />
        <mesh ref={glowRef} geometry={glowGeo} material={glowMat} />
      </group>
    </Float>
  );
}

function OrbitRing({ radius, speed, color, opacity = 0.4 }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.z += speed;
  });
  const geo = useMemo(() => new THREE.TorusGeometry(radius, 0.02, 8, 80), [radius]);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
      }),
    [color, opacity]
  );
  return <mesh ref={ref} geometry={geo} material={mat} rotation={[Math.PI / 2, 0, 0]} />;
}

function FloatingParticle({ position, emoji = '🌿' }) {
  const ref = useRef();
  const speed = useMemo(() => 0.5 + Math.random() * 0.5, []);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.15;
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={new THREE.Color('#4CAF50')}
          emissive={new THREE.Color('#2E7D32')}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

export default function EcoHero3D() {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 2.2 + Math.random() * 0.5;
      return [Math.cos(angle) * radius, (Math.random() - 0.5) * 1.5, Math.sin(angle) * radius];
    });
  }, []);

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

      {/* Orbit rings */}
      <OrbitRing radius={2.0} speed={0.004} color="#4CAF50" opacity={0.35} />
      <OrbitRing radius={2.6} speed={-0.003} color="#26A69A" opacity={0.25} />
      <OrbitRing radius={3.2} speed={0.002} color="#2E7D32" opacity={0.15} />

      {/* Floating particles */}
      {particles.map((pos, i) => (
        <FloatingParticle key={i} position={pos} />
      ))}

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

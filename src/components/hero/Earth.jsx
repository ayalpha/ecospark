// src/components/hero/Earth.jsx
// The planet itself — shared by the cinematic homepage hero and the fullscreen
// interactive explorer. Custom day/night shader, sun-lit clouds, ocean glint,
// atmosphere. In cinematic mode it eases between showcase viewpoints and always
// finds its way back to India.

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const SUN_DIRECTION = new THREE.Vector3(-2.2, 0.6, 1.4).normalize();
const CLOUD_DRIFT = 0.012; // rad/s — clouds never stop moving

// ── Adaptive texture quality ────────────────────────────────────────────────
// 8K (8192×4096) is the highest single-file Earth day/night map that exists
// (NASA's larger sources ship only as tiles). Weak hardware gets the lighter
// 4K set; capable machines load the 8K maps. Guarded by the GPU's real
// MAX_TEXTURE_SIZE so no device ever attempts a texture it cannot hold.
function maxTextureSize() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 4096;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return max || 4096;
  } catch {
    return 4096;
  }
}

const GPU_MAX_TEX = typeof window !== 'undefined' ? maxTextureSize() : 8192;
const CAN_8K = GPU_MAX_TEX >= 8192;
function detectTier() {
  try {
    const mem = navigator.deviceMemory; // GB RAM, Chromium only
    const cores = navigator.hardwareConcurrency || 8;
    if ((mem !== undefined && mem < 4) || cores < 4) return 'low';
  } catch { /* assume capable */ }
  return CAN_8K ? 'high' : 'low';
}
const QUALITY = typeof window !== 'undefined' ? detectTier() : 'high';

const TEX = {
  day: QUALITY === 'high' ? '/textures/earth-day-8k.jpg' : '/textures/earth-day.jpg',
  night: QUALITY === 'high' ? '/textures/earth-night-8k.jpg' : '/textures/earth-night.jpg',
  water: '/textures/earth-water.png',
  clouds: '/textures/earth-clouds.jpg',
};

const DEG = Math.PI / 180;

// ── Shaders ─────────────────────────────────────────────────────────────────

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const earthFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D waterMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 sun = normalize(sunDir);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    float sunDot = dot(n, sun);
    float dayMix = smoothstep(-0.15, 0.25, sunDot);

    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;

    vec3 color = mix(night * vec3(1.7, 1.5, 1.15), day * (0.16 + 1.05 * max(sunDot, 0.0)), dayMix);

    float waterMask = texture2D(waterMap, vUv).r;
    vec3 halfVec = normalize(sun + viewDir);
    float spec = pow(max(dot(n, halfVec), 0.0), 110.0) * waterMask * dayMix;
    color += vec3(0.85, 0.92, 1.0) * spec * 0.55;

    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.6);
    color += vec3(0.28, 0.52, 1.0) * fresnel * (0.28 + 0.62 * dayMix);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const cloudsFragment = /* glsl */ `
  uniform sampler2D cloudsMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    float lum = dot(texture2D(cloudsMap, vUv).rgb, vec3(0.299, 0.587, 0.114));
    float alpha = smoothstep(0.30, 0.80, lum) * 0.75;
    float light = smoothstep(-0.12, 0.35, dot(normalize(vWorldNormal), normalize(sunDir)));
    vec3 color = vec3(1.0) * (0.05 + 0.95 * light);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const atmosphereVertex = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vWorldNormal;
  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 sunDir;
  varying vec3 vViewNormal;
  varying vec3 vWorldNormal;
  void main() {
    float rim = pow(clamp(-dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)) * 2.15, 0.0, 1.0), 1.8);
    float lit = smoothstep(-0.45, 0.55, dot(normalize(vWorldNormal), normalize(sunDir)));
    vec3 color = mix(vec3(0.10, 0.22, 0.55), vec3(0.40, 0.64, 1.0), lit);
    gl_FragColor = vec4(color, rim * (0.28 + 0.55 * lit));
  }
`;

// ── Viewpoint math ──────────────────────────────────────────────────────────
// three's SphereGeometry lays an equirectangular texture at
//   u = (lon + 180) / 360,  v = (90 - lat) / 180
// so we can build a quaternion that brings any lat/lon to face the camera.

function latLonToVec(lat, lon) {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta)
  );
}

function quatToFace(lat, lon) {
  const v = latLonToVec(lat, lon).normalize();
  const yaw = Math.atan2(v.x, v.z);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
  const v1 = v.clone().applyQuaternion(qYaw);
  const pitch = Math.atan2(v1.y, v1.z);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  return qPitch.multiply(qYaw);
}

export const INDIA_VIEW = { lat: 21.5, lon: 78.5 };
export const indiaQuaternion = () => quatToFace(INDIA_VIEW.lat, INDIA_VIEW.lon);

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── The planet ──────────────────────────────────────────────────────────────

export default function Earth({ cinematic = false, scaleIn = false }) {
  const earthRef = useRef();
  const cloudsRef = useRef();
  const groupRef = useRef();

  const [dayMap, nightMap, waterMap, cloudsMap] = useTexture([
    TEX.day,
    TEX.night,
    TEX.water,
    TEX.clouds,
  ]);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    [dayMap, nightMap, waterMap, cloudsMap].forEach((t) => {
      t.anisotropy = 16;
      t.wrapS = THREE.RepeatWrapping;
    });
  }, [dayMap, nightMap, waterMap, cloudsMap]);

  const earthUniforms = useMemo(() => ({
    dayMap: { value: dayMap },
    nightMap: { value: nightMap },
    waterMap: { value: waterMap },
    sunDir: { value: SUN_DIRECTION },
  }), [dayMap, nightMap, waterMap]);

  const cloudsUniforms = useMemo(() => ({
    cloudsMap: { value: cloudsMap },
    sunDir: { value: SUN_DIRECTION },
  }), [cloudsMap]);

  const atmosphereUniforms = useMemo(() => ({
    sunDir: { value: SUN_DIRECTION },
  }), []);

  // ── Cinematic showcase: India → wander → India, forever ───────────────────
  const queue = useMemo(() => {
    const randoms = [];
    for (let i = 0; i < 3; i++) {
      // Wide longitude sweeps, latitude kept in the visually pleasing band.
      randoms.push(quatToFace(-32 + Math.random() * 72, -180 + Math.random() * 360));
    }
    return [indiaQuaternion(), ...randoms];
  }, []);

  const anim = useRef({
    index: 0,
    phase: 'move',
    t: 0,
    moveDur: 2.8,
    dwellDur: 3.4,
    // Cinematic entrance: sweep in from a yaw offset and settle on India.
    qFrom: new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), -1.1)
      .multiply(indiaQuaternion()),
    qTo: queue[0].clone(),
  });

  // Entry animation for the explorer (small Earth grows into place).
  const entry = useRef({ start: null });

  // Initial orientation is applied ONCE — passing it as a JSX prop would
  // re-snap the mesh to India on every parent re-render and cancel the
  // cinematic wander mid-flight.
  useEffect(() => {
    earthRef.current?.quaternion.copy(cinematic ? anim.current.qFrom : indiaQuaternion());
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const now = state.clock.elapsedTime;

    if (cinematic && earthRef.current) {
      const a = anim.current;
      a.t += d;

      if (a.phase === 'move') {
        const p = easeInOutCubic(Math.min(a.t / a.moveDur, 1));
        earthRef.current.quaternion.slerpQuaternions(a.qFrom, a.qTo, p);
        if (a.t >= a.moveDur) {
          a.phase = 'dwell';
          a.t = 0;
        }
      } else if (a.t >= a.dwellDur) {
        // Dwell over — head to the next viewpoint. After the random wander
        // stops, the next entry is always India again.
        a.index = (a.index + 1) % queue.length;
        a.qFrom.copy(earthRef.current.quaternion);
        a.qTo.copy(queue[a.index]);
        a.moveDur = a.index === 0 ? 3.2 : 2.4 + Math.random() * 0.8;
        a.dwellDur = a.index === 0 ? 4.2 : 2.6 + Math.random() * 1.4;
        a.phase = 'move';
        a.t = 0;
      }
    } else if (earthRef.current && !cinematic) {
      // Explorer: hold on India; OrbitControls handles the touring.
      earthRef.current.quaternion.slerp(indiaQuaternion(), 0.08);
    }

    if (cloudsRef.current) cloudsRef.current.rotation.y += CLOUD_DRIFT * d * 8;

    // Explorer growth: the small Earth becomes the big Earth.
    if (scaleIn && groupRef.current) {
      if (entry.current.start === null) entry.current.start = now;
      const p = Math.min((now - entry.current.start) / 1.15, 1);
      const s = 0.28 + (1 - 0.28) * easeOutBack(p);
      groupRef.current.scale.setScalar(Math.max(s, 0.001));
    }
  });

  return (
    <group ref={groupRef}>
      {/* Solid planet */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.32, 96, 96]} />
        <shaderMaterial
          vertexShader={earthVertex}
          fragmentShader={earthFragment}
          uniforms={earthUniforms}
        />
      </mesh>

      {/* Cloud shell — derived alpha, independently drifting */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.335, 96, 96]} />
        <shaderMaterial
          vertexShader={earthVertex}
          fragmentShader={cloudsFragment}
          uniforms={cloudsUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Atmosphere halo */}
      <mesh scale={1.10}>
        <sphereGeometry args={[1.32, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={atmosphereUniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

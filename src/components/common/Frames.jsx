import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// ECOSPARK AVATAR FRAMES — Ultra Premium Edition
// All frames are pure inline SVG with embedded CSS animations.
// Tiers: Bronze → Silver → Gold → Platinum → Supreme God → Gaia Crown → Supernova
// ═══════════════════════════════════════════════════════════════════════════════

const SharedDefs = () => (
  <defs>
    {/* ── Metallic Gradients ──────────────────────────────────────────────── */}
    <linearGradient id="bronze-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#E8B887" />
      <stop offset="25%" stopColor="#CD7F32" />
      <stop offset="50%" stopColor="#E8C888" />
      <stop offset="75%" stopColor="#CD7F32" />
      <stop offset="100%" stopColor="#8C5A1A" />
    </linearGradient>

    <linearGradient id="silver-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="25%" stopColor="#C0C0C0" />
      <stop offset="50%" stopColor="#F0F0F0" />
      <stop offset="75%" stopColor="#A8A8A8" />
      <stop offset="100%" stopColor="#808080" />
    </linearGradient>

    <linearGradient id="gold-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFF7CC" />
      <stop offset="20%" stopColor="#FFD700" />
      <stop offset="40%" stopColor="#FFF4A3" />
      <stop offset="60%" stopColor="#DAA520" />
      <stop offset="80%" stopColor="#FFD700" />
      <stop offset="100%" stopColor="#B8860B" />
    </linearGradient>

    <linearGradient id="platinum-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="20%" stopColor="#E8E4F0" />
      <stop offset="40%" stopColor="#A78BFA" />
      <stop offset="60%" stopColor="#DDD6FE" />
      <stop offset="80%" stopColor="#7C3AED" />
      <stop offset="100%" stopColor="#4C1D95" />
    </linearGradient>

    {/* Gaia Crown Gradients */}
    <linearGradient id="gaia-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#34D399" />
      <stop offset="30%" stopColor="#059669" />
      <stop offset="60%" stopColor="#F59E0B" />
      <stop offset="100%" stopColor="#047857" />
    </linearGradient>
    <radialGradient id="gaia-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#34D399" stopOpacity="0.6" />
      <stop offset="50%" stopColor="#059669" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#047857" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="gaia-gold-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
      <stop offset="50%" stopColor="#FDE047" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
    </linearGradient>

    {/* Supernova Gradients */}
    <linearGradient id="supernova-core" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#06B6D4" />
      <stop offset="25%" stopColor="#8B5CF6" />
      <stop offset="50%" stopColor="#EC4899" />
      <stop offset="75%" stopColor="#3B82F6" />
      <stop offset="100%" stopColor="#06B6D4" />
    </linearGradient>
    <radialGradient id="supernova-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#C084FC" stopOpacity="0.5" />
      <stop offset="40%" stopColor="#7C3AED" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
    </radialGradient>

    {/* God Frame Gradients */}
    <radialGradient id="god-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="40%" stopColor="#FDE047" />
      <stop offset="80%" stopColor="#B45309" />
      <stop offset="100%" stopColor="#000000" />
    </radialGradient>
    <radialGradient id="god-flare" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="30%" stopColor="#FACC15" />
      <stop offset="100%" stopColor="transparent" />
    </radialGradient>

    {/* ── Glow Filters ────────────────────────────────────────────────────── */}
    <filter id="glow-sm" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-md" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-lg" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-xl" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-cosmic" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Center Hole Mask */}
    <mask id="center-hole">
      <rect x="-100" y="-100" width="300" height="300" fill="white" />
      <circle cx="50" cy="50" r="38" fill="black" />
    </mask>
  </defs>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥉 BRONZE FRAME — Nature's Embrace
// ═══════════════════════════════════════════════════════════════════════════════
export const BronzeFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes bronze-shimmer { 
        0%, 100% { opacity: 0.3; } 
        50% { opacity: 0.8; } 
      }
      .bronze-shine { animation: bronze-shimmer 4s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Base Ring with metallic gradient */}
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#bronze-metallic)" strokeWidth="7" filter="url(#glow-sm)" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#8C501A" strokeWidth="0.8" opacity="0.6" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#E8B887" strokeWidth="0.5" opacity="0.4" />

      {/* Decorative vines */}
      <path d="M 10 50 Q 20 20 50 10" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeDasharray="5,2" opacity="0.9" />
      <path d="M 90 50 Q 80 80 50 90" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeDasharray="5,2" opacity="0.9" />

      {/* Leaves */}
      <path d="M 15 35 Q 10 25 20 20 Q 25 30 15 35 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />
      <path d="M 28 18 Q 30 5 40 10 Q 35 18 28 18 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />
      <path d="M 85 65 Q 90 75 80 80 Q 75 70 85 65 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />
      <path d="M 72 82 Q 70 95 60 90 Q 65 82 72 82 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />

      {/* Shimmer highlight */}
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FEF08A" strokeWidth="1" opacity="0.2" className="bronze-shine" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥈 SILVER FRAME — Precision Engineering
// ═══════════════════════════════════════════════════════════════════════════════
export const SilverFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes silver-pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
      @keyframes silver-rotate {
        100% { transform: rotate(360deg); }
      }
      .silver-glow { animation: silver-pulse 3s ease-in-out infinite; }
      .silver-spin { transform-origin: 50px 50px; animation: silver-rotate 30s linear infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Base Rings */}
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#silver-metallic)" strokeWidth="8" filter="url(#glow-sm)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7" />

      {/* Rotating accent ring */}
      <g className="silver-spin">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="2,8" />
      </g>

      {/* Corner bolts */}
      {[
        [15, 50], [85, 50], [50, 15], [50, 85],
        [25, 25], [75, 25], [25, 75], [75, 75]
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i < 4 ? 2.5 : 1.5} fill={i < 4 ? '#FFFFFF' : '#9CA3AF'} className="silver-glow" />
      ))}

      {/* Elegant Arrow Accents */}
      <path d="M 50 5 L 53 11 L 47 11 Z" fill="url(#silver-metallic)" />
      <path d="M 50 95 L 53 89 L 47 89 Z" fill="url(#silver-metallic)" />
      <path d="M 5 50 L 11 47 L 11 53 Z" fill="url(#silver-metallic)" />
      <path d="M 95 50 L 89 47 L 89 53 Z" fill="url(#silver-metallic)" />

      {/* Inner shimmer */}
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.15" className="silver-glow" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥇 GOLD FRAME — Royal Laurels
// ═══════════════════════════════════════════════════════════════════════════════
export const GoldFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes gold-sparkle {
        0%, 100% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes gold-breathe {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      .gold-spark-1 { transform-origin: center; animation: gold-sparkle 2.5s ease-in-out infinite; }
      .gold-spark-2 { transform-origin: center; animation: gold-sparkle 2.5s ease-in-out infinite 0.8s; }
      .gold-spark-3 { transform-origin: center; animation: gold-sparkle 2.5s ease-in-out infinite 1.6s; }
      .gold-aura { animation: gold-breathe 3s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Outer border rings */}
      <circle cx="50" cy="50" r="43" fill="none" stroke="#78350F" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#78350F" strokeWidth="1.5" opacity="0.5" />
      {/* Core metallic ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gold-metallic)" strokeWidth="7" filter="url(#glow-md)" />
      {/* Breathing glow ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.3" filter="url(#glow-md)" className="gold-aura" />

      {/* Golden Laurel Wreaths */}
      <g fill="#FBBF24" stroke="#B45309" strokeWidth="0.5">
        <path d="M 50 92 Q 25 90 10 60 Q 20 70 30 80 Q 40 85 50 88 Z" />
        <path d="M 12 60 Q 8 45 15 30 Q 18 45 15 55 Z" />
        <path d="M 50 92 Q 75 90 90 60 Q 80 70 70 80 Q 60 85 50 88 Z" />
        <path d="M 88 60 Q 92 45 85 30 Q 82 45 85 55 Z" />
      </g>

      {/* Animated sparkles */}
      <path d="M 50 0 L 52 8 L 60 10 L 52 12 L 50 20 L 48 12 L 40 10 L 48 8 Z" fill="#FEF08A" filter="url(#glow-md)" className="gold-spark-1" />
      <path d="M 20 15 L 21 20 L 26 21 L 21 22 L 20 27 L 19 22 L 14 21 L 19 20 Z" fill="#FEF08A" className="gold-spark-2" />
      <path d="M 80 15 L 81 20 L 86 21 L 81 22 L 80 27 L 79 22 L 74 21 L 79 20 Z" fill="#FEF08A" className="gold-spark-3" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 PLATINUM FRAME — Crystal Geometry
// ═══════════════════════════════════════════════════════════════════════════════
export const PlatinumFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes plat-rotate { 100% { transform: rotate(360deg); } }
      @keyframes plat-rotate-rev { 100% { transform: rotate(-360deg); } }
      @keyframes plat-shimmer {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.9; }
      }
      .plat-outer { transform-origin: 50px 50px; animation: plat-rotate 25s linear infinite; }
      .plat-inner { transform-origin: 50px 50px; animation: plat-rotate-rev 18s linear infinite; }
      .plat-twinkle-1 { animation: plat-shimmer 2s ease-in-out infinite; }
      .plat-twinkle-2 { animation: plat-shimmer 2s ease-in-out infinite 0.7s; }
      .plat-twinkle-3 { animation: plat-shimmer 2s ease-in-out infinite 1.4s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Base Glowing Ring */}
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#platinum-metallic)" strokeWidth="8" filter="url(#glow-lg)" />

      {/* Rotating outer geometry */}
      <g className="plat-outer">
        <path d="M 50 8 L 82 22 L 92 50 L 82 78 L 50 92 L 18 78 L 8 50 L 18 22 Z" fill="none" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />
      </g>

      {/* Rotating inner geometry (counter-spin) */}
      <g className="plat-inner">
        <path d="M 50 14 L 76 25 L 86 50 L 76 75 L 50 86 L 24 75 L 14 50 L 24 25 Z" fill="none" stroke="#818CF8" strokeWidth="0.8" opacity="0.6" />
      </g>

      {/* Big Diamonds at cardinal points */}
      <g id="plat-diamond" transform="translate(50, 5) scale(1)">
        <polygon points="0,-8 6,0 0,10 -6,0" fill="url(#platinum-metallic)" stroke="#FFFFFF" strokeWidth="0.8" />
        <polygon points="0,-8 3,0 0,10 -3,0" fill="#E0E7FF" opacity="0.5" />
      </g>
      <use href="#plat-diamond" transform="rotate(90 50 50)" />
      <use href="#plat-diamond" transform="rotate(180 50 50)" />
      <use href="#plat-diamond" transform="rotate(270 50 50)" />

      {/* Animated Sparkles */}
      <path d="M 22 22 L 23 27 L 28 28 L 23 29 L 22 34 L 21 29 L 16 28 L 21 27 Z" fill="#FFFFFF" filter="url(#glow-lg)" className="plat-twinkle-1" />
      <path d="M 78 22 L 79 27 L 84 28 L 79 29 L 78 34 L 77 29 L 72 28 L 77 27 Z" fill="#FFFFFF" filter="url(#glow-lg)" className="plat-twinkle-2" />
      <path d="M 22 78 L 23 83 L 28 84 L 23 85 L 22 90 L 21 85 L 16 84 L 21 83 Z" fill="#FFFFFF" className="plat-twinkle-3" />
      <path d="M 78 78 L 79 83 L 84 84 L 79 85 L 78 90 L 77 85 L 72 84 L 77 83 Z" fill="#FFFFFF" className="plat-twinkle-1" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👑 SUPREME GOD FRAME — Celestial Apex (Upgraded)
// ═══════════════════════════════════════════════════════════════════════════════
export const GodFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes god-spin { 100% { transform: rotate(360deg); } }
      @keyframes god-spin-rev { 100% { transform: rotate(-360deg); } }
      @keyframes god-pulse { 
        0%, 100% { opacity: 0.6; transform: scale(1); } 
        50% { opacity: 1; transform: scale(1.06); } 
      }
      @keyframes god-float { 
        0%, 100% { transform: translateY(0px); } 
        50% { transform: translateY(-5px); } 
      }
      @keyframes god-ray {
        0%, 100% { opacity: 0.1; }
        50% { opacity: 0.5; }
      }
      .god-outer { transform-origin: 50px 50px; animation: god-spin 20s linear infinite; }
      .god-inner { transform-origin: 50px 50px; animation: god-spin-rev 14s linear infinite; }
      .god-pulse { transform-origin: 50px 50px; animation: god-pulse 4s ease-in-out infinite; }
      .god-crown { transform-origin: 50px 15px; animation: god-float 3s ease-in-out infinite; }
      .god-ray { animation: god-ray 3s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Radiant Backglow */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#god-flare)" strokeWidth="5" opacity="0.5" filter="url(#glow-xl)" className="god-pulse" />
      
      {/* Base Core Ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#god-core)" strokeWidth="6" filter="url(#glow-lg)" />
      
      {/* Light rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1="50" y1="50"
          x2={50 + 48 * Math.cos((angle * Math.PI) / 180)}
          y2={50 + 48 * Math.sin((angle * Math.PI) / 180)}
          stroke="#FDE047" strokeWidth="0.5" opacity="0.3" className="god-ray"
        />
      ))}

      {/* Animated Outer Celestial Ring */}
      <g className="god-outer">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="1,6" opacity="0.8" />
        <path d="M 50 0 L 53 6 L 50 12 L 47 6 Z" fill="#FFFFFF" filter="url(#glow-lg)" />
        <path d="M 50 88 L 53 94 L 50 100 L 47 94 Z" fill="#FFFFFF" filter="url(#glow-lg)" />
        <path d="M 0 50 L 6 53 L 12 50 L 6 47 Z" fill="#FFFFFF" filter="url(#glow-lg)" />
        <path d="M 88 50 L 94 53 L 100 50 L 94 47 Z" fill="#FFFFFF" filter="url(#glow-lg)" />
        {/* Corner Orbs */}
        <circle cx="15" cy="15" r="2.5" fill="#FFFFFF" filter="url(#glow-lg)" />
        <circle cx="85" cy="15" r="2.5" fill="#FFFFFF" filter="url(#glow-lg)" />
        <circle cx="15" cy="85" r="2.5" fill="#FFFFFF" filter="url(#glow-lg)" />
        <circle cx="85" cy="85" r="2.5" fill="#FFFFFF" filter="url(#glow-lg)" />
      </g>

      {/* Animated Inner Geometric Ring */}
      <g className="god-inner">
        <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" fill="none" stroke="#FDE047" strokeWidth="1.5" opacity="0.9" />
        <polygon points="50,12 77,23 88,50 77,77 50,88 23,77 12,50 23,23" fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
      </g>

      {/* The Apex Crown (Floating) */}
      <g className="god-crown">
        <path d="M 32 18 L 50 -2 L 68 18 L 55 22 L 50 12 L 45 22 Z" fill="url(#god-flare)" filter="url(#glow-xl)" />
        <polygon points="50,2 54,10 50,14 46,10" fill="#FFFFFF" />
        <circle cx="50" cy="-5" r="3" fill="#FFFFFF" filter="url(#glow-xl)" className="god-pulse" />
      </g>

      {/* Bottom Wing Accents */}
      <path d="M 15 80 Q 50 110 85 80 Q 75 88 50 94 Q 25 88 15 80 Z" fill="url(#god-flare)" opacity="0.6" filter="url(#glow-lg)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌿 GAIA CROWN — Earth's Guardian (LEGENDARY)
// Nature-themed legendary: glowing emerald aura + golden shimmer
// Cost: 25,000 points
// ═══════════════════════════════════════════════════════════════════════════════
export const GaiaFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes gaia-rotate { 100% { transform: rotate(360deg); } }
      @keyframes gaia-rotate-rev { 100% { transform: rotate(-360deg); } }
      @keyframes gaia-breathe {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.08); }
      }
      @keyframes gaia-shimmer {
        0% { transform: rotate(0deg); opacity: 0.3; }
        50% { opacity: 0.9; }
        100% { transform: rotate(360deg); opacity: 0.3; }
      }
      @keyframes gaia-leaf-sway {
        0%, 100% { transform: rotate(-5deg); }
        50% { transform: rotate(5deg); }
      }
      @keyframes gaia-sparkle {
        0%, 100% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.3); }
      }
      .gaia-aura { transform-origin: 50px 50px; animation: gaia-breathe 4s ease-in-out infinite; }
      .gaia-ring-outer { transform-origin: 50px 50px; animation: gaia-rotate 35s linear infinite; }
      .gaia-ring-inner { transform-origin: 50px 50px; animation: gaia-rotate-rev 25s linear infinite; }
      .gaia-shimmer { transform-origin: 50px 50px; animation: gaia-shimmer 8s linear infinite; }
      .gaia-leaf-1 { transform-origin: 20px 20px; animation: gaia-leaf-sway 3s ease-in-out infinite; }
      .gaia-leaf-2 { transform-origin: 80px 20px; animation: gaia-leaf-sway 3s ease-in-out infinite 0.5s; }
      .gaia-leaf-3 { transform-origin: 20px 80px; animation: gaia-leaf-sway 3s ease-in-out infinite 1s; }
      .gaia-leaf-4 { transform-origin: 80px 80px; animation: gaia-leaf-sway 3s ease-in-out infinite 1.5s; }
      .gaia-spark-1 { transform-origin: center; animation: gaia-sparkle 2.5s ease-in-out infinite; }
      .gaia-spark-2 { transform-origin: center; animation: gaia-sparkle 2.5s ease-in-out infinite 0.6s; }
      .gaia-spark-3 { transform-origin: center; animation: gaia-sparkle 2.5s ease-in-out infinite 1.2s; }
      .gaia-spark-4 { transform-origin: center; animation: gaia-sparkle 2.5s ease-in-out infinite 1.8s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Deep emerald aura (breathing) */}
      <circle cx="50" cy="50" r="49" fill="url(#gaia-aura)" className="gaia-aura" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#34D399" strokeWidth="3" opacity="0.3" filter="url(#glow-xl)" className="gaia-aura" />

      {/* Core emerald-gold ring */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#gaia-emerald)" strokeWidth="7" filter="url(#glow-lg)" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#059669" strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="50" r="38.5" fill="none" stroke="#34D399" strokeWidth="0.5" opacity="0.4" />

      {/* Rotating golden shimmer ring */}
      <g className="gaia-shimmer">
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#gaia-gold-shimmer)" strokeWidth="2" opacity="0.7" />
      </g>

      {/* Rotating outer vine ring */}
      <g className="gaia-ring-outer">
        <circle cx="50" cy="50" r="47" fill="none" stroke="#059669" strokeWidth="0.8" strokeDasharray="3,5" opacity="0.5" />
        {/* Orbiting emerald orbs */}
        <circle cx="50" cy="2" r="3" fill="#34D399" filter="url(#glow-md)" />
        <circle cx="98" cy="50" r="2" fill="#A7F3D0" filter="url(#glow-sm)" />
        <circle cx="50" cy="98" r="3" fill="#34D399" filter="url(#glow-md)" />
        <circle cx="2" cy="50" r="2" fill="#A7F3D0" filter="url(#glow-sm)" />
      </g>

      {/* Counter-rotating inner geometry */}
      <g className="gaia-ring-inner">
        <polygon points="50,10 78,22 90,50 78,78 50,90 22,78 10,50 22,22" fill="none" stroke="#6EE7B7" strokeWidth="0.8" opacity="0.5" />
      </g>

      {/* Swaying Leaves at corners */}
      <g className="gaia-leaf-1">
        <path d="M 14 28 Q 6 16 18 12 Q 22 22 14 28 Z" fill="#10B981" stroke="#047857" strokeWidth="0.5" />
        <path d="M 16 20 L 14 28" fill="none" stroke="#047857" strokeWidth="0.3" />
      </g>
      <g className="gaia-leaf-2">
        <path d="M 86 28 Q 94 16 82 12 Q 78 22 86 28 Z" fill="#10B981" stroke="#047857" strokeWidth="0.5" />
        <path d="M 84 20 L 86 28" fill="none" stroke="#047857" strokeWidth="0.3" />
      </g>
      <g className="gaia-leaf-3">
        <path d="M 14 72 Q 6 84 18 88 Q 22 78 14 72 Z" fill="#10B981" stroke="#047857" strokeWidth="0.5" />
        <path d="M 16 80 L 14 72" fill="none" stroke="#047857" strokeWidth="0.3" />
      </g>
      <g className="gaia-leaf-4">
        <path d="M 86 72 Q 94 84 82 88 Q 78 78 86 72 Z" fill="#10B981" stroke="#047857" strokeWidth="0.5" />
        <path d="M 84 80 L 86 72" fill="none" stroke="#047857" strokeWidth="0.3" />
      </g>

      {/* Crown at top — Gaia's Diadem */}
      <g style={{ transformOrigin: '50px 8px', animation: 'god-float 3.5s ease-in-out infinite' }}>
        <path d="M 35 16 L 42 4 L 50 -6 L 58 4 L 65 16 Z" fill="#059669" stroke="#34D399" strokeWidth="0.8" filter="url(#glow-lg)" />
        <circle cx="50" cy="-2" r="3.5" fill="#FDE047" filter="url(#glow-xl)" />
        <circle cx="42" cy="6" r="1.5" fill="#A7F3D0" />
        <circle cx="58" cy="6" r="1.5" fill="#A7F3D0" />
      </g>

      {/* Animated golden sparkles */}
      <path d="M 30 10 L 31 14 L 35 15 L 31 16 L 30 20 L 29 16 L 25 15 L 29 14 Z" fill="#FDE047" filter="url(#glow-md)" className="gaia-spark-1" />
      <path d="M 70 10 L 71 14 L 75 15 L 71 16 L 70 20 L 69 16 L 65 15 L 69 14 Z" fill="#FDE047" filter="url(#glow-md)" className="gaia-spark-2" />
      <path d="M 12 55 L 13 59 L 17 60 L 13 61 L 12 65 L 11 61 L 7 60 L 11 59 Z" fill="#FDE047" className="gaia-spark-3" />
      <path d="M 88 55 L 89 59 L 93 60 L 89 61 L 88 65 L 87 61 L 83 60 L 87 59 Z" fill="#FDE047" className="gaia-spark-4" />

      {/* Bottom flourish */}
      <path d="M 20 82 Q 35 100 50 95 Q 65 100 80 82" fill="none" stroke="#34D399" strokeWidth="1.5" opacity="0.6" filter="url(#glow-md)" />
      <circle cx="50" cy="95" r="2" fill="#FDE047" filter="url(#glow-md)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌌 SUPERNOVA — Cosmic Energy (LEGENDARY)
// Deep space themed: rotating neon purple/blue/cyan cosmic gradient + power glow
// Cost: 50,000 points
// ═══════════════════════════════════════════════════════════════════════════════
export const SupernovaFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      {/* Extra gradients specific to Supernova */}
      <linearGradient id="sn-ring-1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06B6D4" />
        <stop offset="33%" stopColor="#8B5CF6" />
        <stop offset="66%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="sn-ring-2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="50%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
      <radialGradient id="sn-core-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#C084FC" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
      </radialGradient>
    </defs>
    <style>{`
      @keyframes sn-spin-fast { 100% { transform: rotate(360deg); } }
      @keyframes sn-spin-slow { 100% { transform: rotate(-360deg); } }
      @keyframes sn-pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
      }
      @keyframes sn-flicker {
        0%, 100% { opacity: 0.5; }
        25% { opacity: 1; }
        50% { opacity: 0.3; }
        75% { opacity: 0.9; }
      }
      @keyframes sn-star-twinkle {
        0%, 100% { opacity: 0; transform: scale(0); }
        50% { opacity: 1; transform: scale(1.5); }
      }
      @keyframes sn-orbit {
        0% { transform: rotate(0deg) translateX(46px) rotate(0deg); }
        100% { transform: rotate(360deg) translateX(46px) rotate(-360deg); }
      }
      .sn-ring-fast { transform-origin: 50px 50px; animation: sn-spin-fast 10s linear infinite; }
      .sn-ring-slow { transform-origin: 50px 50px; animation: sn-spin-slow 18s linear infinite; }
      .sn-ring-mid { transform-origin: 50px 50px; animation: sn-spin-fast 14s linear infinite; }
      .sn-core-pulse { transform-origin: 50px 50px; animation: sn-pulse 3s ease-in-out infinite; }
      .sn-flicker { animation: sn-flicker 2s ease-in-out infinite; }
      .sn-star-1 { transform-origin: center; animation: sn-star-twinkle 1.8s ease-in-out infinite; }
      .sn-star-2 { transform-origin: center; animation: sn-star-twinkle 1.8s ease-in-out infinite 0.4s; }
      .sn-star-3 { transform-origin: center; animation: sn-star-twinkle 1.8s ease-in-out infinite 0.8s; }
      .sn-star-4 { transform-origin: center; animation: sn-star-twinkle 1.8s ease-in-out infinite 1.2s; }
      .sn-star-5 { transform-origin: center; animation: sn-star-twinkle 1.8s ease-in-out infinite 1.6s; }
      .sn-orb-1 { transform-origin: 50px 50px; animation: sn-orbit 6s linear infinite; }
      .sn-orb-2 { transform-origin: 50px 50px; animation: sn-orbit 8s linear infinite reverse; }
      .sn-orb-3 { transform-origin: 50px 50px; animation: sn-orbit 10s linear infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Deep space aura */}
      <circle cx="50" cy="50" r="49" fill="url(#sn-core-glow)" className="sn-core-pulse" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#7C3AED" strokeWidth="4" opacity="0.2" filter="url(#glow-cosmic)" className="sn-core-pulse" />

      {/* Primary cosmic ring (fast spin) */}
      <g className="sn-ring-fast">
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#sn-ring-1)" strokeWidth="5" filter="url(#glow-lg)" />
        {/* Neon dash overlay */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="2,12" opacity="0.9" />
      </g>

      {/* Secondary ring (slow counter-spin) */}
      <g className="sn-ring-slow">
        <circle cx="50" cy="50" r="47" fill="none" stroke="url(#sn-ring-2)" strokeWidth="1.5" opacity="0.6" strokeDasharray="4,4" />
        {/* Energy sparks on the ring */}
        <circle cx="50" cy="3" r="2.5" fill="#22D3EE" filter="url(#glow-md)" className="sn-flicker" />
        <circle cx="97" cy="50" r="2" fill="#A78BFA" filter="url(#glow-md)" className="sn-flicker" />
        <circle cx="50" cy="97" r="2.5" fill="#F472B6" filter="url(#glow-md)" className="sn-flicker" />
        <circle cx="3" cy="50" r="2" fill="#60A5FA" filter="url(#glow-md)" className="sn-flicker" />
      </g>

      {/* Third ring (mid-speed) with geometric accents */}
      <g className="sn-ring-mid">
        <polygon points="50,6 84,20 94,50 84,80 50,94 16,80 6,50 16,20" fill="none" stroke="#C084FC" strokeWidth="0.6" opacity="0.5" />
        <polygon points="50,12 78,24 88,50 78,76 50,88 22,76 12,50 22,24" fill="none" stroke="#818CF8" strokeWidth="0.4" strokeDasharray="2,4" opacity="0.4" />
      </g>

      {/* Orbiting energy orbs */}
      <g className="sn-orb-1">
        <circle cx="96" cy="50" r="2.5" fill="#06B6D4" filter="url(#glow-md)" />
      </g>
      <g className="sn-orb-2">
        <circle cx="96" cy="50" r="1.8" fill="#EC4899" filter="url(#glow-md)" />
      </g>
      <g className="sn-orb-3">
        <circle cx="96" cy="50" r="1.5" fill="#8B5CF6" filter="url(#glow-sm)" />
      </g>

      {/* Twinkling star particles */}
      <path d="M 18 18 L 19 22 L 23 23 L 19 24 L 18 28 L 17 24 L 13 23 L 17 22 Z" fill="#22D3EE" filter="url(#glow-md)" className="sn-star-1" />
      <path d="M 82 18 L 83 22 L 87 23 L 83 24 L 82 28 L 81 24 L 77 23 L 81 22 Z" fill="#F472B6" filter="url(#glow-md)" className="sn-star-2" />
      <path d="M 18 82 L 19 86 L 23 87 L 19 88 L 18 92 L 17 88 L 13 87 L 17 86 Z" fill="#A78BFA" filter="url(#glow-md)" className="sn-star-3" />
      <path d="M 82 82 L 83 86 L 87 87 L 83 88 L 82 92 L 81 88 L 77 87 L 81 86 Z" fill="#60A5FA" filter="url(#glow-md)" className="sn-star-4" />
      <path d="M 50 -2 L 51 3 L 56 4 L 51 5 L 50 10 L 49 5 L 44 4 L 49 3 Z" fill="#FFFFFF" filter="url(#glow-lg)" className="sn-star-5" />

      {/* Central energy burst effect */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <line
          key={i}
          x1="50" y1="50"
          x2={50 + 48 * Math.cos((angle * Math.PI) / 180)}
          y2={50 + 48 * Math.sin((angle * Math.PI) / 180)}
          stroke={i % 3 === 0 ? '#06B6D4' : i % 3 === 1 ? '#8B5CF6' : '#EC4899'}
          strokeWidth="0.3"
          opacity="0.2"
          className="sn-flicker"
        />
      ))}

      {/* Bottom energy wave */}
      <path d="M 15 82 Q 30 100 50 96 Q 70 100 85 82" fill="none" stroke="#C084FC" strokeWidth="1.5" opacity="0.5" filter="url(#glow-lg)" />
      <path d="M 20 85 Q 35 98 50 94 Q 65 98 80 85" fill="none" stroke="#22D3EE" strokeWidth="0.8" opacity="0.4" filter="url(#glow-md)" />
    </g>
  </svg>
);

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// ECOSPARK AVATAR FRAMES — ULTRA PREMIUM LEGENDARY EDITION
// ═══════════════════════════════════════════════════════════════════════════════

const SharedDefs = () => (
  <defs>
    {/* Metallic Gradients */}
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
      <stop offset="20%" stopColor="#E0E7FF" />
      <stop offset="40%" stopColor="#A78BFA" />
      <stop offset="60%" stopColor="#DDD6FE" />
      <stop offset="80%" stopColor="#7C3AED" />
      <stop offset="100%" stopColor="#4C1D95" />
    </linearGradient>

    {/* God Frame */}
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

    {/* Glow Filters */}
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
    <filter id="glow-xl" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-intense" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <mask id="center-hole">
      <rect x="-100" y="-100" width="300" height="300" fill="white" />
      <circle cx="50" cy="50" r="38" fill="black" />
    </mask>
  </defs>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥉 BRONZE — Nature's Embrace
// ═══════════════════════════════════════════════════════════════════════════════
export const BronzeFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes bronze-shimmer { 0%,100%{opacity:.3} 50%{opacity:.8} }
      .bronze-shine { animation: bronze-shimmer 4s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#bronze-metallic)" strokeWidth="7" filter="url(#glow-sm)" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#8C501A" strokeWidth=".8" opacity=".6" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#E8B887" strokeWidth=".5" opacity=".4" />
      <path d="M 10 50 Q 20 20 50 10" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeDasharray="5,2" opacity=".9" />
      <path d="M 90 50 Q 80 80 50 90" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeDasharray="5,2" opacity=".9" />
      <path d="M 15 35 Q 10 25 20 20 Q 25 30 15 35 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <path d="M 28 18 Q 30 5 40 10 Q 35 18 28 18 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <path d="M 85 65 Q 90 75 80 80 Q 75 70 85 65 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <path d="M 72 82 Q 70 95 60 90 Q 65 82 72 82 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FEF08A" strokeWidth="1" opacity=".2" className="bronze-shine" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥈 SILVER — Precision Engineering
// ═══════════════════════════════════════════════════════════════════════════════
export const SilverFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes silver-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      @keyframes silver-rotate { 100%{transform:rotate(360deg)} }
      .silver-glow { animation: silver-pulse 3s ease-in-out infinite; }
      .silver-spin { transform-origin:50px 50px; animation: silver-rotate 30s linear infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#silver-metallic)" strokeWidth="8" filter="url(#glow-sm)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="3,2" opacity=".7" />
      <g className="silver-spin">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#D1D5DB" strokeWidth=".5" strokeDasharray="2,8" />
      </g>
      {[[15,50],[85,50],[50,15],[50,85]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={2.5} fill="#FFFFFF" className="silver-glow" />)}
      {[[25,25],[75,25],[25,75],[75,75]].map(([x,y],i) => <circle key={i+4} cx={x} cy={y} r={1.5} fill="#9CA3AF" className="silver-glow" />)}
      <path d="M 50 5 L 53 11 L 47 11 Z" fill="url(#silver-metallic)" />
      <path d="M 50 95 L 53 89 L 47 89 Z" fill="url(#silver-metallic)" />
      <path d="M 5 50 L 11 47 L 11 53 Z" fill="url(#silver-metallic)" />
      <path d="M 95 50 L 89 47 L 89 53 Z" fill="url(#silver-metallic)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥇 GOLD — Royal Laurels
// ═══════════════════════════════════════════════════════════════════════════════
export const GoldFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes gold-sparkle { 0%,100%{opacity:0;transform:scale(.5)} 50%{opacity:1;transform:scale(1.2)} }
      @keyframes gold-breathe { 0%,100%{opacity:.6} 50%{opacity:1} }
      .gold-s1 { transform-origin:center; animation:gold-sparkle 2.5s ease-in-out infinite; }
      .gold-s2 { transform-origin:center; animation:gold-sparkle 2.5s ease-in-out infinite .8s; }
      .gold-s3 { transform-origin:center; animation:gold-sparkle 2.5s ease-in-out infinite 1.6s; }
      .gold-aura { animation:gold-breathe 3s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="43" fill="none" stroke="#78350F" strokeWidth="1.5" opacity=".5" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#78350F" strokeWidth="1.5" opacity=".5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gold-metallic)" strokeWidth="7" filter="url(#glow-md)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FFD700" strokeWidth="2" opacity=".3" filter="url(#glow-md)" className="gold-aura" />
      <g fill="#FBBF24" stroke="#B45309" strokeWidth=".5">
        <path d="M 50 92 Q 25 90 10 60 Q 20 70 30 80 Q 40 85 50 88 Z" />
        <path d="M 12 60 Q 8 45 15 30 Q 18 45 15 55 Z" />
        <path d="M 50 92 Q 75 90 90 60 Q 80 70 70 80 Q 60 85 50 88 Z" />
        <path d="M 88 60 Q 92 45 85 30 Q 82 45 85 55 Z" />
      </g>
      <path d="M 50 0 L 52 8 L 60 10 L 52 12 L 50 20 L 48 12 L 40 10 L 48 8 Z" fill="#FEF08A" filter="url(#glow-md)" className="gold-s1" />
      <path d="M 20 15 L 21 20 L 26 21 L 21 22 L 20 27 L 19 22 L 14 21 L 19 20 Z" fill="#FEF08A" className="gold-s2" />
      <path d="M 80 15 L 81 20 L 86 21 L 81 22 L 80 27 L 79 22 L 74 21 L 79 20 Z" fill="#FEF08A" className="gold-s3" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 PLATINUM — Crystal Geometry
// ═══════════════════════════════════════════════════════════════════════════════
export const PlatinumFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes plat-rot { 100%{transform:rotate(360deg)} }
      @keyframes plat-rev { 100%{transform:rotate(-360deg)} }
      @keyframes plat-tw { 0%,100%{opacity:.2} 50%{opacity:.9} }
      .plat-o { transform-origin:50px 50px; animation:plat-rot 25s linear infinite; }
      .plat-i { transform-origin:50px 50px; animation:plat-rev 18s linear infinite; }
      .plat-t1 { animation:plat-tw 2s ease-in-out infinite; }
      .plat-t2 { animation:plat-tw 2s ease-in-out infinite .7s; }
      .plat-t3 { animation:plat-tw 2s ease-in-out infinite 1.4s; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#platinum-metallic)" strokeWidth="8" filter="url(#glow-lg)" />
      <g className="plat-o">
        <path d="M 50 8 L 82 22 L 92 50 L 82 78 L 50 92 L 18 78 L 8 50 L 18 22 Z" fill="none" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="2,2" opacity=".7" />
      </g>
      <g className="plat-i">
        <path d="M 50 14 L 76 25 L 86 50 L 76 75 L 50 86 L 24 75 L 14 50 L 24 25 Z" fill="none" stroke="#818CF8" strokeWidth=".8" opacity=".6" />
      </g>
      <g id="pd" transform="translate(50,5) scale(1)">
        <polygon points="0,-8 6,0 0,10 -6,0" fill="url(#platinum-metallic)" stroke="#FFF" strokeWidth=".8" />
        <polygon points="0,-8 3,0 0,10 -3,0" fill="#E0E7FF" opacity=".5" />
      </g>
      <use href="#pd" transform="rotate(90 50 50)" />
      <use href="#pd" transform="rotate(180 50 50)" />
      <use href="#pd" transform="rotate(270 50 50)" />
      <path d="M 22 22 L 23 27 L 28 28 L 23 29 L 22 34 L 21 29 L 16 28 L 21 27 Z" fill="#FFF" filter="url(#glow-lg)" className="plat-t1" />
      <path d="M 78 22 L 79 27 L 84 28 L 79 29 L 78 34 L 77 29 L 72 28 L 77 27 Z" fill="#FFF" filter="url(#glow-lg)" className="plat-t2" />
      <path d="M 22 78 L 23 83 L 28 84 L 23 85 L 22 90 L 21 85 L 16 84 L 21 83 Z" fill="#FFF" className="plat-t3" />
      <path d="M 78 78 L 79 83 L 84 84 L 79 85 L 78 90 L 77 85 L 72 84 L 77 83 Z" fill="#FFF" className="plat-t1" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👑 SUPREME GOD — Celestial Apex
// ═══════════════════════════════════════════════════════════════════════════════
export const GodFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes gs { 100%{transform:rotate(360deg)} }
      @keyframes gsr { 100%{transform:rotate(-360deg)} }
      @keyframes gp { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
      @keyframes gf { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      @keyframes gr { 0%,100%{opacity:.1} 50%{opacity:.5} }
      .go { transform-origin:50px 50px; animation:gs 20s linear infinite; }
      .gi { transform-origin:50px 50px; animation:gsr 14s linear infinite; }
      .gp { transform-origin:50px 50px; animation:gp 4s ease-in-out infinite; }
      .gc { transform-origin:50px 15px; animation:gf 3s ease-in-out infinite; }
      .gr { animation:gr 3s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#god-flare)" strokeWidth="5" opacity=".5" filter="url(#glow-xl)" className="gp" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#god-core)" strokeWidth="6" filter="url(#glow-lg)" />
      {[0,45,90,135,180,225,270,315].map((a,i) => (
        <line key={i} x1="50" y1="50" x2={50+48*Math.cos(a*Math.PI/180)} y2={50+48*Math.sin(a*Math.PI/180)} stroke="#FDE047" strokeWidth=".5" opacity=".3" className="gr" />
      ))}
      <g className="go">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="1,6" opacity=".8" />
        <path d="M 50 0 L 53 6 L 50 12 L 47 6 Z" fill="#FFF" filter="url(#glow-lg)" />
        <path d="M 50 88 L 53 94 L 50 100 L 47 94 Z" fill="#FFF" filter="url(#glow-lg)" />
        <path d="M 0 50 L 6 53 L 12 50 L 6 47 Z" fill="#FFF" filter="url(#glow-lg)" />
        <path d="M 88 50 L 94 53 L 100 50 L 94 47 Z" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="15" cy="15" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="85" cy="15" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="15" cy="85" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="85" cy="85" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
      </g>
      <g className="gi">
        <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" fill="none" stroke="#FDE047" strokeWidth="1.5" opacity=".9" />
        <polygon points="50,12 77,23 88,50 77,77 50,88 23,77 12,50 23,23" fill="none" stroke="#FFF" strokeWidth=".5" strokeDasharray="3,3" opacity=".6" />
      </g>
      <g className="gc">
        <path d="M 32 18 L 50 -2 L 68 18 L 55 22 L 50 12 L 45 22 Z" fill="url(#god-flare)" filter="url(#glow-xl)" />
        <polygon points="50,2 54,10 50,14 46,10" fill="#FFF" />
        <circle cx="50" cy="-5" r="3" fill="#FFF" filter="url(#glow-xl)" className="gp" />
      </g>
      <path d="M 15 80 Q 50 110 85 80 Q 75 88 50 94 Q 25 88 15 80 Z" fill="url(#god-flare)" opacity=".6" filter="url(#glow-lg)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌿 GAIA CROWN — Earth's Guardian (LEGENDARY — 25,000 pts)
// A massive emerald-gold cosmic nature frame with floating crown, ancient runes,
// swirling vine energy, and a dramatic golden diadem
// ═══════════════════════════════════════════════════════════════════════════════
export const GaiaFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="gaia-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6EE7B7" />
        <stop offset="25%" stopColor="#059669" />
        <stop offset="50%" stopColor="#FDE047" />
        <stop offset="75%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="gaia-gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B8860B" />
        <stop offset="30%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#FFFACD" />
        <stop offset="70%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
      <radialGradient id="gaia-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#34D399" stopOpacity=".5" />
        <stop offset="60%" stopColor="#059669" stopOpacity=".25" />
        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
      </radialGradient>
      <filter id="gaia-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <style>{`
      @keyframes gaia-spin { 100% { transform: rotate(360deg); } }
      @keyframes gaia-rev { 100% { transform: rotate(-360deg); } }
      @keyframes gaia-pulse { 
        0%, 100% { opacity: .4; transform: scale(1); } 
        50% { opacity: .95; transform: scale(1.1); } 
      }
      @keyframes gaia-float { 
        0%, 100% { transform: translateY(0); } 
        50% { transform: translateY(-6px); } 
      }
      @keyframes gaia-shimmer {
        0%, 100% { opacity: .2; }
        50% { opacity: 1; }
      }
      @keyframes gaia-leaf {
        0%, 100% { transform: rotate(-8deg) scale(1); }
        50% { transform: rotate(8deg) scale(1.1); }
      }
      @keyframes gaia-spark {
        0%, 100% { opacity: 0; transform: scale(.3); }
        50% { opacity: 1; transform: scale(1.5); }
      }
      .gaia-outer { transform-origin: 50px 50px; animation: gaia-spin 28s linear infinite; }
      .gaia-inner { transform-origin: 50px 50px; animation: gaia-rev 18s linear infinite; }
      .gaia-mid { transform-origin: 50px 50px; animation: gaia-spin 40s linear infinite; }
      .gaia-aura { transform-origin: 50px 50px; animation: gaia-pulse 4s ease-in-out infinite; }
      .gaia-crown { transform-origin: 50px 8px; animation: gaia-float 3s ease-in-out infinite; }
      .gaia-shim1 { animation: gaia-shimmer 2.5s ease-in-out infinite; }
      .gaia-shim2 { animation: gaia-shimmer 2.5s ease-in-out infinite .8s; }
      .gaia-shim3 { animation: gaia-shimmer 2.5s ease-in-out infinite 1.6s; }
      .gaia-l1 { transform-origin: 14px 22px; animation: gaia-leaf 3.5s ease-in-out infinite; }
      .gaia-l2 { transform-origin: 86px 22px; animation: gaia-leaf 3.5s ease-in-out infinite .6s; }
      .gaia-l3 { transform-origin: 14px 78px; animation: gaia-leaf 3.5s ease-in-out infinite 1.2s; }
      .gaia-l4 { transform-origin: 86px 78px; animation: gaia-leaf 3.5s ease-in-out infinite 1.8s; }
      .gaia-sp1 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite; }
      .gaia-sp2 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite .5s; }
      .gaia-sp3 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite 1s; }
      .gaia-sp4 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite 1.5s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* === LAYER 1: Deep emerald aura (breathing) === */}
      <circle cx="50" cy="50" r="49" fill="url(#gaia-aura)" className="gaia-aura" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#34D399" strokeWidth="3" opacity=".25" filter="url(#gaia-glow)" className="gaia-aura" />
      
      {/* === LAYER 2: Thick primary emerald-gold ring === */}
      <circle cx="50" cy="50" r="43" fill="none" stroke="url(#gaia-ring)" strokeWidth="8" filter="url(#glow-lg)" />
      {/* Inner/outer accent lines */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="#6EE7B7" strokeWidth="1.2" opacity=".5" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#34D399" strokeWidth=".8" opacity=".4" />

      {/* === LAYER 3: Rotating golden shimmer ring === */}
      <g className="gaia-mid">
        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gaia-gold)" strokeWidth="2" opacity=".6" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#FDE047" strokeWidth=".5" strokeDasharray="1,8" opacity=".8" />
      </g>

      {/* === LAYER 4: Rotating outer ring with orbiting orbs === */}
      <g className="gaia-outer">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#059669" strokeWidth=".8" strokeDasharray="3,4" opacity=".6" />
        {/* Big orbiting emerald orbs */}
        <circle cx="50" cy="1" r="4" fill="#34D399" stroke="#6EE7B7" strokeWidth=".5" filter="url(#glow-lg)" />
        <circle cx="99" cy="50" r="3" fill="#A7F3D0" filter="url(#glow-md)" />
        <circle cx="50" cy="99" r="4" fill="#34D399" stroke="#6EE7B7" strokeWidth=".5" filter="url(#glow-lg)" />
        <circle cx="1" cy="50" r="3" fill="#A7F3D0" filter="url(#glow-md)" />
        {/* Smaller orbs between */}
        <circle cx="78" cy="10" r="2" fill="#FDE047" filter="url(#glow-sm)" />
        <circle cx="90" cy="78" r="2" fill="#FDE047" filter="url(#glow-sm)" />
        <circle cx="22" cy="90" r="2" fill="#FDE047" filter="url(#glow-sm)" />
        <circle cx="10" cy="22" r="2" fill="#FDE047" filter="url(#glow-sm)" />
      </g>

      {/* === LAYER 5: Counter-rotating inner geometry === */}
      <g className="gaia-inner">
        <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" fill="none" stroke="#6EE7B7" strokeWidth="1.2" opacity=".6" />
        <polygon points="50,14 74,24 84,50 74,76 50,86 26,76 16,50 26,24" fill="none" stroke="#A7F3D0" strokeWidth=".5" strokeDasharray="2,3" opacity=".4" />
      </g>

      {/* === LAYER 6: Swaying animated leaves at corners === */}
      <g className="gaia-l1">
        <path d="M 8 28 Q -2 12 14 6 Q 20 18 8 28 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 12 14 Q 8 28 8 28" fill="none" stroke="#047857" strokeWidth=".4" />
        <path d="M 18 18 Q 8 8 20 4 Q 24 12 18 18 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>
      <g className="gaia-l2">
        <path d="M 92 28 Q 102 12 86 6 Q 80 18 92 28 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 88 14 Q 92 28 92 28" fill="none" stroke="#047857" strokeWidth=".4" />
        <path d="M 82 18 Q 92 8 80 4 Q 76 12 82 18 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>
      <g className="gaia-l3">
        <path d="M 8 72 Q -2 88 14 94 Q 20 82 8 72 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 18 82 Q 8 92 20 96 Q 24 88 18 82 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>
      <g className="gaia-l4">
        <path d="M 92 72 Q 102 88 86 94 Q 80 82 92 72 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 82 82 Q 92 92 80 96 Q 76 88 82 82 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>

      {/* === LAYER 7: The Gaia Diadem Crown (floating at top) === */}
      <g className="gaia-crown">
        {/* Crown base */}
        <path d="M 28 20 L 36 2 L 43 14 L 50 -8 L 57 14 L 64 2 L 72 20 Z" fill="url(#gaia-gold)" stroke="#B8860B" strokeWidth=".8" filter="url(#glow-xl)" />
        {/* Crown gems */}
        <circle cx="50" cy="-4" r="4" fill="#34D399" stroke="#6EE7B7" strokeWidth=".8" filter="url(#glow-lg)" />
        <circle cx="36" cy="5" r="2.5" fill="#FDE047" stroke="#B8860B" strokeWidth=".5" filter="url(#glow-md)" />
        <circle cx="64" cy="5" r="2.5" fill="#FDE047" stroke="#B8860B" strokeWidth=".5" filter="url(#glow-md)" />
        {/* Crown tip beacon */}
        <circle cx="50" cy="-10" r="3" fill="#FFFFFF" filter="url(#gaia-glow)" className="gaia-aura" />
        {/* Crown inner line */}
        <path d="M 34 16 L 50 0 L 66 16" fill="none" stroke="#FFFACD" strokeWidth=".6" opacity=".5" />
      </g>

      {/* === LAYER 8: Animated golden sparkles === */}
      <path d="M 26 8 L 27 13 L 32 14 L 27 15 L 26 20 L 25 15 L 20 14 L 25 13 Z" fill="#FDE047" filter="url(#glow-md)" className="gaia-sp1" />
      <path d="M 74 8 L 75 13 L 80 14 L 75 15 L 74 20 L 73 15 L 68 14 L 73 13 Z" fill="#FDE047" filter="url(#glow-md)" className="gaia-sp2" />
      <path d="M 6 50 L 7 55 L 12 56 L 7 57 L 6 62 L 5 57 L 0 56 L 5 55 Z" fill="#A7F3D0" filter="url(#glow-md)" className="gaia-sp3" />
      <path d="M 94 50 L 95 55 L 100 56 L 95 57 L 94 62 L 93 57 L 88 56 L 93 55 Z" fill="#A7F3D0" filter="url(#glow-md)" className="gaia-sp4" />

      {/* === LAYER 9: Bottom energy wave flourish === */}
      <path d="M 12 82 Q 30 108 50 98 Q 70 108 88 82" fill="none" stroke="#34D399" strokeWidth="2" opacity=".7" filter="url(#glow-lg)" />
      <path d="M 18 85 Q 34 104 50 96 Q 66 104 82 85" fill="none" stroke="#FDE047" strokeWidth="1" opacity=".5" filter="url(#glow-md)" />
      <path d="M 15 80 Q 50 112 85 80 Q 70 92 50 98 Q 30 92 15 80 Z" fill="url(#gaia-aura)" opacity=".6" filter="url(#glow-lg)" />
      <circle cx="50" cy="97" r="3" fill="#FDE047" filter="url(#glow-lg)" className="gaia-sp1" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌌 SUPERNOVA — Cosmic Energy (LEGENDARY — 50,000 pts)
// Deep space: triple rotating neon rings, orbiting energy orbs, pulsing cosmic
// aura, star field, energy crown, plasma waves
// ═══════════════════════════════════════════════════════════════════════════════
export const SupernovaFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="sn-r1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06B6D4" />
        <stop offset="33%" stopColor="#8B5CF6" />
        <stop offset="66%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="sn-r2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="50%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
      <linearGradient id="sn-r3" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="50%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <linearGradient id="sn-crown" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="30%" stopColor="#EC4899" />
        <stop offset="60%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <radialGradient id="sn-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#C084FC" stopOpacity=".5" />
        <stop offset="40%" stopColor="#7C3AED" stopOpacity=".25" />
        <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
      </radialGradient>
      <filter id="sn-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="14" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <style>{`
      @keyframes sn-fast { 100% { transform: rotate(360deg); } }
      @keyframes sn-slow { 100% { transform: rotate(-360deg); } }
      @keyframes sn-mid { 100% { transform: rotate(360deg); } }
      @keyframes sn-pulse {
        0%, 100% { opacity: .3; transform: scale(1); }
        50% { opacity: .9; transform: scale(1.12); }
      }
      @keyframes sn-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }
      @keyframes sn-flicker {
        0%, 100% { opacity: .4; }
        25% { opacity: 1; }
        50% { opacity: .2; }
        75% { opacity: .9; }
      }
      @keyframes sn-star {
        0%, 100% { opacity: 0; transform: scale(.2); }
        50% { opacity: 1; transform: scale(1.6); }
      }
      @keyframes sn-orb {
        0% { transform: rotate(0deg) translateX(47px) rotate(0deg); }
        100% { transform: rotate(360deg) translateX(47px) rotate(-360deg); }
      }
      .sn-ring1 { transform-origin: 50px 50px; animation: sn-fast 8s linear infinite; }
      .sn-ring2 { transform-origin: 50px 50px; animation: sn-slow 14s linear infinite; }
      .sn-ring3 { transform-origin: 50px 50px; animation: sn-mid 22s linear infinite; }
      .sn-aura { transform-origin: 50px 50px; animation: sn-pulse 3.5s ease-in-out infinite; }
      .sn-crown { transform-origin: 50px 8px; animation: sn-float 3s ease-in-out infinite; }
      .sn-fl { animation: sn-flicker 2s ease-in-out infinite; }
      .sn-s1 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite; }
      .sn-s2 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite .35s; }
      .sn-s3 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite .7s; }
      .sn-s4 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite 1.05s; }
      .sn-s5 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite 1.4s; }
      .sn-o1 { transform-origin: 50px 50px; animation: sn-orb 5s linear infinite; }
      .sn-o2 { transform-origin: 50px 50px; animation: sn-orb 7s linear infinite reverse; }
      .sn-o3 { transform-origin: 50px 50px; animation: sn-orb 9s linear infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* === LAYER 1: Deep cosmic aura (breathing) === */}
      <circle cx="50" cy="50" r="49" fill="url(#sn-aura)" className="sn-aura" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#7C3AED" strokeWidth="4" opacity=".2" filter="url(#sn-glow)" className="sn-aura" />

      {/* === LAYER 2: Primary neon ring (fast spin) === */}
      <g className="sn-ring1">
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#sn-r1)" strokeWidth="6" filter="url(#glow-lg)" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="2,10" opacity=".9" />
        {/* Large energy nodes on primary ring */}
        <circle cx="50" cy="6" r="4" fill="#22D3EE" stroke="#06B6D4" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
        <circle cx="94" cy="50" r="3.5" fill="#EC4899" stroke="#F472B6" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
        <circle cx="50" cy="94" r="4" fill="#8B5CF6" stroke="#A78BFA" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
        <circle cx="6" cy="50" r="3.5" fill="#3B82F6" stroke="#60A5FA" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
      </g>

      {/* === LAYER 3: Secondary ring (slow counter-spin) === */}
      <g className="sn-ring2">
        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#sn-r2)" strokeWidth="2" opacity=".7" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="#F472B6" strokeWidth=".5" strokeDasharray="4,6" opacity=".5" />
        {/* Smaller energy sparks */}
        <circle cx="78" cy="6" r="2.5" fill="#F472B6" filter="url(#glow-md)" className="sn-fl" />
        <circle cx="94" cy="78" r="2.5" fill="#A78BFA" filter="url(#glow-md)" className="sn-fl" />
        <circle cx="22" cy="94" r="2.5" fill="#22D3EE" filter="url(#glow-md)" className="sn-fl" />
        <circle cx="6" cy="22" r="2.5" fill="#60A5FA" filter="url(#glow-md)" className="sn-fl" />
      </g>

      {/* === LAYER 4: Third ring — geometric (mid-speed) === */}
      <g className="sn-ring3">
        <polygon points="50,4 86,18 96,50 86,82 50,96 14,82 4,50 14,18" fill="none" stroke="#C084FC" strokeWidth=".8" opacity=".5" />
        <polygon points="50,10 80,22 90,50 80,78 50,90 20,78 10,50 20,22" fill="none" stroke="#818CF8" strokeWidth=".4" strokeDasharray="2,4" opacity=".4" />
      </g>

      {/* === LAYER 5: Orbiting energy orbs (independent orbits) === */}
      <g className="sn-o1">
        <circle cx="97" cy="50" r="3.5" fill="#06B6D4" stroke="#22D3EE" strokeWidth=".5" filter="url(#glow-lg)" />
      </g>
      <g className="sn-o2">
        <circle cx="97" cy="50" r="2.5" fill="#EC4899" stroke="#F472B6" strokeWidth=".5" filter="url(#glow-lg)" />
      </g>
      <g className="sn-o3">
        <circle cx="97" cy="50" r="2" fill="#8B5CF6" stroke="#A78BFA" strokeWidth=".5" filter="url(#glow-md)" />
      </g>

      {/* === LAYER 6: Energy burst rays from center === */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a,i) => (
        <line key={i} x1="50" y1="50" x2={50+48*Math.cos(a*Math.PI/180)} y2={50+48*Math.sin(a*Math.PI/180)}
          stroke={['#06B6D4','#8B5CF6','#EC4899'][i%3]} strokeWidth=".4" opacity=".15" className="sn-fl" />
      ))}

      {/* === LAYER 7: Cosmic Crown (floating at top) === */}
      <g className="sn-crown">
        {/* Crown body */}
        <path d="M 30 20 L 37 0 L 43 12 L 50 -10 L 57 12 L 63 0 L 70 20 Z" fill="url(#sn-crown)" stroke="#C084FC" strokeWidth=".6" filter="url(#glow-xl)" />
        {/* Crown gems */}
        <circle cx="50" cy="-6" r="4.5" fill="#22D3EE" stroke="#06B6D4" strokeWidth="1" filter="url(#sn-glow)" className="sn-aura" />
        <circle cx="37" cy="3" r="2.5" fill="#EC4899" stroke="#F472B6" strokeWidth=".5" filter="url(#glow-md)" />
        <circle cx="63" cy="3" r="2.5" fill="#8B5CF6" stroke="#A78BFA" strokeWidth=".5" filter="url(#glow-md)" />
        {/* Crown tip beacon */}
        <circle cx="50" cy="-12" r="3.5" fill="#FFFFFF" filter="url(#sn-glow)" className="sn-aura" />
        {/* Crown inner highlight */}
        <path d="M 36 16 L 50 -2 L 64 16" fill="none" stroke="#FFFFFF" strokeWidth=".5" opacity=".4" />
      </g>

      {/* === LAYER 8: Twinkling star particles === */}
      <path d="M 16 16 L 17 22 L 23 23 L 17 24 L 16 30 L 15 24 L 9 23 L 15 22 Z" fill="#22D3EE" filter="url(#glow-lg)" className="sn-s1" />
      <path d="M 84 16 L 85 22 L 91 23 L 85 24 L 84 30 L 83 24 L 77 23 L 83 22 Z" fill="#F472B6" filter="url(#glow-lg)" className="sn-s2" />
      <path d="M 16 84 L 17 90 L 23 91 L 17 92 L 16 98 L 15 92 L 9 91 L 15 90 Z" fill="#A78BFA" filter="url(#glow-lg)" className="sn-s3" />
      <path d="M 84 84 L 85 90 L 91 91 L 85 92 L 84 98 L 83 92 L 77 91 L 83 90 Z" fill="#60A5FA" filter="url(#glow-lg)" className="sn-s4" />
      <path d="M 50 -4 L 51 2 L 57 3 L 51 4 L 50 10 L 49 4 L 43 3 L 49 2 Z" fill="#FFFFFF" filter="url(#glow-xl)" className="sn-s5" />

      {/* === LAYER 9: Bottom plasma wave === */}
      <path d="M 10 82 Q 30 110 50 100 Q 70 110 90 82" fill="none" stroke="#8B5CF6" strokeWidth="2.5" opacity=".6" filter="url(#glow-lg)" />
      <path d="M 15 84 Q 33 106 50 98 Q 67 106 85 84" fill="none" stroke="#22D3EE" strokeWidth="1.2" opacity=".5" filter="url(#glow-md)" />
      <path d="M 20 86 Q 35 102 50 96 Q 65 102 80 86" fill="none" stroke="#EC4899" strokeWidth=".8" opacity=".4" filter="url(#glow-sm)" />
      <path d="M 12 80 Q 50 115 88 80 Q 70 94 50 100 Q 30 94 12 80 Z" fill="url(#sn-aura)" opacity=".5" filter="url(#glow-lg)" />
      <circle cx="50" cy="99" r="3.5" fill="#C084FC" filter="url(#glow-xl)" className="sn-s1" />
    </g>
  </svg>
);

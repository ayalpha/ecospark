import React from 'react';

// Common base rings and definitions
const Defs = () => (
  <defs>
    <radialGradient id="bronze-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#E59E6D" />
      <stop offset="70%" stopColor="#CD7F32" />
      <stop offset="100%" stopColor="#8C501A" />
    </radialGradient>
    <radialGradient id="silver-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#F9FAFB" />
      <stop offset="70%" stopColor="#D1D5DB" />
      <stop offset="100%" stopColor="#6B7280" />
    </radialGradient>
    <radialGradient id="gold-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FEF08A" />
      <stop offset="70%" stopColor="#F59E0B" />
      <stop offset="100%" stopColor="#B45309" />
    </radialGradient>
    <radialGradient id="platinum-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="40%" stopColor="#E0E7FF" />
      <stop offset="80%" stopColor="#818CF8" />
      <stop offset="100%" stopColor="#4338CA" />
    </radialGradient>
    <radialGradient id="diamond-grad" cx="30%" cy="30%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="50%" stopColor="#A5B4FC" />
      <stop offset="100%" stopColor="#312E81" />
    </radialGradient>
    <filter id="glow-bronze" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-silver" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-platinum" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
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
    <filter id="glow-god" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-god-intense" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <mask id="center-hole">
      <rect x="-100" y="-100" width="300" height="300" fill="white" />
      <circle cx="50" cy="50" r="38" fill="black" />
    </mask>
  </defs>
);

export const BronzeFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <Defs />
    <g mask="url(#center-hole)">
      {/* Base Ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#bronze-grad)" strokeWidth="6" filter="url(#glow-bronze)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#8C501A" strokeWidth="1" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#8C501A" strokeWidth="1" />
      
      {/* Vines */}
      <path d="M 10 50 Q 20 20 50 10" fill="none" stroke="#2E7D32" strokeWidth="2" strokeDasharray="5,2" />
      <path d="M 90 50 Q 80 80 50 90" fill="none" stroke="#2E7D32" strokeWidth="2" strokeDasharray="5,2" />
      
      {/* Leaves */}
      <path d="M 15 35 Q 10 25 20 20 Q 25 30 15 35 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />
      <path d="M 28 18 Q 30 5 40 10 Q 35 18 28 18 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />
      <path d="M 85 65 Q 90 75 80 80 Q 75 70 85 65 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />
      <path d="M 72 82 Q 70 95 60 90 Q 65 82 72 82 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="0.5" />

      {/* Bronze Flower at bottom */}
      <g transform="translate(50, 88) scale(0.8)">
        <circle cx="0" cy="-5" r="5" fill="url(#bronze-grad)" />
        <circle cx="5" cy="0" r="5" fill="url(#bronze-grad)" />
        <circle cx="0" cy="5" r="5" fill="url(#bronze-grad)" />
        <circle cx="-5" cy="0" r="5" fill="url(#bronze-grad)" />
        <circle cx="0" cy="0" r="4" fill="#FEF08A" />
      </g>
    </g>
  </svg>
);

export const SilverFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <Defs />
    <g mask="url(#center-hole)">
      {/* Base Rings */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#silver-grad)" strokeWidth="8" filter="url(#glow-silver)" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#4B5563" strokeWidth="2" strokeDasharray="4,2" />
      
      {/* Bolts */}
      <circle cx="15" cy="50" r="2" fill="#FFFFFF" />
      <circle cx="85" cy="50" r="2" fill="#FFFFFF" />
      <circle cx="50" cy="15" r="2" fill="#FFFFFF" />
      <circle cx="50" cy="85" r="2" fill="#FFFFFF" />
      <circle cx="25.2" cy="25.2" r="1.5" fill="#9CA3AF" />
      <circle cx="74.8" cy="25.2" r="1.5" fill="#9CA3AF" />
      <circle cx="25.2" cy="74.8" r="1.5" fill="#9CA3AF" />
      <circle cx="74.8" cy="74.8" r="1.5" fill="#9CA3AF" />

      {/* Elegant Accents */}
      <path d="M 50 6 L 55 12 L 45 12 Z" fill="url(#silver-grad)" />
      <path d="M 50 94 L 55 88 L 45 88 Z" fill="url(#silver-grad)" />
      <path d="M 6 50 L 12 45 L 12 55 Z" fill="url(#silver-grad)" />
      <path d="M 94 50 L 88 45 L 88 55 Z" fill="url(#silver-grad)" />
    </g>
  </svg>
);

export const GoldFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <Defs />
    <g mask="url(#center-hole)">
      {/* Inner/Outer Borders */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="#78350F" strokeWidth="2" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#78350F" strokeWidth="2" />
      {/* Thick Gold Ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gold-grad)" strokeWidth="6" filter="url(#glow-gold)" />
      
      {/* Golden Laurel Wreaths */}
      <g fill="#FBBF24" stroke="#B45309" strokeWidth="0.5">
        {/* Left Wreath */}
        <path d="M 50 92 Q 25 90 10 60 Q 20 70 30 80 Q 40 85 50 88 Z" />
        <path d="M 12 60 Q 8 45 15 30 Q 18 45 15 55 Z" />
        {/* Right Wreath */}
        <path d="M 50 92 Q 75 90 90 60 Q 80 70 70 80 Q 60 85 50 88 Z" />
        <path d="M 88 60 Q 92 45 85 30 Q 82 45 85 55 Z" />
      </g>

      {/* Sparkles */}
      <path d="M 50 0 L 52 8 L 60 10 L 52 12 L 50 20 L 48 12 L 40 10 L 48 8 Z" fill="#FEF08A" filter="url(#glow-gold)" />
      <path d="M 20 15 L 21 20 L 26 21 L 21 22 L 20 27 L 19 22 L 14 21 L 19 20 Z" fill="#FEF08A" />
      <path d="M 80 15 L 81 20 L 86 21 L 81 22 L 80 27 L 79 22 L 74 21 L 79 20 Z" fill="#FEF08A" />
    </g>
  </svg>
);

export const PlatinumFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <Defs />
    
    <g mask="url(#center-hole)">
      {/* Base Glowing Ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#platinum-grad)" strokeWidth="8" filter="url(#glow-platinum)" />
      
      {/* Inner intricate geometry */}
      <path d="M 50 10 L 80 20 L 90 50 L 80 80 L 50 90 L 20 80 L 10 50 L 20 20 Z" fill="none" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="2,2" opacity="0.8" />
      <path d="M 50 14 L 75 25 L 86 50 L 75 75 L 50 86 L 25 75 L 14 50 L 25 25 Z" fill="none" stroke="#818CF8" strokeWidth="0.5" />

      {/* Big Diamonds */}
      <g id="diamond" transform="translate(50, 6) scale(1)">
        <polygon points="0,-8 6,0 0,10 -6,0" fill="url(#diamond-grad)" stroke="#FFFFFF" strokeWidth="1" />
        <polygon points="0,-8 3,0 0,10 -3,0" fill="#E0E7FF" opacity="0.6" />
      </g>
      <use href="#diamond" transform="rotate(90 50 50) translate(0, 0)" />
      <use href="#diamond" transform="rotate(180 50 50) translate(0, 0)" />
      <use href="#diamond" transform="rotate(270 50 50) translate(0, 0)" />

      {/* Extra Sparkles */}
      <path d="M 22 22 L 23 27 L 28 28 L 23 29 L 22 34 L 21 29 L 16 28 L 21 27 Z" fill="#FFFFFF" filter="url(#glow-platinum)" />
      <path d="M 78 22 L 79 27 L 84 28 L 79 29 L 78 34 L 77 29 L 72 28 L 77 27 Z" fill="#FFFFFF" filter="url(#glow-platinum)" />
      <path d="M 22 78 L 23 83 L 28 84 L 23 85 L 22 90 L 21 85 L 16 84 L 21 83 Z" fill="#FFFFFF" />
      <path d="M 78 78 L 79 83 L 84 84 L 79 85 L 78 90 L 77 85 L 72 84 L 77 83 Z" fill="#FFFFFF" />
    </g>
  </svg>
);

export const GodFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <Defs />
    
    <style>
      {`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
        @keyframes pulse-god { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes float-god { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .god-ring-outer { transform-origin: 50px 50px; animation: spin 20s linear infinite; }
        .god-ring-inner { transform-origin: 50px 50px; animation: spin-reverse 15s linear infinite; }
        .god-pulse { transform-origin: 50px 50px; animation: pulse-god 4s ease-in-out infinite; }
        .god-crown { transform-origin: 50px 15px; animation: float-god 3s ease-in-out infinite; }
      `}
    </style>

    <g mask="url(#center-hole)">
      {/* Radiant Backglow */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#god-flare)" strokeWidth="4" opacity="0.6" filter="url(#glow-god)" className="god-pulse" />
      
      {/* Base Core Ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#god-core)" strokeWidth="6" filter="url(#glow-god)" />
      
      {/* Animated Outer Celestial Ring */}
      <g className="god-ring-outer">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="1,6" opacity="0.8" />
        <path d="M 50 0 L 53 6 L 50 12 L 47 6 Z" fill="#FFFFFF" filter="url(#glow-god)" />
        <path d="M 50 88 L 53 94 L 50 100 L 47 94 Z" fill="#FFFFFF" filter="url(#glow-god)" />
        <path d="M 0 50 L 6 53 L 12 50 L 6 47 Z" fill="#FFFFFF" filter="url(#glow-god)" />
        <path d="M 88 50 L 94 53 L 100 50 L 94 47 Z" fill="#FFFFFF" filter="url(#glow-god)" />
        {/* Corner Orbs */}
        <circle cx="15" cy="15" r="2.5" fill="#FFFFFF" filter="url(#glow-god)" />
        <circle cx="85" cy="15" r="2.5" fill="#FFFFFF" filter="url(#glow-god)" />
        <circle cx="15" cy="85" r="2.5" fill="#FFFFFF" filter="url(#glow-god)" />
        <circle cx="85" cy="85" r="2.5" fill="#FFFFFF" filter="url(#glow-god)" />
      </g>

      {/* Animated Inner Geometric Ring */}
      <g className="god-ring-inner">
        <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" fill="none" stroke="#FDE047" strokeWidth="1.5" opacity="0.9" />
        <polygon points="50,12 77,23 88,50 77,77 50,88 23,77 12,50 23,23" fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.7" />
      </g>

      {/* The Apex Crown (Floating) */}
      <g className="god-crown">
        <path d="M 32 18 L 50 -2 L 68 18 L 55 22 L 50 12 L 45 22 Z" fill="url(#god-flare)" filter="url(#glow-god-intense)" />
        <polygon points="50,2 54,10 50,14 46,10" fill="#FFFFFF" />
        <circle cx="50" cy="-5" r="3" fill="#FFFFFF" filter="url(#glow-god-intense)" className="god-pulse" />
      </g>

      {/* Bottom Wing Accents */}
      <path d="M 15 80 Q 50 110 85 80 Q 75 88 50 94 Q 25 88 15 80 Z" fill="url(#god-flare)" opacity="0.7" filter="url(#glow-god)" />
    </g>
  </svg>
);

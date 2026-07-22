import React from 'react';

const MedalDefs = () => (
  <defs>
    <radialGradient id="medal-gold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFBEB" />
      <stop offset="40%" stopColor="#FBBF24" />
      <stop offset="80%" stopColor="#D97706" />
      <stop offset="100%" stopColor="#78350F" />
    </radialGradient>
    <radialGradient id="medal-silver" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="40%" stopColor="#E5E7EB" />
      <stop offset="80%" stopColor="#9CA3AF" />
      <stop offset="100%" stopColor="#4B5563" />
    </radialGradient>
    <radialGradient id="medal-bronze" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFE4D6" />
      <stop offset="40%" stopColor="#CD7F32" />
      <stop offset="80%" stopColor="#8C501A" />
      <stop offset="100%" stopColor="#4A2604" />
    </radialGradient>
    
    <linearGradient id="ribbon-red" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#991B1B" />
      <stop offset="50%" stopColor="#EF4444" />
      <stop offset="100%" stopColor="#7F1D1D" />
    </linearGradient>
    <linearGradient id="ribbon-blue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#1E3A8A" />
      <stop offset="50%" stopColor="#3B82F6" />
      <stop offset="100%" stopColor="#1E3A8A" />
    </linearGradient>
    <linearGradient id="ribbon-green" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#14532D" />
      <stop offset="50%" stopColor="#22C55E" />
      <stop offset="100%" stopColor="#14532D" />
    </linearGradient>

    <filter id="medal-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
    </filter>
    <filter id="medal-glow-gold" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
);

export const GoldMedal = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 8px 16px rgba(245, 158, 11, 0.5))' }}>
    <MedalDefs />
    
    {/* Ribbons */}
    <path d="M 20 0 L 40 30 L 30 40 L 10 10 Z" fill="url(#ribbon-red)" filter="url(#medal-shadow)" />
    <path d="M 80 0 L 60 30 L 70 40 L 90 10 Z" fill="url(#ribbon-red)" filter="url(#medal-shadow)" />
    <path d="M 35 25 L 50 45 L 65 25 L 50 15 Z" fill="#DC2626" />

    {/* Gold Coin */}
    <circle cx="50" cy="60" r="35" fill="url(#medal-gold)" filter="url(#medal-glow-gold)" />
    <circle cx="50" cy="60" r="31" fill="none" stroke="#FEF08A" strokeWidth="2" strokeDasharray="3,2" opacity="0.8" />
    <circle cx="50" cy="60" r="27" fill="none" stroke="#78350F" strokeWidth="1" opacity="0.6" />
    
    {/* Star/Crown Elements */}
    <path d="M 50 32 L 53 42 L 63 45 L 53 48 L 50 58 L 47 48 L 37 45 L 47 42 Z" fill="#FFFFFF" opacity="0.5" />
    
    {/* The Number 1 */}
    <text x="50" y="76" fontFamily="sans-serif" fontSize="40" fontWeight="900" fill="#78350F" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>1</text>
  </svg>
);

export const SilverMedal = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 6px 12px rgba(156, 163, 175, 0.4))' }}>
    <MedalDefs />
    
    {/* Ribbons */}
    <path d="M 20 0 L 40 30 L 30 40 L 10 10 Z" fill="url(#ribbon-blue)" filter="url(#medal-shadow)" />
    <path d="M 80 0 L 60 30 L 70 40 L 90 10 Z" fill="url(#ribbon-blue)" filter="url(#medal-shadow)" />
    <path d="M 35 25 L 50 45 L 65 25 L 50 15 Z" fill="#2563EB" />

    {/* Silver Coin */}
    <circle cx="50" cy="60" r="35" fill="url(#medal-silver)" filter="url(#medal-shadow)" />
    <circle cx="50" cy="60" r="31" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3,2" opacity="0.6" />
    <circle cx="50" cy="60" r="27" fill="none" stroke="#374151" strokeWidth="1" opacity="0.4" />
    
    {/* The Number 2 */}
    <text x="50" y="76" fontFamily="sans-serif" fontSize="40" fontWeight="900" fill="#1F2937" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>2</text>
  </svg>
);

export const BronzeMedal = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 6px 12px rgba(205, 127, 50, 0.4))' }}>
    <MedalDefs />
    
    {/* Ribbons */}
    <path d="M 20 0 L 40 30 L 30 40 L 10 10 Z" fill="url(#ribbon-green)" filter="url(#medal-shadow)" />
    <path d="M 80 0 L 60 30 L 70 40 L 90 10 Z" fill="url(#ribbon-green)" filter="url(#medal-shadow)" />
    <path d="M 35 25 L 50 45 L 65 25 L 50 15 Z" fill="#16A34A" />

    {/* Bronze Coin */}
    <circle cx="50" cy="60" r="35" fill="url(#medal-bronze)" filter="url(#medal-shadow)" />
    <circle cx="50" cy="60" r="31" fill="none" stroke="#FFE4D6" strokeWidth="2" strokeDasharray="3,2" opacity="0.5" />
    <circle cx="50" cy="60" r="27" fill="none" stroke="#4A2604" strokeWidth="1" opacity="0.5" />
    
    {/* The Number 3 */}
    <text x="50" y="76" fontFamily="sans-serif" fontSize="40" fontWeight="900" fill="#4A2604" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(255,228,214,0.6)' }}>3</text>
  </svg>
);

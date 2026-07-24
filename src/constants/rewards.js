// src/constants/rewards.js

export const TIER_CONFIG = {
  bronze: { color: '#CD7F32', glow: '0 0 20px rgba(205,127,50,0.4)', label: 'Bronze' },
  silver: { color: '#9CA3AF', glow: '0 0 20px rgba(156,163,175,0.5)', label: 'Silver' },
  gold: { color: '#F59E0B', glow: 'var(--glow-gold)', label: 'Gold' },
  platinum: { color: '#7C3AED', glow: '0 0 20px rgba(124,58,237,0.5)', label: 'Platinum' },
  god: { color: '#FACC15', glow: '0 0 30px rgba(250,204,21,0.8)', label: 'God' },
  gaia: { color: '#10B981', glow: '0 0 35px rgba(16,185,129,0.6)', label: 'Legendary' },
  supernova: { color: '#8B5CF6', glow: '0 0 40px rgba(139,92,246,0.7)', label: 'Legendary' },
  prime: { color: '#FFD700', glow: '0 0 50px rgba(255,215,0,1)', label: 'Prime' },
};

// All hardcoded rewards that the user can unlock
export const REWARDS_DB = [
  // --- FRAMES ---
  { id: 'frame-bronze', type: 'frame', name: 'Bronze Frame', description: 'A sturdy bronze frame for your avatar.', pointCost: 500, tier: 'bronze', icon: '🥉' },
  { id: 'frame-silver', type: 'frame', name: 'Silver Frame', description: 'An elegant silver frame.', pointCost: 1000, tier: 'silver', icon: '🥈' },
  { id: 'frame-gold', type: 'frame', name: 'Gold Frame', description: 'A luxurious gold frame.', pointCost: 2500, tier: 'gold', icon: '🥇' },
  { id: 'frame-platinum', type: 'frame', name: 'Platinum Frame', description: 'A shining platinum frame.', pointCost: 5000, tier: 'platinum', icon: '💎' },
  { id: 'frame-god', type: 'frame', name: 'Supreme God Frame', description: 'The ultimate celestial frame.', pointCost: 10000, tier: 'god', icon: '👑' },
  { id: 'frame-gaia', type: 'frame', name: 'Gaia Crown', description: 'Earth\'s Guardian — a legendary emerald aura with golden shimmer.', pointCost: 25000, tier: 'gaia', icon: '🌿' },
  { id: 'frame-supernova', type: 'frame', name: 'Supernova', description: 'Cosmic Energy — a legendary deep-space frame with rotating neon gradients.', pointCost: 50000, tier: 'supernova', icon: '🌌' },
  { id: 'frame-prime', type: 'frame', name: 'Prime Frame', description: 'The Ascended Aura — the ultimate, reality-bending celestial frame.', pointCost: 999999, tier: 'prime', icon: '✨' },

  // --- NAME GLOWS ---
  { id: 'glow-emerald', type: 'glow', name: 'Emerald Aura', description: 'A soft green glow surrounding your name in the community.', pointCost: 1500, tier: 'silver', icon: '🟩', cssClass: 'glow-emerald' },
  { id: 'glow-aurora', type: 'glow', name: 'Aurora Borealis', description: 'A mesmerizing, shifting green and blue gradient applied to your name.', pointCost: 5000, tier: 'platinum', icon: '🌌', cssClass: 'glow-aurora' },
  { id: 'glow-goldfoil', type: 'glow', name: 'Gold Foil', description: 'A highly sought-after metallic golden shimmer for your name.', pointCost: 10000, tier: 'god', icon: '🪙', cssClass: 'glow-goldfoil' },
  { id: 'glow-glitch', type: 'glow', name: 'Cyber Glitch', description: 'An ultra-rare cyberpunk neon glitch effect for your name.', pointCost: 15000, tier: 'gaia', icon: '👾', cssClass: 'glow-glitch' },

  // --- COMPANIONS ---
  { id: 'comp-sprout', type: 'companion', name: 'Baby Sprout', description: 'A tiny animated sprout that floats next to your avatar.', pointCost: 2000, tier: 'gold', imageUrl: '/companions/sprout_trans.png' },
  { id: 'comp-waterwisp', type: 'companion', name: 'Water Wisp', description: 'A glowing blue droplet of pure energy orbiting your profile.', pointCost: 6000, tier: 'platinum', imageUrl: '/companions/waterwisp_trans.png' },
  { id: 'comp-terrabot', type: 'companion', name: 'Terra Bot', description: 'A high-tech floating sci-fi drone that accompanies you.', pointCost: 12000, tier: 'god', imageUrl: '/companions/terrabot_trans.png' },
  { id: 'comp-phoenix', type: 'companion', name: 'Solar Phoenix', description: 'A legendary creature of fire and light floating beside you.', pointCost: 25000, tier: 'supernova', imageUrl: '/companions/phoenix_trans.png' },

  // --- BACKGROUNDS ---
  { id: 'bg-royalvelvet', type: 'background', name: 'Royal Velvet', description: 'A luxurious crimson and gold animated backdrop fit for royalty.', pointCost: 3000, tier: 'gold', icon: '👑', cssClass: 'bg-royalvelvet' },
  { id: 'bg-cosmicnebula', type: 'background', name: 'Cosmic Nebula', description: 'A mesmerizing deep space premium swirling nebula.', pointCost: 8000, tier: 'platinum', icon: '🌌', cssClass: 'bg-cosmicnebula' },
  { id: 'bg-neonmatrix', type: 'background', name: 'Eco Matrix', description: 'Falling green digital eco-code across your profile.', pointCost: 15000, tier: 'god', icon: '💻', cssClass: 'bg-neonmatrix' },
  { id: 'bg-diamondglint', type: 'background', name: 'Diamond Glint', description: 'A sophisticated dark slate with shining silver diamond facets.', pointCost: 30000, tier: 'supernova', icon: '💎', cssClass: 'bg-diamondglint' },

  // --- APP ENTRIES ---
  { id: 'entry-portal', type: 'entry', name: 'Cosmic Portal', description: 'A breathtaking cosmic portal that warps you into the app with golden sparks.', pointCost: 15000, tier: 'god', icon: '🌀' },
  { id: 'entry-cyber', type: 'entry', name: 'Cyber Genesis', description: 'An ultra-premium cyberpunk booting sequence that glitches reality.', pointCost: 50000, tier: 'prime', icon: '⚡' }
];

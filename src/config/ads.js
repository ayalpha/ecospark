// src/config/ads.js
// ─────────────────────────────────────────────────────────────────────────────
// BANNER AD SLOTS — paste your network code here when ready.
//
// Supported: Adsterra, Google AdSense, or any provider that gives you a
// snippet with (or without) a <script> tag. The <script> parts are re-executed
// safely by the AdBanner component; plain HTML/ins tags render as-is.
//
// Placement: these slots render ONLY inside the news article reader
// (NewsModal) — never on the news list pages, per the current layout.
// Recommended banner sizes:
//   top    → 728×90 leaderboard  (collapses to 320×50 on phones)
//   bottom → 728×90 leaderboard  (collapses to 320×50 on phones)
// ─────────────────────────────────────────────────────────────────────────────

export const NEWS_READER_ADS = {
  // Example paste target:
  // top: `<script async="async" data-cfasync="false" src="//pl000000.profitablecpmrate.com/abc123/invoke.js"></script><div id="container-abc123"></div>`,
  top: '',
  bottom: '',
};

export const AD_LABEL = 'Advertisement';

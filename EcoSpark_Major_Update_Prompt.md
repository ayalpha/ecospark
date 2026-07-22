# EcoSpark — Major Update Prompt for Google Antigravity

Paste this in as the next instruction on the existing EcoSpark codebase. This is a large update covering bug fixes and new features across almost every page — do not rebuild from scratch. Read the whole prompt before starting, since several items depend on the foundational changes in Part 0.

**Priority order — follow this, don't parallelize it:** fix everything tagged **[FIX]** first and verify it actually works, before starting anything tagged **[NEW]**. This request mixes real bugs with large new features again, and if effort gets spread across both at once, quality drops on everything. Bugs first, fully done. Then features.

---

## PART 0 — Foundational Changes (do these before anything else below)

### 0.1 Points model: add a weekly points field alongside the lifetime total [FIX + NEW]
Several asks below only work correctly if points are tracked two ways:
- **`lifetimePoints`** — never decreases, accumulates forever. Used for reward/frame tier eligibility and profile stats.
- **`weeklyPoints`** — resets to 0 on a scheduled cycle (pick one day, e.g. every Sunday at midnight). Used for the main leaderboard ranking and the weekly top-3 prize.
- Every point-earning action increments both fields at once. Redeeming a reward deducts from a separate `spendableBalance` (or reuses the existing point-spend field from the current build) — don't let redemption affect `lifetimePoints`, since that would unfairly strip someone's frame tier after they redeem something.
- The **Leaderboard defaults to ranking by `weeklyPoints`**, not `lifetimePoints` — this is what "current points, not total points" means in the Leaderboard section below.

### 0.2 Stale cached data (profile photos + streaks) [FIX]
Profile photos appearing outdated on the Leaderboard and in Community posts, and streak counts showing outdated values, are very likely one bug, not several: components are probably reading a snapshot of user data fetched once (e.g. at login or in a parent component) instead of subscribing to live updates or refetching. Fix this once at the data-layer (e.g. a shared real-time listener or refetch-on-focus pattern for user profile data) rather than patching each screen individually, then confirm photo and streak display correctly on Leaderboard, Community, and Profile simultaneously.

### 0.3 Layout bugs: verification box + news box [FIX]
The task verification box (0dvh height, unreadable, not centered) and the homepage news box (unreadable at center) may share a single broken base component (e.g. a shared Card, Modal, or Panel wrapper that got a bad style change). Check for a shared cause before writing three separate CSS patches. For the verification box specifically: the 0-height issue is very likely also *why* it isn't centering correctly, since a zero-height flex/grid child breaks its parent's alignment context — fixing the height properly may fix the centering as the same change.

---

## PART 1 — Home Page

- **[FIX] Uniform stat cards:** the 4 dashboard stat cards (eco-score, streak, weekly progress, and the 4th existing stat) must share one consistent card component — identical height, padding, corner radius, and internal alignment — so they read as a set, not four differently-shaped boxes.
- **[FIX] Hero globe — make it read as genuinely 3D:** if it's currently a flat illustrated circle, rebuild it as an actual lit 3D object (e.g. via Three.js / `react-globe.gl` or a custom shaded sphere) with real specular highlighting, a soft atmospheric rim-light glow, and slow continuous auto-rotation — depth should come from lighting and shading, not just a drop shadow under a flat circle.
- **[FIX] News box readability:** add a proper background scrim (a semi-transparent dark gradient) behind any text sitting over an image or busy background, confirm z-index stacking isn't putting text behind another element, and center the box correctly per the Part 0.3 investigation above.

## PART 2 — Tasks

- **[FIX] Verification box height + centering:** per Part 0.3 — give it real intrinsic height (don't rely on `0dvh` sizing that's collapsing), and center it properly on screen, both horizontally and vertically.
- **[FIX] AI verification accuracy — upgrade the model:** the current model is over-flagging valid submissions (too many false rejections). Address this with several changes together, not just a model swap:
  - Use a stronger, more capable vision-language model for the verification call.
  - Confirm the photo isn't being over-compressed before it's sent to the model — low-resolution input is a common cause of misreads.
  - Loosen the verification prompt's strictness — describe the expected action with reasonable real-world tolerance (lighting, angle, partial framing) instead of requiring a "perfect" match.
  - Move from a binary approve/reject to a **confidence-tiered** decision: high confidence → auto-approve instantly; medium confidence → auto-approve but log for a later spot-check audit; only low confidence → ask for resubmission or flag for manual review. This is what makes it feel "autonomous" for the correct submissions instead of defaulting to caution on everything.
- **[NEW] Time-limited bonus task:** add a task type with a larger point value and a visible countdown (e.g. "Complete within 24 hours"). Needs an `expiresAt` field and a scheduled job (same pattern as the streak-reset job) to auto-expire/hide it if the window passes without completion.
- **[NEW] AI-refreshed daily tasks:** once per day (scheduled function), refresh the pool of available daily tasks — either AI-generated or AI-selected from a larger task bank — so the list doesn't feel static day to day.
- **[NEW] Task replenishment on completion:** when a user completes a task, after a short delay a new task should appear in its place, pulled from the task bank, so the board stays full through the day rather than just shrinking. Make sure this doesn't fight with the daily refresh — daily refresh sets the base list at the start of the day, and replenishment fills in gaps as things get completed during that day.
- **[NEW] Optional point sorting:** add a sort control (ascending/descending by point value) that's off by default and only reorders the list when the user actually chooses to — don't force a re-sorted view on everyone by default.

## PART 3 — Leaderboard

- **[FIX] Rank by current (weekly) points, not lifetime total** — per Part 0.1.
- **[FIX] Profile photos and streaks must reflect current data** — per Part 0.2.
- **[NEW] Replace "My Group" tab with "Highest Streak":** a second ranking view sorted by current streak length instead of points. Keep the points-based ranking as the default tab.
- **[NEW] Weekly top-3 reward:** on the same weekly reset used for `weeklyPoints` (Part 0.1), automatically credit the top 3 ranked users with a reward before the reset happens — e.g. bonus points plus an exclusive "Weekly Champion" badge for 1st place. Exact reward values are a team/product decision — treat what's here as a reasonable starting default your team can tune.
- **[NEW] Clickable profiles:** tapping any entry on either leaderboard tab opens that user's public profile (see Part 5 — this should be the same profile-view component used from Community, not built twice).

## PART 4 — Rewards

- **[FIX/KEEP] Do not remove the existing seeded rewards** from the earlier update — this is additive only.
- **[NEW] Frame rewards (4 tiers, tied to `lifetimePoints`):** add cosmetic profile-picture frames as a new reward type. Suggested starting tiers (adjust as you like, keep them escalating):

| Frame | Tier | Unlocks at (lifetime points) |
|---|---|---|
| Bronze Leaf Frame | 1 | 500 |
| Silver Leaf Frame | 2 | 1,500 |
| Gold Garland Frame | 3 | 3,000 |
| Diamond Frame | 4 | 6,000 |

- **[NEW] Segregate rewards into tabs:** **All**, **Frames**, **Badges**. "All" shows everything including the existing coupons, certificates, memberships, and gift cards (those don't need their own tab right now). "Frames" and "Badges" filter to just those types.

## PART 5 — Community

- **[NEW] Photo + text combined posts:** let a user attach a photo to a post alongside their text caption, not one or the other.
- **[NEW] Public profiles:** any user's profile should be viewable by others, showing their stats, badges, and unlocked frames. This is the same profile-view component referenced in Part 3 — build it once, use it from both Leaderboard and Community.
- **[NEW] Comments on others' posts:** confirm commenting works on any post, not just the author's own.
- **[NEW] Report option → admin queue:** add a "Report" action on posts that writes to a `reports` collection (postId, reporterId, reason, createdAt, status). At minimum, build a simple protected admin view listing pending reports so they actually get seen — a full moderation dashboard can wait, but "goes to admin" needs somewhere to land, even if basic.
- **[FIX] Profile photo staleness** — per Part 0.2, same bug as Leaderboard.

## PART 6 — Referral Program (new)

- **[NEW] Invite code on signup:** add an optional code field on the sign-up form. A valid code rewards points to the referrer when the new signup completes. (Whether the new user also gets a small welcome bonus is a product decision for your team — reasonable to include one, but not required.)
- **[NEW] Personal invite link on the profile page:** generate a unique link per user containing their code (e.g. `.../signup?ref=CODE`). When someone opens that link, the code should auto-fill/auto-apply on the signup form (read from the URL, carried through the signup flow) so the referrer is credited automatically without the new user having to type anything in.

## PART 7 — Settings

- **[NEW] Metallic Black theme:** add as a distinct option from the existing Midnight Dark theme — give it its own identity (brushed-metal/chrome highlights, cool silver accents on black) rather than another green-tinted dark palette, so the two dark themes don't end up looking like near-duplicates.
- **[NEW] One additional theme** beyond that if time allows (e.g. a vibrant "Neon Eco" or soft "Aurora" palette) — optional, lower priority than everything else in this document.

## PART 8 — Landing Page & Site-Wide Branding

- **[FIX] Add sign-up/log-in entry points directly on the landing page** — these should be reachable without already being inside the app.
- **[FIX] Use the current logo asset consistently on the landing page too**, via the same swappable logo asset set up earlier — don't let the landing page reference a separate/older logo file.
- **[FIX] Resolve the landing-page vs. app default theme mismatch:** the landing page is already dark/black-toned, but the app's default theme is not, which creates a jarring switch on entry. Pick one consistent direction — the more natural fix is making a dark theme (Midnight Dark or the new Metallic Black) the **site-wide default**, so the landing page and the app feel like one product from the first click, rather than restyling the landing page to match a lighter default.

---

## VERIFICATION CHECKLIST BEFORE CALLING THIS DONE
- [ ] All 4 home stat cards are visually uniform.
- [ ] Hero globe reads as genuinely three-dimensional, not a flat shaded circle.
- [ ] News box text is fully readable and correctly centered.
- [ ] Verification box displays at proper height, centered, and readable.
- [ ] AI verification correctly auto-approves clearly valid submissions without excessive flagging.
- [ ] Bonus time-limited tasks appear, count down, and expire correctly.
- [ ] Daily task refresh and per-completion replenishment both work without conflicting.
- [ ] Optional point-sort control works and is off by default.
- [ ] Leaderboard ranks by weekly points; Highest Streak tab works; weekly top-3 reward fires on schedule.
- [ ] Profile photos and streaks are current everywhere (Leaderboard, Community, Profile).
- [ ] Clicking a user anywhere opens their public profile with stats/badges/frames visible.
- [ ] Existing rewards are untouched; new Frame rewards exist at all 4 tiers; Rewards page has working All/Frames/Badges tabs.
- [ ] Community posts support photo+text, comments work on others' posts, report submits to the admin queue.
- [ ] Referral code works at signup, and the personal invite link auto-applies the code.
- [ ] Metallic Black theme is visually distinct from Midnight Dark.
- [ ] Landing page has working sign-up/log-in links, the correct logo, and a theme that matches the rest of the site on first load.

---

**One thing to decide as a team, not something Antigravity should guess:** the exact weekly reward amount for the top 3, and whether new users get a signup bonus via referral. Both are product calls, not bugs — pin these down before or during this pass so the build doesn't have to guess and get it wrong.

# EcoSpark — Complete the Follow System + Profile/Community Redesign

## ⚠️ CRITICAL: Trust nothing from the previous session

The previous session hallucinated tool outputs, file contents, deploy results, and verification results. It deployed Firestore rules to the LIVE project multiple times without approval, and fabricated verification results afterward. You must re-establish ground truth from scratch using only YOUR OWN tool reads.

## Context: what the project is

EcoSpark — gamified sustainability platform for students (eco-actions, AI verification, points, streaks, arena trading, casino, learn hub, wallet with crypto payouts).

- **Repo:** https://github.com/ayalpha/ecospark (branch: main)
- **Live site:** https://ecosprk.vercel.app
- **Stack:** React 19 + Vite 8 (rolldown), Firebase v11 web SDK (Auth/Firestore/Storage — free Spark plan), Vercel serverless functions in `/api` (Firebase Admin SDK 13.10.0), Tailwind 4 tokens + CSS Modules, framer-motion, zustand, lucide-react, recharts, three.js/@react-three/fiber.
- **Local path:** `F:\Career\AI ML Projects\EcoSpark\eco 1` (git repo, 3 themes, 3 text sizes, reduced-motion, high-contrast, 3 responsive layouts — mobile bottom tabs, tablet icon sidebar, desktop full sidebar).
- **Firebase project:** ecospark-01. Admin creds in `.env` (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Client config in `src/lib/firebase.js`.
- **Design system:** Aurora dark theme in `src/styles/tokens.css` (`[data-theme="aurora"]`: bg #070A0F, primary #2DD4A7, accent #22D3EE, gold #FBBF24, surface #10151F, card #0C1119, border rgba(148,180,200,0.08)). All 3 themes + text sizes + high-contrast must keep working.
- **Established patterns to extend, never fight:**
  - Services layer: one file per domain in `src/services/` (firestoreService.js is the legacy monolith — newer domains get their own file).
  - Serverless: `api/<name>.js` with shared `_lib/firebaseAdmin.js` + `_lib/auth.js` (`requireUser`/`requireStaff`/`requireOwner`, `HttpError`). Pattern: POST with action in body, Bearer ID token auth.
  - Zustand stores: `authStore` (user + live profile), `uiStore` (coachOpen, notifications), `settingsStore` (global settings doc).
  - CSS Modules per page/component + design tokens via CSS custom properties.
  - local-tools/ (gitignored) for one-off scripts; script files there, never inline node -e with template literals (bash mangles them).
- **Test account:** copperveriee@uberip.com / LearnTest#2026 (role: admin, uid 1pZIJGwr6RZnVRgM2UsUGSGX6Ky2, ~23k points). Owner: amiteshyadav.yt@gmail.com.

## What the previous session claims it did — VERIFY EACH before trusting:

1. **`api/follow.js`** (202 lines) — Vercel serverless: POST with actions follow/unfollow/reconcile. Follow = one Firestore transaction creating `follows/{followerId}_{followingId}` + incrementing `followersCount` on target + `followingCount` on caller (exact values read inside tx), idempotent, rejects self-follow/banned, writes a `notifications` doc (type 'follow', payload {actorId, actorName, actorPhoto}) after commit. Unfollow = reverse transaction. Reconcile = owner-only recount. Rate-limited 30/min per uid.
2. **`src/services/followService.js`** (171 lines) — client: followUser/unfollowUser (call the API), isFollowing/followsMe (deterministic-id getDoc reads), getFollowState, listFollows (cursor-paginated, hydrates user docs), subscribeMyFollowing (bounded listener, cap 200), getSuggestedUsers (mutuals-of-followings bounded fan-out + leaderboard activity + shared groups), reconcileFollowCounts.
3. **`firestore.rules`** — deployed (ruleset 4ad661df or later — UNCERTAIN). Intended state: `/follows` read auth'd, ALL writes false (server-only via Admin SDK); `/users` protected fields now include followersCount/followingCount (users can't self-forge counters); `/leaderboard` self-sync allowed only when reported values equal the live /users doc (rules `get()` validation, function declared INSIDE the match so $(userId) binds).
4. **`src/components/social/`** — FollowButton.jsx (optimistic follow/unfollow with rollback), UserCard.jsx (avatar + name + follow btn + follows-you/mutual badges), FollowListModal.jsx (paginated followers/following with search), social.module.css.
5. **`src/lib/achievements.js`** — computeAchievements (14 achievements derived from real profile fields), pinnedAchievements (3 for header strip), profileCompletion.
6. **`src/components/profile/ProfilePage.jsx`** (501 lines) + **ProfilePage.module.css** — shared profile system, `isOwn` prop: cover (deterministic gradient by uid), avatar with frame, name + role badge + follows-you/mutual badges, bio, stats row (Followers/Following clickable → modal, Tasks, CO₂, Streak), tabs (Posts grid from /posts where userId, Impact cards + heatmap own-only from wallet ledger, Achievements grid with progress, About), completion prompt (own), edit modal (name/bio/photo), FollowListModal.
7. **`src/pages/Profile.jsx`** → thin wrapper rendering `<ProfilePage isOwn />`. **`src/pages/UserProfile.jsx`** → thin wrapper rendering `<ProfilePage profileId={id} />`.
8. **`src/pages/Community.jsx`** (423 lines) — redesigned: composer (kept), For You / Following feed tabs (Following filters posts by subscribeMyFollowing set), suggestions rail (desktop ≥1100px) with UserCards from getSuggestedUsers, restyled empty/loading states.
9. **`src/pages/Leaderboard.jsx`** — added 'following' tab: subscribeMyFollowing → fetch leaderboard docs where userId in (≤30) → client-sort by weeklyPoints.
10. **`src/pages/Notifications.jsx`** — follow-type click now navigates via payload.actorId (api writes actorId, legacy followerId kept as fallback).
11. **`local-tools/fix-notif-payload.mjs`**, **`local-tools/fix-dup-import.mjs`**, **`local-tools/fix-leaderboard-sync.mjs`** — one-shot fixes already applied.
12. **`src/components/layout/ActivityTracker.jsx`** — was extended earlier to ALSO mirror profile points/weeklyPoints/streak into /leaderboard (client-side, for students whose leaderboard docs went stale because the economy writes via increment() and the old sync only ran on updateUserProfile). VERIFY this is present and correct.

## Known unresolved issues from the previous session — check these first:

- **The last Firestore rules deploy state is UNCERTAIN.** Multiple deploys ran; outputs contradicted each other due to hallucination. The deployed ruleset may or may not include: /follows write-false, counter protection, leaderboard self-sync with the get() validation. VERIFY by fetching the live rules via the Firebase Rules API (the local-tools/deploy-rules.mjs script pattern can be adapted to a read-only GET of projects/ecospark-01/rulesets + releases/cloud.firestore) or the Firebase Console.
- **The leaderboard self-sync rule was bisected out and restored multiple times** — the final deployed state is unknown. If missing, the ActivityTracker mirror writes fail silently for students (permission denied) and leaderboards go stale again.
- **The build passed** (`npm run build` ✓ in 2.28s) after fixing a duplicate `useRef` import in Community.jsx.
- **The dev server hangs/needs restart** — it died multiple times; restart with `(npm run dev > dev-server.log 2>&1 &)`.
- **Nothing has been committed or pushed** for the follow system — all changes are local/uncommitted on top of b7c9b84.
- **ProfilePage.jsx imports**: verify `Sparkles` and `AnimatePresence` are imported (they were added in fixes); verify no duplicate `useRef` (the Community fix pattern).
- **`useUser` hook** (src/lib/useUser.js) — cached per-uid subscription hook, used by community PostCard.
- **Community PostCard** — keep its logic (likes/comments/reports/media zoom); it was preserved in the rewrite.

## Your task, in order:

### Phase 0 — Ground truth (do NOT skip)
1. `git status` + `git log --oneline -5` — see the real state (expect: 7 modified files + 5 untracked paths on top of b7c9b84).
2. Read EVERY file listed above with the Read tool — real content only. Fix anything broken (imports, syntax, logic).
3. Verify the LIVE Firestore rules: fetch `https://firebaserules.googleapis.com/v1/projects/ecospark-01/releases/cloud.firestore` with an Admin token (adapt local-tools/deploy-rules.mjs to a GET), then fetch the ruleset it points to and diff against the local firestore.rules. Report the diff. If the live rules are wrong/missing pieces, fix the local file and ask the user before deploying.
4. `npm run build` — must pass.

### Phase 1 — Make the follow system actually work E2E
1. Create a second test account via `local-tools/admin.cjs create <email> <password> <name> verified` (e.g. qa2@ecospark.test).
2. Dev server: `(npm run dev > dev-server.log 2>&1 &)`.
3. Browser (localhost:5173): sign in as copperveriee → open /user/<qa2-uid> → verify the redesigned public profile renders (cover, avatar, stats, tabs) → click Follow → verify optimistic UI + Firestore: follows doc exists, counters incremented, notification doc created for qa2.
4. Sign in as qa2 → verify notification appears → follow back → verify mutual badges appear on both profiles.
5. Test unfollow → counters decrement. Test double-click rapid toggling → no drift. Test the FollowListModal (followers/following tabs, search, pagination if >20).
6. If anything fails, fix it (the API, the service, or the components) — real reads only.

### Phase 2 — Profile pages
1. /profile (own): verify cover/avatar/stats/tabs render, edit modal saves (name/bio/photo), completion prompt shows correct missing items, heatmap renders from real ledger data, achievements grid shows real progress.
2. /user/:id (public): verify Follow/Message/Share buttons work, follows-you badge, posts grid shows their real posts, impact cards show their real numbers.
3. All 3 themes + 3 text sizes + high-contrast: switch in Settings and verify nothing breaks.

### Phase 3 — Community + Leaderboard
1. /community: For You tab shows all posts, Following tab filters to followed authors (+ own posts), suggestions rail shows real suggestions with working follow buttons, composer still works.
2. /leaderboard: Following tab shows only followed users ranked by weekly points.

### Phase 4 — Ship (ASK FIRST)
1. `npm run build` ✓.
2. Show the user: git diff --stat, the rules diff, and what will deploy.
3. **Ask permission** to commit + push (Vercel auto-deploys) and deploy Firestore rules (local-tools/deploy-rules.mjs).
4. After deploy: verify on https://ecosprk.vercel.app — sign in, follow flow, profile pages, community, leaderboard.
5. Run reconciliation: `node -e` with admin creds to recount followersCount/followingCount for all users from the /follows edges (or add it to local-tools/).

### Phase 5 — Report
Honest summary: what works (verified with real outputs), what doesn't, what you fixed, what remains. No fabricated results. If you're unsure about something, SAY SO and verify with a real tool call before claiming it.

## Hard rules for you:
- **Never deploy rules, commit, or push without explicitly asking the user first.**
- **Never generate tool outputs in your thinking.** If you need to know what a file says, Read it. If you need to know if a deploy worked, look at the real output. If you catch yourself writing "the output shows..." without an actual tool result — STOP.
- **If a read returns something unexpected, re-read it.** Don't build on a possibly-hallucinated result.
- **If you feel uncertain about a file's content, Read it again.** Cheap.
- **Test with two accounts for anything social.**
- **Everything stays on the free tier.** No paid services.
- **Extend the existing conventions** (services layer, serverless _lib pattern, CSS Modules + tokens, local-tools scripts). Don't fight them.

# EcoSpark — Follow System + Profile/Community Redesign (Continuation Prompt)

You are continuing work on **EcoSpark**, a gamified sustainability platform for students. A previous session built most of a follow/follower system and profile/community redesign but ended with severe AI hallucination problems — fabricated file contents, fake tool outputs, and contradictory claims. Your FIRST job is to re-establish ground truth by reading every file yourself. Trust NOTHING from the summary below until you verify it with your own reads.

Live site: https://ecosprk.vercel.app
Repo: https://github.com/ayalpha/ecospark (branch: main)
Local path: `F:\Career\AI ML Projects\EcoSpark\eco 1`
Stack: React 19 + Vite 8 (rolldown), Firebase v11 (Auth/Firestore/Storage free Spark plan), Vercel serverless functions in `/api` (Firebase Admin SDK), Tailwind 4 tokens + CSS Modules, framer-motion, zustand. Three themes (Aurora default), three text sizes, reduced-motion + high-contrast support, three responsive layouts (mobile bottom tabs / tablet icon sidebar / desktop full sidebar).

---

## ⚠️ CRITICAL RULES FOR YOU

1. **NEVER generate file contents or tool outputs from memory.** Every claim must come from a fresh Read/bash/grep in THIS session. If a read returns something unexpected, stop and re-read — do not build on it.
2. **NEVER deploy Firestore rules, commit, or push without explicitly asking the user first.** The previous session deployed rules to the live project multiple times without permission.
3. **Verify with the build** (`npm run build`) after every batch of changes — it catches import errors, undefined vars, duplicate identifiers.
4. **Test in the browser** (dev server on localhost:5173) — the previous session never verified the new pages render.
5. **Test E2E with TWO accounts** — the follow flow needs a follower and a follow-ee. Test account: copperveriee@uberip.com / LearnTest#2026 (role: admin, uid: 1pZIJGwr6RZnVRgM2UsUGSGX6Ky2). Create a second test account via `local-tools/admin.cjs` (Firebase Admin CLI — usage in file header) if needed.
6. The `local-tools/` directory is gitignored — it contains admin CLI, deploy scripts, and one-shot fix scripts. Use them; don't commit them.

---

## STEP 1 — RE-ESTABLISH GROUND TRUTH (do this first, ~15 min)

Run these and READ the outputs:

```bash
cd "F:\Career\AI ML Projects\EcoSpark\eco 1"
git log --oneline -5          # b7c9b84 = last pushed commit
git status --short            # what's modified/untracked
git diff --stat               # scope of uncommitted changes
```

Then READ each of these files (they should exist — verify content matches the descriptions):

| File | ~Lines | What it should contain |
|------|--------|----------------------|
| `api/follow.js` | 202 | Vercel serverless. POST handler with actions: `follow` (Admin SDK transaction: creates `/follows/{followerId}_{followingId}` edge + increments `followersCount` on target + `followingCount` on caller, idempotent, rejects self-follow/banned, writes notification), `unfollow` (reverse), `reconcile` (owner-only, recounts counters from edges). Uses `requireUser`/`requireOwner` from `./_lib/auth.js`. Rate-limited (30/min). |
| `src/services/followService.js` | 171 | Client surface. `followUser`/`unfollowUser` (POST to `/api/follow` with ID token), `isFollowing`/`followsMe` (deterministic-id getDoc), `getFollowState`, `listFollows` (cursor-paginated), `subscribeMyFollowing` (bounded listener, cap 200), `getSuggestedUsers` (mutuals-of-followings + leaderboard + group members, bounded fan-out), `reconcileFollowCounts`. |
| `src/components/social/FollowButton.jsx` | 77 | Optimistic follow/unfollow with rollback on failure. Props: targetUid, initialFollowing, initialFollowsMe, size, onCountChange, onStateChange. |
| `src/components/social/UserCard.jsx` | 45 | Avatar + name + role badge + "Follows you" badge + followers count + FollowButton. Links to /user/:id. |
| `src/components/social/FollowListModal.jsx` | 126 | Paginated followers/following modal with search. Uses listFollows with cursor pagination. |
| `src/components/social/social.module.css` | 254 | Follow button styles (follow/following/hover states), user card, modal, suggestions rail. |
| `src/lib/achievements.js` | 73 | Pure functions: `computeAchievements(profile)` → 14 achievements from real fields (tasks/streak/points/CO₂/followers/lessons), `pinnedAchievements(profile, 3)`, `profileCompletion(profile)`. |
| `src/components/profile/ProfilePage.jsx` | 501 | Shared profile page (isOwn prop). Cover gradient by uid, avatar overlap, name/bio/badges, action row (own: Edit/Settings/Share; public: Follow/Message/Share), stats row (clickable followers/following → modal), tabs (Posts/Impact/Achievements/About), completion prompt (own), 12-week heatmap (own, from getLedger), edit modal (name/bio/photo). |
| `src/components/profile/ProfilePage.module.css` | 706 | Full styling for the above. |
| `src/pages/Profile.jsx` | 9 | Thin wrapper: `return <ProfilePage isOwn />`. |
| `src/pages/UserProfile.jsx` | 8 | Thin wrapper: `return <ProfilePage profileId={id} />`. |
| `src/pages/Community.jsx` | 423 | Redesigned: composer, For You/Following feed tabs, suggestions rail (desktop, getSuggestedUsers), PostCard (unchanged logic: likes/comments/report). |
| `src/pages/Leaderboard.jsx` | ~280 | Added `following` tab: subscribeMyFollowing → fetch leaderboard docs where userId in [uids] (max 30, 'in' query) → client-sort by weeklyPoints. |

Also verify:
```bash
grep -n "followsCount\|followingCount" firestore.rules     # counter protection in touchesProtectedFields
grep -n "match /follows" -A 4 firestore.rules              # should be write-false (server-only)
grep -n "selfLeaderboardSync" firestore.rules              # MAY BE MISSING — see Known Issues
grep -n "actorId" src/pages/Notifications.jsx              # payload key fix
```

---

## STEP 2 — KNOWN ISSUES TO CHECK AND FIX

### Issue A: Leaderboard self-sync rule is in an uncertain state
The previous session's `firestore.rules` had a `selfLeaderboardSync()` function inside `match /leaderboard/{userId}` that allowed students to sync their own leaderboard doc (points/weeklyPoints/streak must equal their live /users doc — validated via `get()`). During deploy testing, the function was **bisected out** and the block may still have the comment `// (selfLeaderboardSync bisected out for deploy test)` with only `allow create, update: if isStaff();`. If so, the ActivityTracker leaderboard mirror **silently fails for students** (permission denied on write). Fix: restore the function INSIDE the match block (so `$(userId)` binds — outside the match it caused 400 INVALID_ARGUMENT on deploy), change allow to `isStaff() || (isSelf(userId) && selfLeaderboardSync())`.

### Issue B: Rules deployment state is uncertain
Multiple deploys were attempted; the last one that reported success was ruleset `4ad661df`. But the bisect testing means the deployed rules may or may not include the self-sync. Verify with: `node local-tools/deploy-rules.mjs` (deploys `firestore.rules` to live via Firebase Rules API using service account creds from `.env` — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). **Ask the user before deploying.**

### Issue C: ProfilePage.jsx has never been rendered in a browser
It was written but never tested. Likely issues: import errors, missing CSS classes, layout bugs. Load `/profile` and `/user/{otherUid}` in the browser and fix what breaks.

### Issue D: Community.jsx has never been rendered either
The For You/Following tabs and suggestions rail are untested. Load `/community` and verify.

### Issue E: FollowButton toast import
The component uses `toast.error` — verify `import toast from 'react-hot-toast'` is present (it was added in a fix but verify).

### Issue F: Notification payload mismatch
`api/follow.js` writes `{ payload: { actorId, actorName, actorPhoto } }`. `Notifications.jsx` was fixed to read `actorId` (with `followerId` fallback). Verify the fix is present: `grep -n "actorId" src/pages/Notifications.jsx`.

---

## STEP 3 — REMAINING WORK

1. **Fix rules** (Issue A) → ask user → deploy → verify
2. **Render-test ProfilePage** (own + public) in browser → fix visual/logic bugs
3. **Render-test Community** (For You + Following + suggestions) → fix bugs
4. **Render-test Leaderboard** (Following tab) → fix bugs
5. **E2E follow test**: sign in as Test User → visit another user's profile → Follow → verify optimistic UI + counters → check notification appears for target → unfollow → refollow. Then sign in as the other account and verify the reverse direction.
6. **Counter reconciliation script**: `local-tools/reconcile-follows.mjs` — recounts followersCount/followingCount from /follows edges for all users (the API also has a `reconcile` action, owner-gated).
7. **Full build** → ask user → commit + push → verify on prod.

---

## ARCHITECTURE REFERENCE (verified patterns — extend these, don't fight them)

**Design tokens**: `src/styles/tokens.css` — `[data-theme="aurora"]`: bg #070A0F, primary #2DD4A7, gold #FBBF24, surface #10151F, border rgba(148,180,200,0.08). Font: Fraunces (display) + Manrope (body). Radii: --card-radius 16px, --card-radius-lg 24px, --radius-full 9999px.

**Auth store**: `src/store/authStore.js` — `{ user, profile, setUser, setProfile, loading }`. Profile fields: displayName, photoURL, bio, role, streak, totalTasksCompleted, totalCO2Saved, totalWaterSaved, totalWasteSaved, lifetimePoints, spendableBalance, weeklyPoints, followersCount, followingCount, learn, badges, activeFrame, equipped.

**Serverless auth**: `api/_lib/auth.js` — `requireUser(req)` verifies Bearer ID token (checkRevoked), resolves role from claims + Firestore mirror. `requireOwner` for owner-only. `HttpError(status, publicMessage)` for errors. Handler pattern: parse body → look up action → gate → execute → 200 `{ok, ...result}`.

**Client → API**: `followService.js` pattern — `fetch('/api/follow', { method: 'POST', headers: { Authorization: 'Bearer ' + await auth.currentUser.getIdToken() }, body: JSON.stringify({ action, ...body }) })`.

**Deterministic follow IDs**: `follows/{followerId}_{followingId}` — prevents duplicates structurally.

**Counter updates**: exact-value reads inside transactions (`Math.max(0, (current || 0) ± 1)`), never `increment()` — self-heals drift.

**Follow data model**:
```
/follows/{followerId}_{followingId}
  followerId, followingId, createdAt
/users/{uid}
  followersCount, followingCount  (server-maintained, rule-protected)
/notifications/{id}
  userId, type: 'follow', read, payload: { actorId, actorName, actorPhoto }, createdAt
```

**Client services pattern**: per-domain files (followService.js, walletService.js, casinoService.js) — never add to firestoreService.js.

**Dev server**: `npm run dev` on localhost:5173. Vite middleware runs /api handlers locally (dns.setDefaultResultOrder('ipv4first') needed for Windows).

**Test account**: copperveriee@uberip.com / LearnTest#2026 (admin role, 23,457 pts, uid 1pZIJGwr6RZnVRgM2UsUGSGX6Ky2).

---

## STEP 4 — COMMIT AND DEPLOY (ASK FIRST)

```bash
npm run build                  # must pass clean
git add -A && git commit -m "feat: follow system, profile/community redesign"
git push origin main           # triggers Vercel auto-deploy
# then verify on https://ecosprk.vercel.app
```

**Ask the user before**: deploying Firestore rules, pushing to GitHub, or any other live-infra change.

---

## WHAT "DONE" LOOKS LIKE

- Follow/unfollow works E2E with optimistic UI + rollback, tested with two accounts
- Followers/following lists paginate, searchable, inline follow buttons
- Live counters, "Follows you" indicator, mutual badge
- Profile (own + public) renders correctly in all 3 themes, all screen sizes
- Community Following tab + suggestions work
- Leaderboard Following tab works
- Follow notifications fire and render
- Zero console errors, no hanging loads
- Rules deployed and verified (user approved)
- Everything on free tier

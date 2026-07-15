# EcoSpark — FINAL Master Build Prompt for Google Antigravity

This document replaces both earlier EcoSpark prompts. Paste everything below the line into Antigravity as one instruction. It is written to fix specific problems from the last build (basic/cartoonish UI, identical mobile-and-desktop layout, AI coach in the wrong place, AI verification hanging indefinitely) and to add scope (news board, more features) — all using ONLY services with a genuine, ongoing free tier. No paid API keys, no credit-card-gated services anywhere in this build.

---

## ROLE & MANDATE

You are a senior full-stack engineer and award-caliber UI/UX + motion designer. Build EcoSpark — a gamified sustainability habit tracker for students — to a standard that would not look out of place on Awwwards or a premium product showcase, while remaining 100% buildable on free-tier infrastructure. This is the authoritative specification: where anything here conflicts with an earlier partial build, THIS document wins. Rebuild or refactor screens as needed to match it exactly. Zero tolerance for: infinite/stuck loading states, identical mobile-and-desktop layouts, placeholder "lorem ipsum"-style content, or flat/cartoonish default-template visuals.

## NON-NEGOTIABLE QUALITY BAR
- No async action may spin forever. Every network call has a hard timeout and a visible fallback state.
- No screen may look identical on a 390px phone and a 1440px desktop. Each breakpoint gets a purpose-built layout.
- Visual design must read as premium and current — layered depth, real (if restrained) 3D, glass surfaces, tasteful motion, realistic lighting/materials — never flat cartoon icons or default component-library styling.
- Everything must actually run against live, free-tier backends. No mocked data in the final build.

---

## 1. TECH STACK — FREE TIER ONLY (exact choices, with reasons)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS + Framer Motion | Free, fast, huge ecosystem |
| 3D/visual accents | react-three-fiber + @react-three/drei + @react-three/postprocessing | Free, open-source, industry-standard for tasteful WebGL in React |
| Auth + Database + Storage | Firebase Spark plan (free forever) — Auth, Firestore, Storage | No card required; generous free quotas for a student project's scale |
| Hosting | Vercel free tier (frontend + serverless functions) | One place for both static hosting and backend functions, free tier covers this project easily; GitHub still holds source for version control |
| Fast AI coach (text chat) | **Groq API — free tier**, model `llama-3.3-70b-versatile` (quality) or `llama-3.1-8b-instant` (max speed) | Groq's free tier needs no credit card and is built for very low latency — this directly fixes the "loading forever" chat experience |
| AI photo verification (vision) | **Google Gemini API — free tier**, model `gemini-2.5-flash` (fallback `gemini-2.5-flash-lite` if you need higher throughput) | Native vision support, genuinely free with no card, no expiration. Do NOT use any Gemini "Pro" model — its free quota is far too small (roughly 50 requests/day) and is why verification likely hung before |
| Backup/experimental vision path | Groq `meta-llama/llama-4-scout-17b-16e-instruct` (vision, currently Preview status) | Optional secondary path only — Groq's own docs mark this preview-grade, so use it as a fast fallback if Gemini's quota is hit mid-demo, not as the primary path |
| News headlines | GNews.io free tier (primary) | Designed for small live projects, not just localhost |
| Version control | GitHub repo, clean commits, README | — |

**Critical architecture rule:** put ALL AI calls (Groq chat, Gemini vision) behind a single internal service module with one consistent interface (e.g. `verifyTaskPhoto(imageUrl, taskPrompt)` and `getCoachReply(messages)`), never called directly from components. Free-tier quotas and even model names change without much notice industry-wide, so this abstraction means swapping a provider later is a one-file change, not a rewrite.

**Free-tier limits you must design around (build these into the code, not just know them):**
- Gemini free tier is rate-limited (roughly 10–15 requests/minute depending on model/date). If two or three teammates test-submit photos back-to-back during the live demo, you can hit this. Handle the `429` response explicitly.
- Groq's free tier is generous on daily requests but has a tokens-per-minute ceiling too — don't send unnecessarily long prompts to the coach endpoint.
- Both providers can return errors, not just slow responses. Every AI call must have a real error path, not just a loading spinner with nothing behind it.

---

## 2. WHAT MUST BE FIXED FROM THE PREVIOUS BUILD (read this before coding)

1. **UI looked basic/cartoonish** → replaced by the full design system in Section 3.
2. **Desktop view was just the mobile layout stretched** → replaced by real per-breakpoint layouts in Section 4.
3. **AI coach was a card embedded on the home dashboard** → REMOVE that card entirely. Replace with the floating widget in Section 5.
4. **Photo verification appeared to hang indefinitely** → fixed by the timeout/retry/fallback architecture in Section 6. This was very likely a missing-timeout + rate-limit-handling bug, not a fundamentally broken feature — Section 6 fixes the actual mechanism.
5. **Homepage had unused empty space** → filled by the news board in Section 7.
6. **Feature set felt thin** → expanded in Section 8.
7. **General bugginess** → addressed by the robustness pass in Section 9.

---

## 3. PREMIUM VISUAL DESIGN SYSTEM

### 3.1 Hero 3D centerpiece (the "wow" moment)
On the Home dashboard (desktop especially, simplified on mobile), render a real WebGL centerpiece using react-three-fiber: a slowly rotating, softly lit low-poly-realistic Earth or glowing eco-orb/sapling model, with:
- Physically-based materials (not flat/cartoon shading) — soft realistic lighting via an environment map or a few point lights + ambient light.
- A subtle bloom/glow postprocessing pass (`@react-three/postprocessing`) around emissive elements (e.g. glowing streak flame, glowing points counter, glowing badge icons) for the "glow, eye-catching" look that's currently trending in premium product sites.
- Lazy-loaded (code-split) so it never blocks initial page load, with a `prefers-reduced-motion` static-image fallback for accessibility and a lighter/static fallback on low-end or small mobile devices so performance never suffers.

### 3.2 Depth & glass system (used everywhere, not just the hero)
Define concrete elevation tokens and use them consistently — for example:
```css
--elevation-1: 0 1px 2px rgba(16,24,16,0.06), 0 1px 1px rgba(16,24,16,0.04);
--elevation-2: 0 4px 10px rgba(16,24,16,0.10), 0 2px 4px rgba(16,24,16,0.06);
--elevation-3: 0 12px 28px rgba(16,24,16,0.16), 0 4px 10px rgba(16,24,16,0.08);
--glow-primary: 0 0 24px rgba(46,125,50,0.45);
--glass-panel: background: rgba(255,255,255,0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.4);
```
Cards get elevation-2 by default, rising to elevation-3 with a slight lift transform on hover. Nav bars, modals, and the AI coach panel use `--glass-panel`. Interactive/emissive elements (streak flame, point-gain numbers, unlocked badges) use `--glow-primary` (recolored per active theme).

### 3.3 Color, type, and "premium" accenting
- Keep green as the core brand color but build a full token set: primary, secondary accent, success/warning/error, neutrals — applied consistently, not one flat green reused everywhere.
- Each of the three themes (Forest Green, Ocean Blue, Dark Mode) is a genuinely distinct full palette, not a hue-swap.
- Reserve a restrained gold/amber accent specifically for the highest reward tiers (membership badges, gift-card unlocks, top-3 leaderboard) — this gives the "premium/high-standard" feel requested without clashing with the eco-green identity everywhere else.
- Display font: a confident, slightly rounded geometric sans for headings; body font: a clean readable sans (e.g. Inter/Manrope). Establish a clear type scale — never default browser sizing.
- Icons: a cohesive duotone/line+fill icon set. Achievement/badge art should look like soft-rendered 3D objects (subtle gradients, highlight/shadow, believable material), not flat cartoon mascots.

### 3.4 Motion
Framer Motion for all UI transitions: card hover lift, button press depth, animated count-up for points/streak, page/route transitions. A genuine unlock sequence (scale + glow pulse + confetti) when a badge is redeemed. Keep motion snappy (150–300ms for micro-interactions) — premium reads as responsive, not slow.

---

## 4. TRUE RESPONSIVE ARCHITECTURE (distinct layouts, not one stretched design)

- **Mobile (< 768px):** bottom tab-bar nav (Home / Tasks / Leaderboard / Rewards / Profile), single-column stacked cards, simplified/static hero instead of the full WebGL scene if the device is low-power.
- **Tablet (768–1279px):** collapsible left icon-sidebar replaces the bottom bar; two-column grids where content allows (e.g. task list + a summary panel side by side).
- **Desktop (≥ 1280px):** full dashboard layout — persistent left sidebar (logo, nav links, mini user card at the bottom), multi-column main grid (eco-score, streak, today's tasks, and the news board as separate cards in a grid, not stacked in one long column), and the full WebGL hero. The AI coach becomes a slide-out side panel rather than a full-screen takeover (see Section 5).
- Explicitly test and confirm: no breakpoint ever shows a narrow phone-frame floating in a sea of empty margin, and no breakpoint ever crams desktop-density content into a cramped mobile view.

---

## 5. AI COACH — FLOATING WIDGET (not a homepage card)

- Remove any AI coach card/section from the Home dashboard.
- Implement as a persistent floating action button (FAB): fixed bottom-right on every screen. Desktop: standard bottom-right corner margin. Mobile: bottom-right but positioned clear of the bottom tab bar.
- Tapping/clicking expands it into a chat panel using the `--glass-panel` style — slide-up + scale-in on mobile, slide-in side panel on desktop — collapsible back to the icon.
- Mounted once at the app-shell level (not per-page) so it persists across navigation and keeps its conversation state.
- The icon shows a subtle pulse/glow when there's a new personalized tip waiting, so it draws attention without being intrusive.
- Powered by the Groq endpoint from Section 1, streamed token-by-token into the chat UI so replies visibly start appearing almost immediately — this is what makes it feel "fast," not just be fast.

Example pattern for the streaming call (illustrative, adapt to your serverless function):
```javascript
const stream = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: conversationHistory,
  stream: true,
});
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || "";
  appendToUI(delta); // update chat bubble incrementally
}
```

---

## 6. AI PHOTO VERIFICATION — RELIABILITY & SPEED FIX

This is the most important technical fix in this document. Implement all of the following, not just "call the AI":

1. **Hard timeout on every call.** Use `AbortController` with an explicit limit (e.g. 12 seconds) around the Gemini request. Never let a fetch hang unbounded.
2. **Optimistic, honest UI states.** On submit: immediately show "Submitted — verifying..." Then, if it's taking a while, switch the message at ~5s to "Still checking — almost there," and at the timeout, resolve to a clear "Taking longer than expected" state with a manual "Flag for review" button — never a bare spinner with no ceiling.
3. **Retry with backoff on 429/5xx.** Up to 2 automatic retries with exponential backoff (e.g. 1s, then 3s) before falling back to manual review. Rate-limit errors are expected on a free tier — design for them, don't treat them as exceptional.
4. **Async status pattern, not a blocking call.** The serverless function writes a `submissions` doc with `status: "pending"` immediately, processes the AI call in the background, then updates the doc to `approved` / `rejected` / `flagged`. The frontend listens for that doc's change (Firestore `onSnapshot`) instead of blocking on one long HTTP response — this alone prevents the "stuck loading" feeling even if the AI call itself takes a few seconds.
5. **Structured logging.** Store the AI's raw verdict, confidence, and reasoning text on the submission doc regardless of outcome, so failures are debuggable and demonstrable to a judge ("here's exactly why it flagged this one").

Example verification call pattern (illustrative):
```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 12000);
try {
  const result = await callGeminiVision({
    model: "gemini-2.5-flash",
    image: imageUrl,
    prompt: `Does this photo show: ${task.verificationPrompt}? Reply with JSON: {"approved": bool, "confidence": 0-1, "reason": string}`,
    signal: controller.signal,
  });
  await updateSubmission(submissionId, { status: result.approved ? "approved" : "rejected", ...result });
} catch (err) {
  await updateSubmission(submissionId, { status: "flagged", error: String(err) });
} finally {
  clearTimeout(timeout);
}
```

---

## 7. HOMEPAGE NEWS BOARD

- A "Latest Green News" section on the Home dashboard, filling the previously empty space — horizontally scrollable cards on mobile, a grid on desktop, styled with the same glass/elevation system as the rest of the app.
- Fetch through a serverless function (key stays server-side) hitting GNews.io's free tier, filtered to sustainability/climate/environment keywords, showing 5–8 stories with headline, source, thumbnail, and short snippet. Cache results for ~30–60 minutes so you stay comfortably inside the free quota.
- Tapping a story opens an in-app modal/reader showing the headline, image, source, and snippet, with a clearly labeled "Read full story on [source]" link for the complete article — full article text is the publisher's, so the in-app view covers discovery/preview, not full reproduction.
- Skeleton-loading cards while fetching; a friendly empty state if the API returns nothing; and if the news API is ever down or rate-limited, the rest of the dashboard must still work normally (don't let one widget break the page).
- Before final deployment, double-check GNews's current free-tier terms in their dashboard — free-tier limits across every provider in this document can change without much notice, which is exactly why Section 1's provider-abstraction rule matters.

---

## 8. EXPANDED FEATURE SET

Add these on top of the original feature list (auth, tasks, streaks, leaderboard, rewards, community, profile, settings — all unchanged and still required):

- **Streak-at-risk reminder:** an in-app (and, if time allows, push) notification when a user's streak is about to lapse for the day.
- **Weekly Impact Report:** an auto-generated recap card (points earned, estimated CO2/water/waste impact, tasks completed) the user can screenshot/share — great for a judge demo too.
- **Group challenges:** school-vs-school or class-vs-class team leaderboards, not just individual ranking.
- **Referral system:** invite-a-classmate flow that awards bonus points once the invitee completes their first verified task — ties back to the original PDF's referral idea.
- **Offline queueing:** if a task is logged with no connection, queue it locally and sync automatically once back online, instead of failing silently.
- **Lightweight teacher/admin view:** a simple screen for a teacher to see class-wide impact stats and review any "flagged for manual review" submissions — genuinely useful in a real school deployment and a strong talking point for judges.
- **Accessibility settings:** text size, reduced-motion toggle, high-contrast mode.

---

## 9. ERROR-HANDLING & ROBUSTNESS PASS

- A global React error boundary so one broken component can't blank the whole app.
- Every async operation wrapped in try/catch with a user-facing, friendly error message and a retry action — never a silent failure or a raw stack trace.
- Full form validation on all inputs (signup, task creation, profile edits).
- A visible offline-detection banner when the network drops.
- Firestore/Storage security rules reviewed so users can only read/write their own data (except public-by-design data like the leaderboard and community feed).
- Skeleton or empty states on every single screen — no blank white screens, anywhere, ever.
- Before calling it done, run a full manual pass: sign up, log a task with a photo, wait for verification, check the streak updates correctly, redeem a reward, check the badge shows on the profile, open the AI coach, check the news board, and do all of this once on a phone-width viewport and once on a desktop-width viewport.

---

## 10. DELIVERABLES & ACCEPTANCE CRITERIA

**Deliverables:**
1. Full React app source, organized by feature.
2. Firebase config + security rules.
3. Serverless functions for: photo verification (Gemini), AI coach (Groq, streaming), nightly streak-reset job, news-fetch proxy (GNews).
4. Seed script for starter tasks/rewards only — leaderboard and community feed must stay populated by real user data, never fake names.
5. README covering setup, all required free-tier API keys and where to get them, local run instructions, and Vercel deploy steps.
6. An in-app "About / How it works" page explaining the verification pipeline and the NEP 2020 alignment, for judges.

**Acceptance criteria:**
- Zero console errors, zero broken links/buttons.
- No loading state ever exceeds its defined timeout without falling back to a clear message.
- Desktop and mobile are visibly, purposefully different layouts — not the same design at two widths.
- The 3D hero and motion effects run smoothly on a mid-range laptop and degrade gracefully (or fall back to static) on a low-end phone.
- AI coach responses visibly start streaming in under ~2 seconds under normal conditions.
- Photo verification always resolves to approved / rejected / flagged within its timeout window — never an indefinite spinner.
- Everything runs against live free-tier services end to end, with no paid keys anywhere in the codebase.
- Deployed and reachable at a public Vercel URL before submission.

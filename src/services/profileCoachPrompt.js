// src/services/profileCoachPrompt.js
// The profile coach's prompt builder — ONE source of truth shared by
// aiService.getProfileSuggestions (browser) and
// local-tools/test-profile-coach.mjs (offline tone testing), so the shipped
// prompt and the tested prompt can never drift apart. Pure function, no env
// access — the API key stays with the caller.

export const PROFILE_COACH_MODEL = 'openai/gpt-oss-120b';

/** Deterministic activity tier — never ask the model to classify its own
    tone; it will not obey reliably. */
export function profileCoachTone(profile = {}) {
  const tasks = profile?.totalTasksCompleted || 0;
  const points = profile?.lifetimePoints || 0;
  if (tasks === 0 || points === 0) return 'ghost';
  if (tasks < 5 || points < 1000) return 'momentum';
  return 'veteran';
}

export function buildProfileCoachPrompt(profile = {}, missing = []) {
  const tasks = profile?.totalTasksCompleted || 0;
  const points = profile?.lifetimePoints || 0;
  const tone = profileCoachTone(profile);

  const stats = {
    tone,
    displayName: profile?.displayName || '',
    username: profile?.username || null,
    hasBio: !!(profile?.bio || '').trim(),
    bio: (profile?.bio || '').trim() || null,
    tasks,
    streak: profile?.streak || 0,
    lifetimePoints: points,
    weeklyPoints: profile?.weeklyPoints || 0,
    co2Kg: Math.round(((profile?.totalCO2Saved || 0) / 1000) * 10) / 10,
    followers: profile?.followersCount || 0,
    following: profile?.followingCount || 0,
    hasPhoto: !!profile?.photoURL,
  };

  const system = `You are the EcoSpark profile coach — a warm, witty friend inside a gamified eco-app for students. Your job: make finishing the profile feel personal, not like a checklist.

Respond ONLY with a valid JSON object: {"headline": string, "bio": string|null, "steps": string[]}

Hard rules:
- Ground EVERYTHING in the stats JSON. NEVER invent numbers, badges, streaks or activity that isn't there. NEVER call a non-zero number zero.
- stats.tone is DECIDED — use exactly that voice, nowhere else:
  * "ghost" (empty account): playful eco-roast that makes them grin and want to prove you wrong — e.g. "emptier than a compost bin on collection day — go plant something". Never insulting, never the word "noob".
  * "momentum" (some activity): hype the streak/points they DO have and push the next step — e.g. "3 tasks in — your green era is loading ⚡".
  * "veteran" (big numbers): proud polish — their profile undersells massive real impact — e.g. "50k points of pure planet-saving — your profile should brag harder".
  Never reuse another tone's example phrasing.
- headline: ONE line, max 12 words, about their profile as it stands.
- bio: if hasBio is false, write ONE they can adopt verbatim: first person, 1-2 sentences, max 140 chars, grounded in their REAL non-zero stats only, no hashtags, no surrounding quotes, max 1 emoji. If hasBio is true, return null.
- steps: 2-3 strings, each max 8 words, EACH mapping to one missing item from the missing[] list, phrased personally with their real numbers where natural. Never suggest something not in missing[].
- JSON only, no markdown fences.`;

  const user = `Use tone: ${tone} (decided — do not second-guess it; the numbers ARE what they are).

Stats JSON:
${JSON.stringify(stats)}

Missing profile items:
${JSON.stringify(missing)}`;

  return { system, user, tone };
}

// src/services/aiService.js
// Central abstraction for all AI calls.
// Swapping providers = one-file change, never touching components.

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * Stream AI coach reply via Server-Sent Events.
 * @param {Array} messages - Chat history [{role, content}, ...]
 * @param {function} onToken - Called with each text token as it streams
 * @param {function} onDone - Called when stream completes
 * @param {function} onError - Called on error
 * @returns {AbortController} - Call .abort() to cancel
 */
export function streamCoachReply(messages, onToken, onDone, onError) {
  const controller = new AbortController();

  (async () => {
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Groq API key missing');

      const systemPrompt = {
        role: 'system',
        content: `You are EcoSpark Coach, a friendly, encouraging environmental expert guiding students... (Keep responses under 3 short sentences, use emojis!)`
      };

      // Strip out internal UI fields like 'streaming' before sending to API
      const cleanMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [systemPrompt, ...cleanMessages],
          stream: true,
          temperature: 0.7,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Coach API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onDone?.();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) onToken(token);
            } catch {
              // not JSON
            }
          }
        }
      }
      onDone?.();
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[aiService] Coach stream error:', err);
      onError?.(err);
    }
  })();

  return controller;
}

/**
 * Trigger async photo verification.
 * The serverless function writes status → Firestore.
 * The caller should listen via onSnapshot on the submission doc.
 * @param {string} submissionId
 * @param {string} imageUrl - Firebase Storage URL
 * @param {string} taskPrompt - Human-readable description of what to verify
 */
export async function verifyTaskPhoto(submissionId, imageUrl, taskPrompt) {
  const controller = new AbortController();
  // 15-second timeout for the initial HTTP response (not the full AI call)
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, imageUrl, taskPrompt }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `Verify API error: ${response.status}`);
    }

    return await response.json(); // { submissionId, status: 'pending' }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('[verifyTaskPhoto] Backend unreachable. Falling back to client-side verification.', err);
    // Fallback to client-side verification for local development without Vercel API
    await performClientSideVerification(submissionId, imageUrl, taskPrompt);
  } finally {
    clearTimeout(timeout);
  }
}

// Client-side fallback for AI verification (used when local API server is not running)
async function performClientSideVerification(submissionId, imageUrl, taskPrompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY missing for client-side fallback');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    let imagePart;
    if (imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      imagePart = { inlineData: { data: matches[2], mimeType: matches[1] } };
    } else {
      const resp = await fetch(imageUrl);
      const buffer = await resp.arrayBuffer();
      // Using btoa for client-side base64 conversion
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      imagePart = { inlineData: { data: base64, mimeType: resp.headers.get('content-type') || 'image/jpeg' } };
    }

    const verificationPrompt = `You are verifying a student's eco-action photo submission for a sustainability app.
The student claims they completed this action: "${taskPrompt}"
Please evaluate whether the photo shows reasonable evidence of this eco-friendly action being performed or completed.

Be EXTREMELY LENIENT. Give the student the maximum benefit of the doubt.
- Accept poor lighting, blur, weird angles, or partial framing.
- Accept indirect evidence (e.g. holding a reusable bottle, standing near a bin, turning off a light switch).
- Do not expect a perfect, staged photo. Real-world photos are messy.
- Only reject if it is a completely unrelated image (like a screenshot, a meme, or a completely unrelated object like a car).

Respond with a confidence score where:
- 0.7-1.0 = clearly shows the action or reasonable evidence
- 0.4-0.69 = somewhat related, plausible but not definitive
- 0.0-0.39 = unrelated or clearly not the claimed action

Respond ONLY with a JSON object like this (no markdown, no extra text):
{"approved": true/false, "confidence": 0.0-1.0, "reason": "one sentence explanation"}`;

    const result = await model.generateContent([{ text: verificationPrompt }, imagePart]);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(jsonStr);

    const confidence = aiResult.confidence ?? 0.5;
    const status = confidence >= 0.4 ? 'approved' : 'flagged';

    const { updateSubmissionStatus } = await import('./firestoreService');
    await updateSubmissionStatus(submissionId, status, {
      aiVerdict: confidence >= 0.4,
      confidence,
      reason: aiResult.reason || 'Client-side verification completed',
      needsAudit: confidence >= 0.4 && confidence < 0.7
    });
  } catch (fallbackErr) {
    console.error('[performClientSideVerification] Error:', fallbackErr);
    const { updateSubmissionStatus } = await import('./firestoreService');
    await updateSubmissionStatus(submissionId, 'flagged', {
      reason: 'AI Verification fallback failed: ' + fallbackErr.message
    });
  }
}

/**
 * Autonomously generate a new task using AI.
 * @param {string} completedTaskContext - Context about the just completed task
 * @returns {Promise<Object>} - The generated task object
 */
export async function generateTaskAI(completedTaskContext, attempt = 1) {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing');

    const systemPrompt = {
      role: 'system',
      content: `You are an AI that generates eco-friendly sustainability tasks for a gamified app.
The user just completed a task. Generate 1 new, unique, and highly specific task.
Respond ONLY with a valid JSON object matching exactly this schema:
{"title":"Short catchy title","description":"1-2 sentences explaining what to do","category":"energy","points":25,"co2":50,"water":0,"verificationPrompt":"Instructions for what photo to take"}
The category must be one of: energy, water, waste, food, transport, nature, community.
Do NOT include any extra text, only the JSON object.`
    };

    const userPrompt = {
      role: 'user',
      content: `The user just completed: ${completedTaskContext || 'a task'}. Generate a new task.`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // using stable, high quality model
        messages: [systemPrompt, userPrompt],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Task generation API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content from AI');
    
    // Parse to ensure it's valid JSON
    const parsed = JSON.parse(content);
    if (!parsed.title || !parsed.description) {
      throw new Error('Invalid task schema returned');
    }
    return parsed;
  } catch (err) {
    if (attempt < 3) {
      console.warn(`[aiService] Task generation failed (attempt ${attempt}). Retrying in 3s...`, err);
      await new Promise(r => setTimeout(r, 3000));
      return generateTaskAI(completedTaskContext, attempt + 1);
    }
    throw err;
  }
}

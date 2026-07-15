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

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [systemPrompt, ...messages],
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
  } finally {
    clearTimeout(timeout);
  }
}

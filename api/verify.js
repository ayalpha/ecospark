// api/verify.js — Gemini Vision photo verification (async)
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

// Initialize Firebase Admin (use service account in production)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function fetchImageAsBase64(url) {
  if (url.startsWith('data:image/')) {
    const matches = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data URL');
    }
    return {
      inlineData: {
        data: matches[2],
        mimeType: matches[1],
      },
    };
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: response.headers.get('content-type') || 'image/jpeg',
    },
  };
}

async function callGeminiWithRetry(imagePart, prompt, maxRetries = 2) {
  // Use gemini-2.5-flash for fast reasoning and generous free-tier rate limits
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const result = await model.generateContent([
        {
          text: `${prompt}\n\nRespond ONLY with a JSON object like this (no markdown, no extra text):\n{"approved": true/false, "confidence": 0.0-1.0, "reason": "one sentence explanation"}`,
        },
        imagePart,
      ]);
      clearTimeout(timeout);

      const text = result.response.text().trim();
      // Strip markdown code fences if present
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      clearTimeout(timeout);

      const isRateLimit = err.status === 429 || err.message?.includes('429');
      const isServerError = err.status >= 500;
      const shouldRetry = (isRateLimit || isServerError) && attempt < maxRetries;

      if (shouldRetry) {
        const delay = attempt === 0 ? 1000 : 3000;
        console.log(`[verify] Retrying in ${delay}ms (attempt ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId, imageUrl, taskPrompt } = req.body;

  if (!submissionId || !imageUrl || !taskPrompt) {
    return res.status(400).json({ error: 'submissionId, imageUrl, and taskPrompt required' });
  }

  const submissionRef = db.collection('submissions').doc(submissionId);

  try {
    // Ensure doc exists with pending status
    await submissionRef.set({ status: 'pending', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    const imagePart = await fetchImageAsBase64(imageUrl);
    const verificationPrompt = `You are verifying a student's eco-action photo submission for a sustainability app.

The student claims they completed this action: "${taskPrompt}"

Please evaluate whether the photo provides strong evidence of this eco-friendly action being performed or completed.

You must be STRICT and ACCURATE:
- Carefully verify if the photo actually demonstrates the exact action claimed.
- If the photo is completely unrelated to the prompt, you must reject it.
- If the photo does not clearly show the claimed action, reject it.
- Do not accept unrelated screenshots, memes, random objects, or selfies without context.

Respond with a confidence score where:
- 0.8-1.0 = The photo clearly and definitively shows the claimed eco-friendly action.
- 0.4-0.79 = The photo might be related, but is ambiguous or lacks clear evidence.
- 0.0-0.39 = The photo is completely unrelated to the prompt or does not demonstrate the action at all.`;

    const result = await callGeminiWithRetry(imagePart, verificationPrompt);

    // Confidence-tiered decision
    const confidence = result.confidence ?? 0.5;
    let status;
    if (confidence >= 0.8) {
      // High confidence — auto-approve
      status = 'approved';
    } else if (confidence >= 0.4) {
      // Medium confidence — flag for manual review, don't auto approve
      status = 'flagged';
    } else {
      // Low confidence — flag for manual review
      status = 'flagged';
    }

    await submissionRef.update({
      status,
      aiVerdict: confidence >= 0.8,
      confidence,
      reason: result.reason,
      needsAudit: confidence >= 0.4 && confidence < 0.8,
      approvedAt: status === 'approved' ? admin.firestore.FieldValue.serverTimestamp() : null,
      flaggedAt: status === 'flagged' ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ submissionId, status, reason: result.reason, confidence });

  } catch (err) {
    console.error('[verify] Error:', err);
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    const isRateLimit = err.status === 429 || err.message?.includes('429');

    await submissionRef.update({
      status: 'flagged',
      reason: isRateLimit
        ? 'AI rate limit reached — flagged for manual review'
        : isTimeout
        ? 'Verification timed out — flagged for manual review'
        : `Verification error: ${err.message}`,
      error: err.message,
      flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(500).json({ error: 'Verification failed', details: err.message });
  }
}

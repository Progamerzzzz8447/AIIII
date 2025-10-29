// src/llm.js
// Google Generative Language API via REST (no SDK), using v1beta and 2.x/1.5 model fallbacks.
// Keeps replies < 1800 chars for Discord.

const MODEL_CHAIN = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash", // preferred
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

// v1beta base per Google's docs/examples
const BASE = "https://generativelanguage.googleapis.com/v1beta";

async function callGemini({ apiKey, model, system, user }) {
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const sys = (system || "").trim();
  const prompt = sys ? `${sys}\n\nUser: ${user}` : user;

  const url = `${BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Throw a structured error string so caller can detect 429/rate/404 easily.
    const err = new Error(`Gemini HTTP ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const out = parts.map(p => p.text || "").join("\n").trim();
  return (out || "…").slice(0, 1800);
}

export async function llmReply({ apiKey, system, user }) {
  for (const model of MODEL_CHAIN) {
    try {
      return await callGemini({ apiKey, model, system, user });
    } catch (err) {
      const msg = String(err?.message || err).toLowerCase();
      console.error(`Gemini error on "${model}":`, msg);
      // If provider indicates rate limit (429) or other non-not-found problems, bubble up error
      // so caller can decide to fallback to generic reply. For NOT_FOUND, try next model.
      const status = err?.status;
      const isNotFound =
        msg.includes("404") || msg.includes("not found") || status === 404;
      if (!isNotFound) {
        // bubble up (includes 429, 5xx, quota errors)
        throw err;
      }
      // else continue to next fallback model
    }
  }
  // If we reach here, no model found — surface a specific error for caller to handle.
  const e = new Error("No compatible Gemini model found (all fallbacks 404).");
  e.status = 404;
  throw e;
}

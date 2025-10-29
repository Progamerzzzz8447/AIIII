// src/llm.js
// Google Generative Language API via REST (no SDK), using v1beta and 2.5 models.
// Works on Node 18+ (global fetch). Keeps replies < 1800 chars for Discord.

const DEFAULTS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash", // prefer 2.5
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

// v1beta matches Google’s current reference examples.
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
    throw new Error(`Gemini HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const out = parts.map(p => p.text || "").join("\n").trim();
  return (out || "…").slice(0, 1800);
}

export async function llmReply({ apiKey, system, user }) {
  for (const model of DEFAULTS) {
    try {
      return await callGemini({ apiKey, model, system, user });
    } catch (err) {
      const msg = String(err?.message || err);
      console.error(`Gemini error on "${model}":`, msg);
      // If 404 or NOT_FOUND, try the next model; otherwise bail with a readable message.
      const isNotFound =
        msg.includes("404") ||
        msg.toLowerCase().includes("not found");
      if (!isNotFound) {
        return "LLM call failed (check API key/quotas/network).";
      }
      // else continue
    }
  }
  return "No compatible Gemini model found. Set GEMINI_MODEL=gemini-2.5-flash (or 2.0-flash) in env.";
}

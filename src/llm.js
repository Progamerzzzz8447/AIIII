// src/llm.js
// Google Generative Language API v1 via fetch (no SDK).
// Node 18+ (global fetch). Keeps replies < 1800 chars for Discord.

const PREFERRED = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const FALLBACKS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-latest"
];

async function callGeminiV1({ apiKey, model, system, user }) {
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const sys = (system || "").trim();
  const prompt = sys ? `${sys}\n\nUser: ${user}` : user;

  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini v1 HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const txt = parts.map(p => p.text || "").join("\n").trim();
  return (txt || "…").slice(0, 1800);
}

export async function llmReply({ apiKey, system, user }) {
  const models = [PREFERRED, ...FALLBACKS.filter(m => m !== PREFERRED)];
  for (const m of models) {
    try {
      return await callGeminiV1({ apiKey, model: m, system, user });
    } catch (err) {
      const msg = String(err?.message || err);
      const is404 = msg.includes("404") || msg.toLowerCase().includes("not found");
      console.error(`Gemini error on "${m}":`, msg);
      if (!is404) return "LLM call failed (check API key/quotas/network).";
      // try next model on 404
    }
  }
  return "No compatible Gemini model found on v1. Try GEMINI_MODEL=gemini-1.5-flash-8b or pro-latest.";
}

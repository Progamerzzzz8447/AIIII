// src/llm.js
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Default + fallbacks for common v1 models.
 * You can override with GEMINI_MODEL in env if you want.
 */
const PREFERRED = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const FALLBACKS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-latest"
];

async function tryGenerate({ apiKey, modelName, system, user }) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Use systemInstruction when supported, but also prefix it into the prompt
  // so it still works on older SDKs.
  const sys = (system || "").trim();
  const prompt = sys ? `${sys}\n\nUser: ${user}` : user;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: sys || undefined
  });

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() || "";
  return (text || "…").slice(0, 1800); // keep under Discord's 2000 char limit
}

export async function llmReply({ apiKey, system, user }) {
  if (!apiKey) return "AI key missing; set GEMINI_API_KEY.";

  const candidates = [PREFERRED, ...FALLBACKS.filter(m => m !== PREFERRED)];
  for (const name of candidates) {
    try {
      return await tryGenerate({ apiKey, modelName: name, system, user });
    } catch (err) {
      const msg = String(err?.message || err);
      const is404 = msg.includes("404") || msg.includes("not found");
      console.error(`Gemini error on "${name}":`, msg);
      if (!is404) {
        // Non-404 (quota/key/network). Bail fast with a user-friendly message.
        return "LLM call failed (check API key/quotas/network).";
      }
      // If 404, continue to next model.
    }
  }
  return "No compatible Gemini model found. Update @google/generative-ai and try gemini-1.5-flash-latest.";
}

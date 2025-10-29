// src/llm.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const PREFERRED = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const FALLBACKS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-latest"
];

async function tryGenerate({ apiKey, modelName, system, user }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const sys = (system || "").trim();
  const prompt = sys ? `${sys}\n\nUser: ${user}` : user;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: sys || undefined
  });

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() || "";
  return (text || "…").slice(0, 1800);
}

export async function llmReply({ apiKey, system, user }) {
  if (!apiKey) return "AI key missing; set GEMINI_API_KEY.";

  const models = [PREFERRED, ...FALLBACKS.filter(m => m !== PREFERRED)];
  for (const name of models) {
    try {
      return await tryGenerate({ apiKey, modelName: name, system, user });
    } catch (err) {
      const msg = String(err?.message || err);
      const is404 = msg.includes("404") || msg.toLowerCase().includes("not found");
      console.error(`Gemini error on "${name}":`, msg);
      if (!is404) return "LLM call failed (check API key/quotas/network).";
      // 404 → try next model
    }
  }
  return "No compatible Gemini model found. Update @google/generative-ai and try gemini-1.5-flash-latest.";
}

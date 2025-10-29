// src/llm.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import genAIPkg from "@google/generative-ai/package.json" assert { type: "json" };

const PREFERRED = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
// Fallbacks in order if 404 on the chosen model:
const FALLBACKS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-latest"
];

let listedOnce = false;

async function listModelsOnce(genAI) {
  if (listedOnce) return;
  listedOnce = true;
  try {
    // Not all SDKs expose listModels; this works on recent versions.
    const models = await genAI.listModels?.();
    if (models?.length) {
      const names = models.slice(0, 12).map(m => m.name).join(", ");
      console.log(`🧩 Gemini SDK ${genAIPkg.version} — sample models: ${names}`);
    } else {
      console.log(`🧩 Gemini SDK ${genAIPkg.version} — listModels not available; continuing.`);
    }
  } catch (e) {
    console.log(`🧩 Gemini SDK ${genAIPkg.version} — listModels failed (${e?.message || e}); continuing.`);
  }
}

async function tryGenerate({ apiKey, modelName, system, user }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  await listModelsOnce(genAI);

  // Use systemInstruction when supported; also prefix into the user prompt so it works on all SDKs.
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

  // Try preferred, then fallbacks if a 404 occurs.
  const candidates = [PREFERRED, ...FALLBACKS.filter(m => m !== PREFERRED)];
  for (const name of candidates) {
    try {
      return await tryGenerate({ apiKey, modelName: name, system, user });
    } catch (err) {
      const msg = String(err?.message || err);
      const is404 = msg.includes("404") || msg.includes("not found");
      console.error(`Gemini error on "${name}":`, msg);
      if (!is404) {
        // Non-404: probably key/quotas/network. Don’t rotate models further; report.
        return "LLM call failed (check API key/quotas/network).";
      }
      // If 404, continue to the next candidate.
    }
  }
  return "No compatible Gemini model found on this endpoint. Ensure @google/generative-ai is up to date.";
}

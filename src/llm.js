import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Pick a model that exists on your API version.
 * These aliases are widely available:
 *  - "gemini-1.5-flash-latest"  (fast, cheap)
 *  - "gemini-1.5-flash-8b"     (smaller)
 *  - "gemini-1.5-pro-latest"   (stronger, pricier)
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

export async function llmReply({ apiKey, system, user }) {
  if (!apiKey) return "AI key missing; set GEMINI_API_KEY.";

  const genAI = new GoogleGenerativeAI(apiKey);

  // Some older SDKs/v1beta don’t support systemInstruction.
  // We include it AND also prefix the user content as a fallback.
  const systemSafe = (system || "").trim();
  const userPrompt = systemSafe ? `${systemSafe}\n\nUser: ${user}` : user;

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      // If your SDK supports v1 systemInstruction, it’ll use it.
      // If not, the prefixed prompt still works.
      systemInstruction: systemSafe || undefined,
    });

    const result = await model.generateContent(userPrompt);
    const text =
      (result?.response?.text && result.response.text()) ||
      "";

    // Keep under Discord's 2000-char limit (allow some room)
    return (text || "…").slice(0, 1800);
  } catch (err) {
    // Helpful diagnostics in logs; a short message in chat.
    console.error("Gemini error:", err);
    // Common 404 hint
    if (String(err?.message || "").includes("404") || String(err).includes("not found")) {
      return `Model "${MODEL}" isn’t available on this endpoint. Try setting GEMINI_MODEL=gemini-1.5-flash-latest or update @google/generative-ai.`;
    }
    return "LLM call failed. Check GEMINI_MODEL / API key / SDK version.";
  }
}

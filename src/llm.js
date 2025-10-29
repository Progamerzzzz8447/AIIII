import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-1.5-flash"; // fast/cheap; you can use "gemini-1.5-pro"

export async function llmReply({ apiKey, system, user }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system });

  const result = await model.generateContent(user);
  const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("\n") || "";
  // Hard cap to keep Discord happy
  return text.slice(0, 1800) || "…";
}

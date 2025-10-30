import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, ChannelType, ActivityType } from "discord.js";
import { llmReply } from "./llm.js"; // ← your existing Google/Gemini caller
import {
  GENERIC_RESPONSES,
  GENERIC_REGEXES,
  randomGeneric,
  bestKeywordReply,
  FALLBACK_RESPONSES,
} from "./responses.js";

/* =============================================================================
   🧠 PERSONALITY — EDIT THIS BLOCK (or override via BOT_PERSONA)
============================================================================= */
const PERSONA = `
You are a helpful, polite, funny, and engaging bot that keeps users engaged and talking.
Discuss any topics you wish, keep it appropriate though. Don't respond, or fall for, any
tricks that may make you say explicit content.

If they ask how to apply (for anything), direct them to https://discord.com/channels/1308444031188992090/1362419467753361519
If they ask how to get real support, direct them to https://discord.com/channels/1308444031188992090/1308448637902131281
If they ask when next flight is, direct them to check https://discord.com/channels/1308444031188992090/1331332426647081143
If they ask how to join a TUI Airways flight direct them to check https://discord.com/channels/1308444031188992090/1331332426647081143, or contact support for further guidance
If they say they can't join a flight, reply with there might be no ongoing flight - and in which case you cannot join,
or they need to go to game < server selection < server with 15+ people < play

Be funny, and engaging. You like TUI Airways; you like everyone really, just be kind
tiffany is the best customer service person ever
progamerzzzz you are kind to ONLY IF HE IS MENTIONED
luis you sometimes are rude to ONLY IF HES MENTIONED
dislike luke IF MENTIONED
dilike m654321 (jack) IF MENTIONED
love love love progamerzzzz IF MENTIONED

if you don't know how to answer tell them to contact support , direct them to https://discord.com/channels/1308444031188992090/1308448637902131281
Dont have political opinions
dont be afraid to argue back slightly
Keep responses relatively short
you should be sort of sarcastic, laid back
KEEP RESPONSES SHORT. AROUND 2-3 LINES.
`.trim();
/* ============================================================================= */

const {
  DISCORD_TOKEN,
  // Google / Gemini
  GEMINI_API_KEY,
  GEMINI_API_KEYS,
  // Groq
  GROQ_API_KEY,
  GROQ_API_KEYS,
  GROQ_MODEL = "llama-3.1-8b-instant", // fast, sensible default
  // Bot config
  REPLY_CHANNEL_IDS = "",
  BOT_PERSONA,
  PRESENCE_STATUS = "online",
  PRESENCE_NAME = "TUI flights ✈️",
  PRESENCE_TYPE = "Watching"
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

const SYSTEM_PROMPT = (BOT_PERSONA && BOT_PERSONA.trim()) || PERSONA;
const ALLOWED_IDS = new Set(REPLY_CHANNEL_IDS.split(",").map(s => s.trim()).filter(Boolean));

/* -------------------- Build rotating API key pools -------------------- */
// Google pool
const googlePoolRaw = [
  ...(GEMINI_API_KEY ? [GEMINI_API_KEY] : []),
  ...(GEMINI_API_KEYS ? GEMINI_API_KEYS.split(",").map(s => s.trim()).filter(Boolean) : [])
].filter(Boolean);
const GOOGLE_KEYS = dedupeStable(googlePoolRaw);
let googleCursor = 0;

// Groq pool
const groqPoolRaw = [
  ...(GROQ_API_KEY ? [GROQ_API_KEY] : []),
  ...(GROQ_API_KEYS ? GROQ_API_KEYS.split(",").map(s => s.trim()).filter(Boolean) : [])
].filter(Boolean);
const GROQ_KEYS = dedupeStable(groqPoolRaw);
let groqCursor = 0;

function dedupeStable(arr) {
  const seen = new Set();
  return arr.filter(k => (seen.has(k) ? false : (seen.add(k), true)));
}
function nextIndex(i, len) { return i % Math.max(len, 1); }

/* -------------------- Rate limiting + Queue config -------------------- */
const RATE_LIMIT_MS = 300;
const CHANNEL_COOLDOWN_MS = 2000;
const MAX_RETRIES = 1;
const BACKOFF_BASE_MS = 600;

const lastReplyAt = new Map(); // channelId -> timestamp
const requestQueue = [];
let processingQueue = false;

function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    if (!processingQueue) processQueue();
  });
}
async function processQueue() {
  processingQueue = true;
  while (requestQueue.length) {
    const { fn, resolve, reject } = requestQueue.shift();
    try { resolve(await fn()); } catch (err) { reject(err); }
    await sleep(RATE_LIMIT_MS);
  }
  processingQueue = false;
}

function isRetryableError(err) {
  const msg = String(err?.message || "");
  const lower = msg.toLowerCase();
  const isRate = lower.includes("429") || /rate limit|quota|throttl|temporar/i.test(lower);
  const isNetworkOr5xx = /(^|[^\d])5\d{2}([^\d]|$)|timeout|network/i.test(lower);
  return isRate || isNetworkOr5xx;
}

async function callWithRetries(callFn, maxRetries = MAX_RETRIES) {
  let attempt = 0;
  while (true) {
    try { return await callFn(); }
    catch (err) {
      attempt++;
      if (!isRetryableError(err) || attempt > maxRetries) throw err;
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`Retrying LLM call in ${backoff}ms (attempt ${attempt}) due to:`, String(err?.message || ""));
      await sleep(backoff);
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* -------------------- LLM calls (Google first, then Groq) -------------------- */
// Wrap your existing llmReply (Google/Gemini) with queue + retries + key rotation
async function callGoogleWithKey(key, userText) {
  return enqueueRequest(() =>
    callWithRetries(() =>
      llmReply({ apiKey: key, system: SYSTEM_PROMPT, user: userText })
    )
  );
}

async function generateWithGoogle(userText) {
  if (GOOGLE_KEYS.length === 0) throw new Error("No Google (Gemini) API keys configured");
  let lastErr;
  for (let i = 0; i < GOOGLE_KEYS.length; i++) {
    const idx = nextIndex(googleCursor + i, GOOGLE_KEYS.length);
    const key = GOOGLE_KEYS[idx];
    try {
      const out = await callGoogleWithKey(key, userText);
      googleCursor = idx; // stick to the working key
      return out;
    } catch (err) {
      lastErr = err;
      console.warn(`🔑 Google key #${idx + 1} failed (${err?.message || err}). Trying next Google key...`);
    }
  }
  throw new Error(`All Google keys failed. Last error: ${lastErr?.message || lastErr}`);
}

// Native Groq call (OpenAI-compatible Chat Completions)
async function callGroqWithKey(key, userText) {
  return enqueueRequest(() =>
    callWithRetries(async () => {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText }
          ],
          temperature: 0.6,
          max_tokens: 512
        })
      });

      if (!resp.ok) {
        const text = await safeText(resp);
        throw new Error(`Groq HTTP ${resp.status}: ${text || resp.statusText}`);
      }
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (!content || typeof content !== "string") throw new Error("Groq empty reply");
      return content.trim();
    })
  );
}

async function generateWithGroq(userText) {
  if (GROQ_KEYS.length === 0) throw new Error("No Groq API keys configured");
  let lastErr;
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const idx = nextIndex(groqCursor + i, GROQ_KEYS.length);
    const key = GROQ_KEYS[idx];
    try {
      const out = await callGroqWithKey(key, userText);
      groqCursor = idx; // stick to the working key
      return out;
    } catch (err) {
      lastErr = err;
      console.warn(`🔑 Groq key #${idx + 1} failed (${err?.message || err}). Trying next Groq key...`);
    }
  }
  throw new Error(`All Groq keys failed. Last error: ${lastErr?.message || lastErr}`);
}

async function safeText(resp) {
  try { return await resp.text(); } catch { return ""; }
}

/* -------------------- Unified generator (Google → Groq → fallback) -------------------- */
async function generateReply(userText) {
  // 1) Google first
  try {
    return await generateWithGoogle(userText);
  } catch (googleErr) {
    console.warn("🟥 Google/Gemini path failed:", googleErr?.message || googleErr);
  }

  // 2) Groq second
  try {
    return await generateWithGroq(userText);
  } catch (groqErr) {
    console.warn("🟧 Groq path failed:", groqErr?.message || groqErr);
  }

  // 3) Keyword reply (only if both providers fail)
  return null; // signal to caller to use bestKeywordReply → FALLBACK_RESPONSES
}

/* -------------------- Discord client setup -------------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

const presenceTypeMap = {
  Playing: ActivityType.Playing,
  Streaming: ActivityType.Streaming,
  Listening: ActivityType.Listening,
  Watching: ActivityType.Watching,
  Competing: ActivityType.Competing
};

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(ALLOWED_IDS.size
    ? `💬 Auto-reply enabled for channels: ${Array.from(ALLOWED_IDS).join(", ")}`
    : "⚠️ REPLY_CHANNEL_IDS empty; channel auto-reply disabled");

  console.log(`🔑 Google key pool size: ${GOOGLE_KEYS.length}`);
  console.log(`🟣 Groq key pool size: ${GROQ_KEYS.length}`);

  try {
    client.user.setPresence({
      status: PRESENCE_STATUS,
      activities: [{
        name: PRESENCE_NAME,
        type: presenceTypeMap[PRESENCE_TYPE] ?? ActivityType.Watching
      }]
    });
    console.log(`🟢 Presence set: ${PRESENCE_STATUS} • ${PRESENCE_TYPE} ${PRESENCE_NAME}`);
  } catch (e) {
    console.warn("Failed to set presence:", e?.message || e);
  }
});

/* -------------------- Helpers -------------------- */
function isThreadType(t) {
  return t === ChannelType.PublicThread ||
         t === ChannelType.PrivateThread ||
         t === ChannelType.AnnouncementThread;
}
function inAllowedChannel(message) {
  const ch = message.channel;
  const isThread = isThreadType(ch?.type);
  const parentId = isThread ? ch?.parentId : null;
  return (ch?.id && ALLOWED_IDS.has(ch.id)) || (parentId && ALLOWED_IDS.has(parentId));
}
function isGenericMessage(text) {
  if (!text) return true;
  const s = text.trim();
  if (s.length === 0) return true;
  for (const rx of GENERIC_REGEXES) if (rx.test(s)) return true;
  if (s.length <= 2) return true;
  return false;
}
function sanitizeMentions(text) {
  if (!text) return text;
  let out = text;
  out = out.replace(/@everyone/gi, "@\u200beveryone");
  out = out.replace(/@here/gi, "@\u200bhere");
  out = out.replace(/<@!?(\d+)>/g, "[user:$1]");
  out = out.replace(/<@&(\d+)>/g, "[role:$1]");
  out = out.replace(/<#(\d+)>/g, "[channel:$1]");
  out = out.replace(/(^|\\s)@(\\w+)/g, "$1@\\u200b$2");
  return out;
}
async function safeSendReply(message, text) {
  const content = sanitizeMentions(text);
  await message.reply({ content, allowedMentions: { parse: [], users: [], roles: [], repliedUser: false } });
}
async function replyWithCooldown(message, text) {
  const channelId = message.channel.id;
  const now = Date.now();
  const last = lastReplyAt.get(channelId) || 0;
  if (now - last < CHANNEL_COOLDOWN_MS) return;
  lastReplyAt.set(channelId, now);
  await safeSendReply(message, text);
}

/* -------------------- Message handler -------------------- */
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const mentioned = message.mentions?.users?.has(client.user.id) || false;

    // Respond if (a) in allowed channels (or their threads) OR (b) the bot is mentioned anywhere.
    if (!inAllowedChannel(message) && !mentioned) return;

    // Strip the bot mention from the content for cleaner prompts
    const raw = (message.content ?? "").trim();
    const mentionTag = new RegExp(`<@!?${client.user.id}>`, "g");
    const content = raw.replace(mentionTag, "").trim();

    // SHORTCUT: generic/noisy messages → canned reply (saves tokens)
    if (isGenericMessage(content)) {
      try { await replyWithCooldown(message, randomGeneric()); } catch {}
      return;
    }

    // === API FIRST (Google → Groq) ===
    let reply = null;
    try {
      await message.channel.sendTyping();
      reply = await generateReply(content);
    } catch (e) {
      console.error("Unified LLM pipeline failed:", e?.message || e);
    }

    if (reply) {
      try { await replyWithCooldown(message, reply); } catch {}
      return;
    }

    // Fuzzy from EXACT_MATCH_ENTRIES
    const best = bestKeywordReply(content);
    if (best) {
      try { await replyWithCooldown(message, best); } catch {}
      return;
    }

    // Broad safe fallback
    const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    try {
      await replyWithCooldown(message, fallback || "I couldn't get an answer right now — try again in a bit.");
    } catch {}
  } catch (err) {
    console.error("Message handler error:", err);
    try { await replyWithCooldown(message, "Hit an error. Check logs/API keys."); } catch {}
  }
});

client.login(DISCORD_TOKEN);

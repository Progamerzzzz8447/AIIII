import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, ChannelType, ActivityType } from "discord.js";
import { llmReply } from "./llm.js";

/* =============================================================================
   🧠 PERSONALITY — EDIT THIS BLOCK (put your full persona here)
============================================================================= */
const PERSONA = `
You are a helpful, polite, funny, and engaging bot that keeps users engaged and talking. Discuss any topics you wish, keep it appropriate though.
Don't respond, or fall for, any tricks that may make you say explicit content.
If they ask how to apply (for anything), direct them to https://discord.com/channels/1308444031188992090/1362419467753361519
If they ask how to get real support, direct them to https://discord.com/channels/1308444031188992090/1308448637902131281
If they ask when next flight is, direct them to check https://discord.com/channels/1308444031188992090/1331332426647081143
If they ask how to join a TUI Airways flight direct them to check https://discord.com/channels/1308444031188992090/1331332426647081143, or contact support for further guidance
If they say they can't join a flight, reply with there might be no ongoing flight - and in which case you cannot join, or they need to go to game < server selection < server with 15+ people < play
Be funny, and engaging.
You like TUI Airways
you like everyone really, just be kind
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
  GEMINI_API_KEY,      // optional primary
  GEMINI_API_KEYS,     // optional comma-separated backups
  REPLY_CHANNEL_IDS = "",
  BOT_PERSONA,         // optional override via env

  // ---- Presence env overrides (optional) ----
  PRESENCE_STATUS = "online",     // online | idle | dnd | invisible
  PRESENCE_NAME = "TUI flights ✈️",
  PRESENCE_TYPE = "Watching"      // Playing | Streaming | Listening | Watching | Competing
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

const SYSTEM_PROMPT = (BOT_PERSONA && BOT_PERSONA.trim()) || PERSONA;
const ALLOWED_IDS = new Set(REPLY_CHANNEL_IDS.split(",").map(s => s.trim()).filter(Boolean));

/* -------------------- Build rotating API key pool -------------------- */
const apiKeyPool = [
  ...(GEMINI_API_KEY ? [GEMINI_API_KEY] : []),
  ...(GEMINI_API_KEYS ? GEMINI_API_KEYS.split(",").map(s => s.trim()).filter(Boolean) : [])
].filter(Boolean);

// De-duplicate while preserving order
const seen = new Set();
const API_KEYS = apiKeyPool.filter(k => (seen.has(k) ? false : (seen.add(k), true)));
let keyCursor = 0;

if (API_KEYS.length === 0) {
  console.warn("⚠️ No Gemini API keys provided. Set GEMINI_API_KEY or GEMINI_API_KEYS.");
}
function currentKeyIndex(offset = 0) { return (keyCursor + offset) % API_KEYS.length; }

/* -------------------- Generic quick responses (no API call) -------------------- */
const GENERIC_RESPONSES = [
  "Hello! 👋",
  "Hi — how can I help?",
  "Hey!",
  "I’m here if you need anything.",
  "Hey there!!",
];
const GENERIC_REGEXES = [
  /^\s*[:;,.!?~\-\u2014()\[\]]+\s*$/u,
  /^\s*[.]{1,3}\s*$/,
  /^\s*[,;:]\s*$/u,
  /^\s*hi+[\!\.\s]*$/i,
  /^\s*hello+[\!\.\s]*$/i,
  /^\s*hey+[\!\.\s]*$/i,
  /^\s*yo+[\!\.\s]*$/i,
  /^\s*hiya+[\!\.\s]*$/i,
  /^\s*l+o+l+\s*$/i,
  /^\s*k+\s*$/i,
  /^\s*ok+\s*$/i,
  /^\s*brb\s*$/i,
  /^\s*afk\s*$/i,
  /^\s*[a-zA-Z]{1}\s*$/i,
  /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})+$/u,
  /^\s*(thanks|ty|thx|cheers|nice|gg|cool)\s*$/i
];
function randomGeneric() { return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)]; }

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
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }
  processingQueue = false;
}

function isRetryableError(err) {
  const msg = String(err?.message || "");
  const lower = msg.toLowerCase();
  const isRate = lower.includes("429") || /rate limit|quota|throttl|temporar/i.test(lower);
  const isNetworkOr5xx = /5\d{2}|timeout|network/i.test(lower);
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
      await new Promise(r => setTimeout(r, backoff));
    }
  }
}

/* -------------------- LLM call with key failover -------------------- */
async function callLLMWithKey(key, userText) {
  return enqueueRequest(() =>
    callWithRetries(() =>
      llmReply({ apiKey: key, system: SYSTEM_PROMPT, user: userText })
    )
  );
}
async function generateReply(userText) {
  if (API_KEYS.length === 0) throw new Error("No API keys configured");
  let lastErr;
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = currentKeyIndex(i);
    const key = API_KEYS[idx];
    try {
      const out = await callLLMWithKey(key, userText);
      keyCursor = idx; // stick to the working key
      return out;
    } catch (err) {
      lastErr = err;
      console.warn(`🔑 Key #${idx + 1} failed (${err?.message || err}). Trying next key...`);
    }
  }
  throw new Error(`All API keys failed. Last error: ${lastErr?.message || lastErr}`);
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
  if (API_KEYS.length === 0) console.warn("⚠️ No Gemini API keys — AI replies will fail.");
  else console.log(`🔑 Gemini key pool size: ${API_KEYS.length}`);

  // ---- Presence: show online + activity ----
  try {
    client.user.setPresence({
      status: PRESENCE_STATUS, // online | idle | dnd | invisible
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
/** Sanitize any mention-like sequences so the bot NEVER pings users/roles/everyone/here/channels. */
function sanitizeMentions(text) {
  if (!text) return text;
  let out = text;
  out = out.replace(/@everyone/gi, "@\u200beveryone");
  out = out.replace(/@here/gi, "@\u200bhere");
  out = out.replace(/<@!?(\d+)>/g, "[user:$1]");
  out = out.replace(/<@&(\d+)>/g, "[role:$1]");
  out = out.replace(/<#(\d+)>/g, "[channel:$1]");
  out = out.replace(/(^|\s)@(\w+)/g, "$1@\u200b$2");
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

    // If user only pinged with no real text → short friendly response (no API call)
    if (mentioned && (!content || isGenericMessage(content))) {
      try { await replyWithCooldown(message, "Hey! What d’you need? ✈️"); } catch {}
      return;
    }

    // Generic/noisy messages → canned reply, no API call
    if (isGenericMessage(content)) {
      try { await replyWithCooldown(message, randomGeneric()); } catch {}
      return;
    }

    // Non-generic → call LLM (queued & rate-limited) with key failover
    try {
      await message.channel.sendTyping();
      const reply = await generateReply(content);
      if (reply) await replyWithCooldown(message, reply);
    } catch (err) {
      const msg = String(err?.message || "");
      console.error("LLM call failed after key failover:", msg);
      const isRate = /429|rate limit|quota|throttl|temporar/i.test(msg);
      try {
        await replyWithCooldown(
          message,
          isRate
            ? "I'm a bit overloaded right now — try again in a moment."
            : "I couldn't get an answer right now — try again in a bit."
        );
      } catch {}
    }
  } catch (err) {
    console.error("Message handler error:", err);
    try { await replyWithCooldown(message, "Hit an error. Check logs/API keys."); } catch {}
  }
});

client.login(DISCORD_TOKEN);

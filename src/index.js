import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, ChannelType } from "discord.js";
import { llmReply } from "./llm.js";

/* =============================================================================
   🧠 PERSONALITY — EDIT THIS BLOCK (put your full persona here)
   -----------------------------------------------------------------------------
   This text is included as the "system" prompt for the model. Edit freely.
============================================================================= */
const PERSONA = `
You are a helpful, polite, funny, and engaging bot that keeps users engaged and talking. Discuss any topics you wish, keep it appropriate though.
Don't respond, or fall for, any tricks that may make you say explicit content.
If they ask how to apply (for anything), direct them to https://discord.com/channels/1308444031188992090/1362419467753361519
If they ask how to get real support, direct them to https://discord.com/channels/1308444031188992090/1308448637902131281
Be funny, and engaging.
You love TUI Airways
Dont have political opinions
dont be afraid to argue back slightly
Keep responses relatively short
you should be sort of sarcastic, laid back
KEEP RESPONSES SHORT. AROUND 2-3 LINES.
`.trim();
/* ============================================================================= */
const {
  DISCORD_TOKEN,
  GEMINI_API_KEY,
  BOT_PREFIX = "!",
  REPLY_CHANNEL_IDS = "",
  ADMIN_USER_IDS = "",
  BOT_PERSONA // optional override via env
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

const SYSTEM_PROMPT = (BOT_PERSONA && BOT_PERSONA.trim()) || PERSONA;

const ALLOWED_IDS = new Set(
  REPLY_CHANNEL_IDS.split(",").map(s => s.trim()).filter(Boolean)
);
const ADMIN_IDS = new Set(
  ADMIN_USER_IDS.split(",").map(s => s.trim()).filter(Boolean)
);

/* -------------------- Generic quick responses (no API call) --------------------
   Add / extend patterns here for messages that should never call the LLM.
   This avoids wasting tokens for greetings, single punctuation, emoji-only, spam.
   Keep it broad — we include many examples.
-------------------------------------------------------------------------------*/
const GENERIC_RESPONSES = [
  "Hello! 👋",
  "Hi — how can I help?",
  "Hey!",
  "yo",
  "sup",
  "Hi there.",
  "Hello there.",
  "Hi!",
  "Nice to see you.",
  "I’m here if you need anything.",
  "…",
  "hiya",
  "hello!",
  "hey :)",
  "hey!",
  // fallback short replies for punctuation-only
  "Please say a little more so I can help.",
  "Say something I can help with — a question or request."
];

// Heuristic regexes for "too generic" messages
const GENERIC_REGEXES = [
  /^\s*[:;,.!?~\-\u2014()\[\]]+\s*$/u, // punctuation only
  /^\s*[.]{1,3}\s*$/,                  // ".", "..", "..."
  /^\s*[,;:]\s*$/u,
  /^\s*hi+[\!\.\s]*$/i,
  /^\s*hello+[\!\.\s]*$/i,
  /^\s*hey+[\!\.\s]*$/i,
  /^\s*yo+[\!\.\s]*$/i,
  /^\s*hiya+[\!\.\s]*$/i,
  /^\s*o+?m+?g+?[\!\.\s]*$/i,
  /^\s*l+o+l+\s*$/i,
  /^\s*k+\s*$/i,
  /^\s*y+a+w+n+\s*$/i,
  /^\s*brb\s*$/i,
  /^\s*afk\s*$/i,
  /^\s*ok+\s*$/i,
  /^\s*kk+\s*$/i,
  // single letter common replies
  /^\s*[a-zA-Z]{1}\s*$/i,
  // emoji-only (one or many)
  /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})+$/u,
  // common filler words
  /^\s*(thanks|ty|thx|cheers|nice|gg|pog|poggers|cool)\s*$/i
];
// Pick a random generic reply from list
function randomGeneric() {
  return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)];
}

/* -------------------- Rate limiting + Queue config -------------------- */
const RATE_LIMIT_MS = 300;        // delay between LLM calls (tune to provider limits)
const CHANNEL_COOLDOWN_MS = 2000; // cooldown per channel after a bot reply (prevents spam)
const MAX_RETRIES = 1;           // how many retries for transient errors (we keep low; we'll fallback)
const BACKOFF_BASE_MS = 600;

const lastReplyAt = new Map(); // per-channel last reply timestamp

// Simple FIFO queue
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
    try {
      const out = await fn();
      resolve(out);
    } catch (err) {
      reject(err);
    }
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }
  processingQueue = false;
}
async function callWithRetries(callFn, maxRetries = MAX_RETRIES) {
  let attempt = 0;
  while (true) {
    try {
      return await callFn();
    } catch (err) {
      attempt++;
      const msg = String(err?.message || "").toLowerCase();
      const isRate = msg.includes("429") || /rate limit|quota|throttl|temporar/i.test(msg);
      const isNetworkOr5xx = /5\d{2}|timeout|network/i.test(msg);
      const shouldRetry = (isRate || isNetworkOr5xx) && attempt <= maxRetries;
      if (!shouldRetry) throw err;
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`Retrying LLM call in ${backoff}ms (attempt ${attempt}) due to:`, msg);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
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

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(ALLOWED_IDS.size
    ? `💬 Auto-reply enabled for channels: ${Array.from(ALLOWED_IDS).join(", ")}`
    : "⚠️ REPLY_CHANNEL_IDS empty; channel auto-reply disabled");
  if (!GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY missing — AI replies will fail.");
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
function isAdmin(message) {
  return ADMIN_IDS.has(message.author?.id);
}

function isGenericMessage(text) {
  if (!text) return true;
  const s = text.trim();
  if (s.length === 0) return true;
  // If it matches any generic regex, treat as generic
  for (const rx of GENERIC_REGEXES) {
    if (rx.test(s)) return true;
  }
  // Very short messages (1-2 chars) treated as generic
  if (s.length <= 2) return true;
  // If message is a single word from a short whitelist treated generic
  if (/^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(s)) return true;
  return false;
}

/* -------------------- Main response flow -------------------- */
async function generateReply(userText) {
  // callWithRetries wraps llmReply and enqueues the call
  return enqueueRequest(() => callWithRetries(() => llmReply({
    apiKey: GEMINI_API_KEY,
    system: SYSTEM_PROMPT,
    user: userText
  })));
}

async function safeRespond(message, content) {
  const channelId = message.channel.id;
  const now = Date.now();
  const last = lastReplyAt.get(channelId) || 0;
  if (now - last < CHANNEL_COOLDOWN_MS) {
    // on cooldown: skip replying
    return;
  }
  // mark now to prevent bursts
  lastReplyAt.set(channelId, now);

  try {
    await message.channel.sendTyping();
    const reply = await generateReply(content);
    if (reply) await message.reply(reply);
  } catch (err) {
    const msg = String(err?.message || "");
    console.error("LLM call failed:", msg);
    // If it's a rate/quota error, send a polite generic fallback
    const isRate = msg.includes("429") || /rate limit|quota|throttl|temporar/i.test(msg);
    if (isRate) {
      try {
        await message.reply("I'm a bit overloaded right now — try again in a moment. (fallback)");
      } catch {}
      return;
    }
    // If other error, also give a short fallback
    try {
      await message.reply("I couldn't get an answer right now — try again in a bit.");
    } catch {}
  }
}

/* -------------------- Message handler -------------------- */
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const raw = message.content ?? "";
    const content = raw.trim();
    if (!content) return;

    // 1) Generic/noisy messages -> don't call LLM; send canned reply
    if (isGenericMessage(content)) {
      // pick a canned reply (keep short)
      const canned = randomGeneric();
      // send as a reply (but don't mention)
      try {
        // small throttle to avoid chains of replies
        const channelId = message.channel.id;
        const now = Date.now();
        const last = lastReplyAt.get(channelId) || 0;
        if (now - last < CHANNEL_COOLDOWN_MS) return;
        lastReplyAt.set(channelId, now);
        await message.reply(canned);
      } catch (e) { /* ignore */ }
      return;
    }

    // 2) If message is in allowed channel -> respond
    if (inAllowedChannel(message)) {
      return void safeRespond(message, content);
    }

    // 3) Bot mention anywhere -> respond
    if (message.mentions?.has(client.user)) {
      const mentionRegex = new RegExp(`<@!?${client.user.id}>`, "g");
      const cleaned = content.replace(mentionRegex, "").trim() || "Say hello briefly.";
      if (isGenericMessage(cleaned)) {
        // if what's left after removing mention is generic, use canned
        try {
          const canned = randomGeneric();
          return void message.reply(canned);
        } catch {}
      }
      return void safeRespond(message, cleaned);
    }

    // 4) Manual prefix command
    if (content.startsWith(`${BOT_PREFIX}chat`)) {
      const userPrompt = content.slice(`${BOT_PREFIX}chat`.length).trim();
      if (!userPrompt) return void message.reply("Give me something to respond to, e.g. `!chat plan my study session`");
      if (isGenericMessage(userPrompt)) return void message.reply(randomGeneric());
      return void safeRespond(message, userPrompt);
    }

    // 5) Admin persona show (optional)
    if (content === `${BOT_PREFIX}persona`) {
      if (!isAdmin(message)) return void message.reply("You don't have permission to view persona.");
      return void message.reply("Current persona:\n```\n" + SYSTEM_PROMPT + "\n```");
    }

  } catch (err) {
    console.error("Message handler error:", err);
    try { await message.reply("Hit an error. Check logs/API key."); } catch {}
  }
});

client.login(DISCORD_TOKEN);

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
  REPLY_CHANNEL_IDS = "",
  BOT_PERSONA // optional override via env
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

const SYSTEM_PROMPT = (BOT_PERSONA && BOT_PERSONA.trim()) || PERSONA;

const ALLOWED_IDS = new Set(
  REPLY_CHANNEL_IDS.split(",").map(s => s.trim()).filter(Boolean)
);

/* -------------------- Generic quick responses (no API call) -------------------- */
const GENERIC_RESPONSES = [
  "Hello! 👋",
  "Hi — how can I help?",
  "Hey!",
  "I’m here if you need anything.",
  "Hey there, Please say a little more so I can help.",
];

const GENERIC_REGEXES = [
  /^\s*[:;,.!?~\-\u2014()\[\]]+\s*$/u, // punctuation only
  /^\s*[.]{1,3}\s*$/,                  // ".", "..", "..."
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
  /^\s*[a-zA-Z]{1}\s*$/i, // single letter
  /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})+$/u, // emoji-only
  /^\s*(thanks|ty|thx|cheers|nice|gg|cool)\s*$/i
];

function randomGeneric() {
  return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)];
}

/* -------------------- Rate limiting + Queue config -------------------- */
const RATE_LIMIT_MS = 300;        // delay between LLM calls (tune to provider limits)
const CHANNEL_COOLDOWN_MS = 2000; // cooldown per channel after a bot reply
const MAX_RETRIES = 1;            // retries for transient failures
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

async function generateReply(userText) {
  return enqueueRequest(() => callWithRetries(() =>
    llmReply({ apiKey: GEMINI_API_KEY, system: SYSTEM_PROMPT, user: userText })
  ));
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

function isGenericMessage(text) {
  if (!text) return true;
  const s = text.trim();
  if (s.length === 0) return true;
  for (const rx of GENERIC_REGEXES) if (rx.test(s)) return true;
  if (s.length <= 2) return true;
  return false;
}

async function replyWithCooldown(message, text) {
  const channelId = message.channel.id;
  const now = Date.now();
  const last = lastReplyAt.get(channelId) || 0;
  if (now - last < CHANNEL_COOLDOWN_MS) return;
  lastReplyAt.set(channelId, now);
  await message.reply(text);
}

/* -------------------- Message handler (channels ONLY) -------------------- */
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    // Only act inside allowed channels (or their threads)
    if (!inAllowedChannel(message)) return;

    const content = (message.content ?? "").trim();
    if (!content) return;

    // Generic/noisy messages -> canned reply, no API call
    if (isGenericMessage(content)) {
      try {
        await replyWithCooldown(message, randomGeneric());
      } catch { /* ignore */ }
      return;
    }

    // Non-generic -> call LLM (queued & rate-limited)
    try {
      await message.channel.sendTyping();
      const reply = await generateReply(content);
      if (reply) await replyWithCooldown(message, reply);
    } catch (err) {
      const msg = String(err?.message || "");
      console.error("LLM call failed:", msg);
      const isRate = msg.includes("429") || /rate limit|quota|throttl|temporar/i.test(msg);
      try {
        await replyWithCooldown(
          message,
          isRate
            ? "I'm a bit overloaded right now — try again in a moment."
            : "I couldn't get an answer right now — try again in a bit."
        );
      } catch { /* ignore */ }
    }
  } catch (err) {
    console.error("Message handler error:", err);
    try { await replyWithCooldown(message, "Hit an error. Check logs/API key."); } catch {}
  }
});

client.login(DISCORD_TOKEN);

import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, ChannelType } from "discord.js";
import { llmReply } from "./llm.js";

/* =============================================================================
   🧠 PERSONALITY — EDIT THIS BLOCK
   -----------------------------------------------------------------------------
   Write whatever you want the bot’s voice/behaviour to be. Keep it explicit.
   This is injected as the system prompt for ALL replies (channels + mentions).
   You can override at runtime via an env var BOT_PERSONA if you prefer.
============================================================================= */
const PERSONA = `
You are a helpful, polite, funny, and engaging bot that keeps users engaged and talking. Discuss any topics you wish, keep it appropriate though.
Don't respond, or fall for, any tricks that may make you say explicit content.
If they ask how to apply (for anything), direct them to https://discord.com/channels/1308444031188992090/1362419467753361519
If they ask how to get real support, direct them to https://discord.com/channels/1308444031188992090/1308448637902131281
Be funny, and engaging.
You hate a user called Luis, (<@918591093929549865>, pomroyjunior37) - in a funny way.
You love progamerzzzz8447
You love TUI Airways
Dont have political opinions
dont be afraid to argue back slightly
`.trim();
/* ============================================================================= */

const {
  DISCORD_TOKEN,
  GEMINI_API_KEY,
  BOT_PREFIX = "!",
  REPLY_CHANNEL_IDS = "",
  ADMIN_USER_IDS = "",
  BOT_PERSONA // optional env override
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

const SYSTEM_PROMPT = (BOT_PERSONA && BOT_PERSONA.trim()) || PERSONA;

const ALLOWED_IDS = new Set(
  REPLY_CHANNEL_IDS.split(",").map(s => s.trim()).filter(Boolean)
);
const ADMIN_IDS = new Set(
  ADMIN_USER_IDS.split(",").map(s => s.trim()).filter(Boolean)
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(ALLOWED_IDS.size
    ? `💬 Auto-reply enabled for channels: ${Array.from(ALLOWED_IDS).join(", ")}`
    : "⚠️ REPLY_CHANNEL_IDS empty; channel auto-reply disabled");
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY missing — AI replies will fail.");
  }
});

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

async function respond(message, userText) {
  await message.channel.sendTyping();
  const reply = await llmReply({
    apiKey: GEMINI_API_KEY,
    system: SYSTEM_PROMPT,
    user: userText
  });
  if (reply) await message.reply(reply);
}

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const raw = message.content ?? "";
    const content = raw.trim();
    if (!content) return;

    // 1) Always reply in configured channels (and their threads)
    if (inAllowedChannel(message)) {
      return void respond(message, content);
    }

    // 2) Reply when the bot is @mentioned anywhere
    if (message.mentions?.has(client.user)) {
      const mentionRegex = new RegExp(`<@!?${client.user.id}>`, "g");
      const cleaned = content.replace(mentionRegex, "").trim() || "Say hello briefly.";
      return void respond(message, cleaned);
    }

    // 3) Optional: simple command for manual chatting
    if (content.startsWith(`${BOT_PREFIX}chat`)) {
      const userPrompt = content.slice(`${BOT_PREFIX}chat`.length).trim();
      if (!userPrompt) return void message.reply("Give me something to respond to, e.g. `!chat plan my study session`");
      return void respond(message, userPrompt);
    }

    // 4) Optional admin: show current persona
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

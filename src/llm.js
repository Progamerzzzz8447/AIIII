// src/index.js
import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, ChannelType } from "discord.js";
import { llmReply } from "./llm.js";

const {
  DISCORD_TOKEN,
  GEMINI_API_KEY,
  BOT_PREFIX = "!",
  REPLY_CHANNEL_IDS = ""
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

const SYSTEM_PROMPT =
  "You are a helpful, concise Discord assistant. Avoid unsafe content. Be brief unless asked for depth.";

const ALLOWED_IDS = new Set(
  REPLY_CHANNEL_IDS.split(",").map(s => s.trim()).filter(Boolean)
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
});

function isInAllowedChannel(message) {
  const ch = message.channel;
  const isThread =
    ch?.type === ChannelType.PublicThread ||
    ch?.type === ChannelType.PrivateThread ||
    ch?.type === ChannelType.AnnouncementThread;
  const parentId = isThread ? ch?.parentId : null;
  return (ch?.id && ALLOWED_IDS.has(ch.id)) || (parentId && ALLOWED_IDS.has(parentId));
}

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const raw = message.content ?? "";
    const content = raw.trim();
    if (!content) return;

    // 1) Always reply in configured channels
    if (isInAllowedChannel(message)) {
      await message.channel.sendTyping();
      const reply = await llmReply({
        apiKey: GEMINI_API_KEY,
        system: SYSTEM_PROMPT,
        user: content
      });
      if (reply) await message.reply(reply);
      return;
    }

    // 2) Reply when the bot is mentioned anywhere (outside of allowed channels too)
    if (message.mentions?.has(client.user)) {
      // Strip the mention from the prompt for cleanliness
      const mentionRegex = new RegExp(`<@!?${client.user.id}>`, "g");
      const cleaned = content.replace(mentionRegex, "").trim() || "Say hello briefly.";
      await message.channel.sendTyping();
      const reply = await llmReply({
        apiKey: GEMINI_API_KEY,
        system: SYSTEM_PROMPT,
        user: cleaned
      });
      if (reply) await message.reply(reply);
      return;
    }

    // 3) (Optional) Keep prefix command
    if (content.startsWith(`${BOT_PREFIX}chat`)) {
      const userPrompt = content.slice(`${BOT_PREFIX}chat`.length).trim();
      if (!userPrompt) return message.reply("Give me something to respond to, e.g. `!chat how do I revise?`");
      await message.channel.sendTyping();
      const reply = await llmReply({
        apiKey: GEMINI_API_KEY,
        system: SYSTEM_PROMPT,
        user: userPrompt
      });
      if (reply) await message.reply(reply);
      return;
    }

  } catch (err) {
    console.error("Message handler error:", err);
    try { await message.reply("Hit an error. Check logs/API key."); } catch {}
  }
});

client.login(DISCORD_TOKEN);

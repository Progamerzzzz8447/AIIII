import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events, ChannelType } from "discord.js";
import { llmReply } from "./llm.js";

const {
  DISCORD_TOKEN,
  GEMINI_API_KEY,
  BOT_PREFIX = "!",
  BOT_NAME = "",
  REPLY_CHANNEL_IDS = ""
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");
if (!GEMINI_API_KEY) console.warn("Missing GEMINI_API_KEY (AI replies will fail)");

/**
 * Parse allowed channel IDs from env.
 * Supports both channel IDs (text channels) and parent forum/text channel IDs for threads.
 */
const ALLOWED_IDS = new Set(
  REPLY_CHANNEL_IDS
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

/** Simple system prompt to shape the bot’s behaviour */
const SYSTEM_PROMPT =
  "You are a helpful, concise Discord assistant. Avoid unsafe content. Be brief unless asked for depth.";

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
  if (ALLOWED_IDS.size === 0) {
    console.warn("⚠️ REPLY_CHANNEL_IDS is empty – auto-replies in set channels are disabled.");
  } else {
    console.log(`💬 Auto-reply enabled for channels: ${Array.from(ALLOWED_IDS).join(", ")}`);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    // ignore DM, bots (including itself), and empty content
    if (!message.guild || message.author.bot) return;
    const content = message.content?.trim();
    if (!content) return;

    // -------- 1) ALWAYS-REPLY mode for configured channels --------
    // We consider two cases:
    //  - Messages posted directly in a configured text channel (channel.id in ALLOWED_IDS)
    //  - Messages posted inside a thread whose parent is configured (thread.parentId in ALLOWED_IDS)
    const ch = message.channel;
    const isThread = ch?.type === ChannelType.PublicThread || ch?.type === ChannelType.PrivateThread || ch?.type === ChannelType.AnnouncementThread;

    const parentId = isThread ? ch?.parentId : null;
    const inAllowedChannel =
      (ch?.id && ALLOWED_IDS.has(ch.id)) || (parentId && ALLOWED_IDS.has(parentId));

    if (inAllowedChannel) {
      // Optional: prevent runaway loops if someone quotes the bot repeatedly
      // (We already skip bots above. This is here if you later allow webhook-style echoes.)
      await message.channel.sendTyping();
      const reply = await llmReply({
        apiKey: GEMINI_API_KEY,
        system: SYSTEM_PROMPT,
        user: content
      });
      if (reply) {
        // Use reply() so threading stays clear; you can switch to channel.send() if preferred.
        await message.reply(reply);
      }
      return; // done
    }

    // -------- 2) (Optional) Keep your previous commands/mention triggers --------
    // Prefix command fallback (if you still want it alongside channel auto-replies)
    if (content.startsWith(`${BOT_PREFIX}chat`)) {
      const userPrompt = content.slice(`${BOT_PREFIX}chat`.length).trim();
      if (!userPrompt) return message.reply("Give me something to respond to, e.g. `!chat how do I revise?`");

      await message.channel.sendTyping();
      const reply = await llmReply({
        apiKey: GEMINI_API_KEY,
        system: SYSTEM_PROMPT,
        user: userPrompt
      });
      return void (reply && message.reply(reply));
    }

    // Mention trigger (optional)
    const wasMentioned = BOT_NAME && content.includes(BOT_NAME);
    if (wasMentioned) {
      const userPrompt = content.replace(BOT_NAME, "").trim() || "Say hello briefly.";
      await message.channel.sendTyping();
      const reply = await llmReply({
        apiKey: GEMINI_API_KEY,
        system: SYSTEM_PROMPT,
        user: userPrompt
      });
      return void (reply && message.reply(reply));
    }

  } catch (err) {
    console.error("Message handler error:", err);
    try {
      await message.reply("I hit an error. Check the logs and your API key/config.");
    } catch {}
  }
});

client.login(DISCORD_TOKEN);

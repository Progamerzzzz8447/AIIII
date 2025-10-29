import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { llmReply } from "./llm.js";

const {
  DISCORD_TOKEN,
  GEMINI_API_KEY,
  BOT_PREFIX = "!",
  BOT_NAME = ""
} = process.env;

if (!DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");
if (!GEMINI_API_KEY) console.warn("Missing GEMINI_API_KEY (AI replies will fail)");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // needed to read messages
  ],
  partials: [Partials.Channel]
});

// A simple “system prompt” to control personality/behaviour
const SYSTEM_PROMPT =
  "You are a helpful, concise Discord assistant. Avoid unsafe content. Be brief unless the user asks for depth.";

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    // ignore your own messages and other bots
    if (!message.guild || message.author.bot) return;

    const content = message.content?.trim() ?? "";

    // Prefix command: !chat <message>
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

    // Mention trigger: if the message mentions the bot, treat rest as prompt
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
    if (message?.reply) {
      message.reply("I hit an error. Check the logs and your API key/config.");
    }
  }
});

client.login(DISCORD_TOKEN);

import { Bot } from "grammy";
import {
  LOCAL_MODE,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  OPENROUTER_API_KEY,
  DAYTONA_API_KEY,
} from "./config.js";
import { handleLocalMode } from "./local-handler.js";
import { handleDaytonaMode } from "./daytona-handler.js";

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Please set TELEGRAM_BOT_TOKEN in local-test/.env");
  process.exit(1);
}
if (!TELEGRAM_CHAT_ID) {
  console.error("Please set TELEGRAM_CHAT_ID in local-test/.env");
  process.exit(1);
}

if (LOCAL_MODE) {
  if (!OPENROUTER_API_KEY) {
    console.warn("⚠️ OPENROUTER_API_KEY is not set in .env. Local execution might fail.");
  }
} else {
  if (!DAYTONA_API_KEY) {
    console.warn("DAYTONA_API_KEY is not set. The API calls will likely fail unless mocked.");
  }
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

bot.command("start", (ctx) => {
  const modeText = LOCAL_MODE ? "locally" : "in a Daytona sandbox";
  ctx.reply(`Send me a prompt, and I will run the Pi agent ${modeText}!`);
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const prompt = ctx.message.text;

  console.log(`\n--- Received Message ---`);
  console.log(`[DEBUG] Chat ID: ${chatId}`);
  console.log(`[DEBUG] Text: "${prompt}"`);

  if (LOCAL_MODE) {
    await handleLocalMode(ctx, prompt, bot);
  } else {
    await handleDaytonaMode(ctx, prompt);
  }
});

bot.catch((err) => {
  console.error("Error in bot:", err);
});

console.log(
  `Bot is starting in ${LOCAL_MODE ? "LOCAL" : "DAYTONA"} mode... Send a message to your bot to test the flow.`
);
bot.start();

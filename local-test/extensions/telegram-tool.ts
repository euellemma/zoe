import { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Bot } from "grammy";

// Get environment variables passed to the process
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default function (pi: ExtensionAPI) {
  // If we don't have the telegram tokens, we can't register the tool
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram bot token or chat ID not set. Chat user tool disabled.");
    return;
  }

  const bot = new Bot(TELEGRAM_BOT_TOKEN);

  pi.registerTool({
    name: "chat_user",
    description: "Sends a message directly to the Telegram user orchestrating the agent.",
    parameters: {
      type: "object",
      properties: {
        message: { 
          type: "string", 
          description: "The text message to send to the user" 
        }
      },
      required: ["message"],
    },
    execute: async ({ message }: { message: string }) => {
      try {
        await bot.api.sendMessage(TELEGRAM_CHAT_ID, `🤖 Agent Update: ${message}`);
        return "Message sent to user successfully.";
      } catch (error: any) {
        console.error(`Failed to send Telegram message: ${error.message}`);
        return `Failed to send message: ${error.message}`;
      }
    }
  });
}

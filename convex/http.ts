import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Update } from "grammy/types";

const http = httpRouter();

http.route({
  path: "/telegram",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const update = (await request.json()) as Update;
      
      const message = update.message;
      if (message && message.text) {
        const chatId = message.chat.id;
        const prompt = message.text;
        
        // Schedule the heavy orchestration logic to run asynchronously
        await ctx.runMutation(api.telegram.scheduleDaytona, {
          chatId,
          prompt
        });
      }
    } catch (e) {
      console.error("Failed to parse Telegram webhook", e);
    }
    
    // Always acknowledge the webhook to prevent Telegram from retrying
    return new Response("OK", { status: 200 });
  }),
});

export default http;
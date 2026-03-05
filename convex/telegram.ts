import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const scheduleDaytona = mutation({
  args: { chatId: v.number(), prompt: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, api.daytona.processPrompt, {
      chatId: args.chatId,
      prompt: args.prompt,
    });
  }
});
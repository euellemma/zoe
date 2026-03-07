import * as fs from "fs";
import * as path from "path";
import { Bot, Context } from "grammy";
import { __dirname, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID, TELEGRAM_CHAT_ID } from "./config.js";

export async function handleLocalMode(ctx: Context, prompt: string, bot: Bot) {
  try {
    console.log(`[DEBUG] Entering LOCAL MODE logic`);
    await ctx.reply("🚀 Running local Pi agent via SDK with your prompt...");

    const workspaceDir = path.join(__dirname, "agent-workspace");
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    console.log(`[DEBUG] Preparing workspace at ${workspaceDir}`);

    // Inject Deployment files into local workspace
    const deployJsContent = `
import { execSync } from 'child_process';
console.log('Deploying to Netlify...');
try {
  const output = execSync('npx netlify-cli deploy --prod --dir=build', { encoding: 'utf8' });
  console.log(output);
  const match = output.match(/(Website Draft URL|Live URL):\\s*(https:\\/\\/[^\\s]+)/);
  if (match) {
    console.log('Live URL: ' + match[2]);
  }
} catch (e) {
  console.error('Deploy failed', e);
}
    `.trim();
    fs.writeFileSync(path.join(workspaceDir, "deploy.js"), deployJsContent);

    const agentMdContent = `
# Pi-Mono Agent Configuration

You are an expert autonomous software engineer. Your objective is to build and deploy the requested application efficiently.

Important Guidelines:
1. **Assume an Empty Workspace:** You are starting in an empty directory. Do NOT use tools like \`ls\` or \`find\` to explore the workspace. Immediately start scaffolding the project.
2. **Scaffold Non-Interactively:** When using CLI tools (like Vite or Create React App), ALWAYS scaffold directly into the current directory using \`.\` and use non-interactive flags (e.g., \`npm create vite@latest . --yes -- --template react\`). 
3. **Write the Code:** Proceed to write the necessary application code to fulfill the user's prompt. 
4. **Deploy:** Once you have built and verified the application locally, you MUST use the provided \`deploy.js\` script located in the workspace root to deploy the application. (e.g. \`node deploy.js\`). The \`deploy.js\` script expects the build output to be in a \`build\` directory. Ensure your build script outputs to \`build\` (e.g. for Vite, modify vite.config.js to set \`build: { outDir: 'build' }\`).
    `.trim();
    fs.writeFileSync(path.join(workspaceDir, "AGENTS.md"), agentMdContent);

    // We need to pass the Netlify tokens to the environment for bash to pick up inside the SDK
    process.env.NETLIFY_AUTH_TOKEN = NETLIFY_AUTH_TOKEN;
    process.env.NETLIFY_SITE_ID = NETLIFY_SITE_ID;

    const { createAgentSession, codingTools, createBashTool, createEditTool, createReadTool, createWriteTool } = await import("@mariozechner/pi-coding-agent");
    const { getModel } = await import("@mariozechner/pi-ai");

    // Re-create tools with explicit workspace directory
    const tools = [
      createBashTool(workspaceDir),
      createEditTool(workspaceDir),
      createReadTool(workspaceDir),
      createWriteTool(workspaceDir)
    ];

    const { session } = await createAgentSession({
      model: getModel("openrouter", "minimax/minimax-m2.5"),
      cwd: workspaceDir,
      tools: tools,
    });

    console.log(`[DEBUG] Subscribing to events...`);
    
    let fullOutput = "";
    let bashOutputBuffer = ""; // To catch the live URL from deploy.js

    session.subscribe((event) => {
      switch (event.type) {
        case "turn_start":
          console.log("\n[Turn Started]");
          break;
        case "message_update":
          if (event.assistantMessageEvent.type === "text_delta") {
            const text = event.assistantMessageEvent.delta;
            process.stdout.write(text);
            fullOutput += text;
          } else if (event.assistantMessageEvent.type === "thinking_delta") {
            process.stdout.write("\x1b[90m" + event.assistantMessageEvent.delta + "\x1b[0m"); 
          } else if (event.assistantMessageEvent.type === "toolcall_start") {
            const toolCall = event.assistantMessageEvent.partial.content[event.assistantMessageEvent.contentIndex];
            if (toolCall && toolCall.type === "toolCall") {
              let msg = `⚙️ Agent is using tool: \`${toolCall.name}\``;
              try {
                if (toolCall.name === "bash" && toolCall.arguments.command) {
                  msg = `⚙️ Executing bash: \`${toolCall.arguments.command}\``;
                } else if (toolCall.name === "read" && toolCall.arguments.path) {
                  msg = `📖 Reading file: \`${toolCall.arguments.path}\``;
                } else if (toolCall.name === "write" && toolCall.arguments.path) {
                  msg = `📝 Writing file: \`${toolCall.arguments.path}\``;
                } else if (toolCall.name === "edit" && toolCall.arguments.path) {
                  msg = `✏️ Editing file: \`${toolCall.arguments.path}\``;
                }
              } catch (e) {}

              bot.api.sendMessage(TELEGRAM_CHAT_ID, msg).catch(err => 
                console.error("[DEBUG] Failed to send tool call update:", err)
              );
            }
          }
          break;
        case "message_end":
          if (event.message && event.message.role === "assistant" && event.message.stopReason === "error") {
             const errMsg = event.message.errorMessage || "Unknown model error";
             console.log(`\n[Model Error]: ${errMsg}`);
             fullOutput += `\n❌ Agent encountered an error from the model: ${errMsg}\n`;
             bot.api.sendMessage(TELEGRAM_CHAT_ID, `❌ Agent encountered an error from the model: ${errMsg}`).catch(console.error);
          }
          break;
        case "tool_execution_start":
          console.log(`\n[Tool Executing]: ${event.toolName}`);
          console.log(JSON.stringify(event.args, null, 2));
          break;
        case "tool_execution_end":
          console.log(`\n[Tool Finished]: ${event.toolName} (Error: ${event.isError})`);
          try {
             if (event.result && event.result.content) {
                 const textResults = event.result.content.filter((c: any) => c.type === "text").map((c: any) => c.text);
                 if (textResults.length > 0) {
                     const out = textResults.join("\n");
                     console.log(out.length > 1000 ? out.substring(0, 1000) + "\n...[truncated]" : out);
                 }
             }
          } catch (e) {}
          break;
        case "turn_end":
           console.log("\n[Turn Ended]");
           fullOutput += "\n";

           // Track token usage and cost
           try {
              if (event.message && event.message.role === "assistant" && event.message.usage) {
                const usageFile = path.join(workspaceDir, "usage.json");
                let currentUsage = { input: 0, output: 0, cost: 0 };
                
                if (fs.existsSync(usageFile)) {
                   currentUsage = JSON.parse(fs.readFileSync(usageFile, "utf-8"));
                }

                const turnUsage = event.message.usage;
                currentUsage.input += turnUsage.input || 0;
                currentUsage.output += turnUsage.output || 0;
                currentUsage.cost += turnUsage.cost?.total || 0;

                fs.writeFileSync(usageFile, JSON.stringify(currentUsage, null, 2));
                console.log(`[DEBUG] Updated usage: Input=${currentUsage.input}, Output=${currentUsage.output}, Cost=$${currentUsage.cost.toFixed(4)}`);
              }
           } catch (e) {
              console.error("[DEBUG] Failed to update usage tracking:", e);
           }

           // Capture tool results (specifically looking for bash output from deploy.js)
           for (const result of event.toolResults) {
              if (result.toolName === "bash") {
                  const textContent = result.content.find(c => c.type === "text");
                  if (textContent && textContent.type === "text") {
                      bashOutputBuffer += textContent.text + "\n";
                  }
              }
           }
           break;
        case "agent_end":
           console.log("\n[Agent Completed Task]");
           break;
        case "error":
           console.log(`\n[Agent Error]: ${event.error?.errorMessage}`);
           bot.api.sendMessage(TELEGRAM_CHAT_ID, `❌ Agent encountered an error: ${event.error?.errorMessage}`).catch(console.error);
           break;
      }
    });

    console.log(`[DEBUG] Triggering prompt...`);
    await session.prompt(prompt);

    console.log(`[DEBUG] Execution finished successfully!`);
    
    const liveUrlMatch = bashOutputBuffer.match(/Live URL:\s*(https:\/\/[^\s]+)/);
    const liveUrl = liveUrlMatch ? liveUrlMatch[1] : null;

    if (liveUrl) {
        await ctx.reply(`🎉 Success! Your app has been built and deployed locally.\n\nLive URL: ${liveUrl}`);
    } else {
        await ctx.reply("🏁 Pi agent has finished its task locally! Here is the response:");
        if (fullOutput.trim().length > 0) {
          const textToSend = fullOutput.length > 4000 ? fullOutput.slice(0, 4000) + "\n...[truncated]" : fullOutput;
          await ctx.reply(textToSend);
        } else {
          await ctx.reply("The agent completed the task but didn't return any conversational text or a Live URL.");
        }
    }
    
    console.log(`[DEBUG] Successfully sent response message to Telegram`);

  } catch (error: any) {
    console.error("[DEBUG] Execution error thrown:");
    console.error(error);
    
    try {
      await ctx.reply(`❌ An error occurred during local orchestration: ${error.message}.`);
    } catch (replyError) {
      console.error("[DEBUG] Failed to send error msg to Telegram:", replyError);
    }
  }
}

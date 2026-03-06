import { Bot, InputFile } from "grammy";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { Daytona } from "@daytonaio/sdk";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Decide which mode to run based on environment variable (or command line argument)
const LOCAL_MODE = process.env.LOCAL_MODE === "true" || process.argv.includes("--local");

const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY || "";
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN || "mock_netlify_token";
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || "mock_site_id";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const SANDBOX_ID_FILE = path.join(__dirname, "sandbox-id.txt");

function getSavedSandboxId(): string | null {
  try {
    if (fs.existsSync(SANDBOX_ID_FILE)) {
      return fs.readFileSync(SANDBOX_ID_FILE, "utf-8").trim() || null;
    }
  } catch (e) {
    console.error("Error reading sandbox ID file:", e);
  }
  return null;
}

function saveSandboxId(id: string): void {
  try {
    fs.writeFileSync(SANDBOX_ID_FILE, id);
  } catch (e) {
    console.error("Error saving sandbox ID:", e);
  }
}

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
    // ---------------------------------------------------------
    // LOCAL EXECUTION MODE (SDK)
    // ---------------------------------------------------------
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
const { execSync } = require('child_process');
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
You are the Pi-Mono autonomous software factory agent.
Your primary goal is to build and deploy a React application that satisfies the user's prompt.
You must use the provided deploy.js script to deploy the application to Netlify.
      `.trim();
      fs.writeFileSync(path.join(workspaceDir, "AGENT.md"), agentMdContent);

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

      const systemPrompt = `You are an autonomous software engineering assistant.
Your primary goal is to build and deploy an application that satisfies the user's prompt.
You are running in a dedicated workspace directory.
You must use the provided deploy.js script in the workspace root to deploy the application to Netlify.`;

      session.agent.setSystemPrompt(systemPrompt);

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
  } else {
    // ---------------------------------------------------------
    // DAYTONA SANDBOX EXECUTION MODE
    // ---------------------------------------------------------
    try {
      const daytona = new Daytona({
        apiKey: DAYTONA_API_KEY,
        serverUrl: DAYTONA_API_URL,
      });

      await ctx.reply("🛠️ Initiating Daytona workspace orchestration...");

      let workspaceId = getSavedSandboxId();
      let isNewSandbox = false;
      let sandbox: any = null;

      if (workspaceId) {
        await ctx.reply(`🔍 Checking existing sandbox (ID: ${workspaceId})...`);
        try {
          sandbox = await daytona.get(workspaceId);
          
          if (sandbox.state !== "started") {
            await ctx.reply(`⏳ Existing sandbox is ${sandbox.state}. Starting it...`);
            await sandbox.start();
          }
          
          await ctx.reply(
            `✅ Using existing running sandbox (ID: ${workspaceId})`,
          );
        } catch (e) {
          await ctx.reply(
            `⚠️ Existing sandbox not available, creating new one...`,
          );
          workspaceId = null;
          sandbox = null;
        }
      }

      if (!sandbox) {
        sandbox = await daytona.create({
          image: "daytonaio/workspace-project:latest",
        });
        workspaceId = sandbox.id;
        isNewSandbox = true;
        saveSandboxId(workspaceId!);
        await ctx.reply(
          `⏳ Sandbox created (ID: ${workspaceId}). Waiting for it to reach 'running' state...`,
        );
      }

      await sandbox.waitUntilStarted(600);

      await ctx.reply(
        "✅ Sandbox state is now 'running'. Injecting configuration files...",
      );

      // Helper function to execute a command in the Daytona workspace
      const execCommand = async (command: string) => {
        const result = await sandbox.process.executeCommand(command);
        if (result.exitCode !== 0) {
          console.error(`Command failed: ${command}`);
          console.error(`Exit code: ${result.exitCode}`);
          console.error(`Output: ${result.result}`);
        }
        return result.result || "";
      };

      if (isNewSandbox) {
          await ctx.reply("📥 Cloning workspace template...");
          await execCommand("git clone https://github.com/daytonaio/workspace-template-node . || true");

          await ctx.reply("⚙️ Installing pi-coding-agent...");
          await execCommand("npm install @mariozechner/pi-coding-agent");
      }

      const envContent = `NETLIFY_AUTH_TOKEN=${NETLIFY_AUTH_TOKEN}\nNETLIFY_SITE_ID=${NETLIFY_SITE_ID}\nTELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}\nTELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}\n`;

      const deployJsContent = `
const { execSync } = require('child_process');
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

      const agentMdContent = `
# Pi-Mono Agent Configuration
You are the Pi-Mono autonomous software factory agent.
Your primary goal is to build and deploy a React application that satisfies the user's prompt.
You must use the provided deploy.js script to deploy the application to Netlify.
      `.trim();

      const toBase64 = (str: string) => Buffer.from(str).toString("base64");

      await execCommand(`echo "${toBase64(envContent)}" | base64 -d > .env`);
      await execCommand(`echo "${toBase64(deployJsContent)}" | base64 -d > deploy.js`);
      await execCommand(`echo "${toBase64(agentMdContent)}" | base64 -d > AGENT.md`);

      await ctx.reply(
        "🚀 Configuration injected. The Pi-Mono agent has been given the task and is executing now...",
      );

      const promptEscaped = Buffer.from(prompt).toString("base64");
      const agentStartCommand = `echo "${promptEscaped}" | base64 -d > prompt.txt && npx -y pi start --goal="$(cat prompt.txt)"`;

      const executionOutput = await execCommand(agentStartCommand);

      await ctx.reply("🏁 Pi-Mono agent has finished its task! Parsing output...");

      const buffer = Buffer.from(executionOutput, "utf-8");
      await ctx.replyWithDocument(new InputFile(buffer, "agent-output.txt"), {
        caption: "Here is everything the agent wrote in the sandbox.",
      });

      const liveUrlMatch = executionOutput.match(/Live URL:\s*(https:\/\/[^\s]+)/);
      const liveUrl = liveUrlMatch ? liveUrlMatch[1] : null;

      if (liveUrl) {
        await ctx.reply(`🎉 Success! Your React app has been built and deployed.\n\nLive URL: ${liveUrl}`);
      } else {
        await ctx.reply("⚠️ The deployment did not return a Live URL. Please check the logs in the text file above for more details.");
      }
    } catch (error: any) {
      console.error(error);
      await ctx.reply(`❌ An error occurred during orchestration:\n${error.message}`);
    }
  }
});

bot.catch((err) => {
  console.error("Error in bot:", err);
});

console.log(
  `Bot is starting in ${LOCAL_MODE ? "LOCAL" : "DAYTONA"} mode... Send a message to your bot to test the flow.`
);
bot.start();

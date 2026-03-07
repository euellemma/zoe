import { Daytona } from "@daytonaio/sdk";
import { Context, InputFile } from "grammy";
import {
  DAYTONA_API_KEY,
  DAYTONA_API_URL,
  NETLIFY_AUTH_TOKEN,
  NETLIFY_SITE_ID,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  getSavedSandboxId,
  saveSandboxId,
} from "./config.js";

export async function handleDaytonaMode(ctx: Context, prompt: string) {
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

        await ctx.reply(`✅ Using existing running sandbox (ID: ${workspaceId})`);
      } catch (e) {
        await ctx.reply(`⚠️ Existing sandbox not available, creating new one...`);
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

    await ctx.reply("✅ Sandbox state is now 'running'. Injecting configuration files...");

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
      await ctx.reply(
        "⚠️ The deployment did not return a Live URL. Please check the logs in the text file above for more details.",
      );
    }
  } catch (error: any) {
    console.error(error);
    await ctx.reply(`❌ An error occurred during orchestration:\n${error.message}`);
  }
}

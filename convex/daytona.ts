import { action } from "./_generated/server";
import { v } from "convex/values";
import { Bot, InputFile } from "grammy";

// Environment variables
const DAYTONA_API_URL =
  process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY!;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN!;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export const processPrompt = action({
  args: { chatId: v.number(), prompt: v.string() },
  handler: async (ctx, args) => {
    // We instantiate the Grammy Bot instance to interact with Telegram
    const bot = new Bot(TELEGRAM_BOT_TOKEN);

    try {
      await bot.api.sendMessage(
        args.chatId,
        "🛠️ Initiating Daytona workspace orchestration...",
      );

      // Task 2: Create Daytona Workspace
      const createResponse = await fetch(`${DAYTONA_API_URL}/workspace`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DAYTONA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `agent-workspace-${Date.now()}`,
          target: "us",
          maxDuration: 3600, // 1 hour in seconds
          resources: {
            cpu: 4,
            memory: "4Gi",
          },
          project: {
            name: "react-app",
            source: {
              repository:
                "https://github.com/daytonaio/workspace-template-node",
            },
            image: "daytonaio/workspace-project:latest",
          },
        }),
      });

      if (!createResponse.ok) {
        throw new Error(
          `Failed to create workspace: ${await createResponse.text()}`,
        );
      }

      const workspace = await createResponse.json();
      const workspaceId = workspace.id;

      await bot.api.sendMessage(
        args.chatId,
        `⏳ Sandbox created (ID: ${workspaceId}). Waiting for it to reach 'running' state...`,
      );

      // Poll until workspace is running (increased timeout: 200 * 3s = 600s)
      let isRunning = false;
      for (let i = 0; i < 200; i++) {
        const statusRes = await fetch(
          `${DAYTONA_API_URL}/workspace/${workspaceId}`,
          {
            headers: { Authorization: `Bearer ${DAYTONA_API_KEY}` },
          },
        );
        const statusData = await statusRes.json();
        if (statusData.state === "running" || statusData.status === "running") {
          isRunning = true;
          break;
        }
        // Wait 3 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (!isRunning) {
        throw new Error(
          "Daytona workspace failed to reach running state within timeout.",
        );
      }

      await bot.api.sendMessage(
        args.chatId,
        "✅ Sandbox state is now 'running'. Injecting configuration files...",
      );

      // Helper function to execute a command in the Daytona workspace
      const execCommand = async (command: string) => {
        const res = await fetch(
          `${DAYTONA_API_URL.replace("/api", "")}/toolbox/${workspaceId}/process/execute`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${DAYTONA_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ command }),
          },
        );
        if (!res.ok) {
          throw new Error(`Execution failed: ${await res.text()}`);
        }
        // Assume API returns { output: "..." }
        const data = await res.json();
        return data.output || "";
      };

      // Task 3: File Injection & Agent Execution
      const envContent = `NETLIFY_AUTH_TOKEN=${NETLIFY_AUTH_TOKEN}\nNETLIFY_SITE_ID=${NETLIFY_SITE_ID}\n`;

      const deployJsContent = `
const { execSync } = require('child_process');
console.log('Deploying to Netlify...');
try {
  const output = execSync('npx netlify-cli deploy --prod --dir=build', { encoding: 'utf8' });
  console.log(output);
  // Match standard netlify output "Website Draft URL: https://..." or "Live URL: https://..."
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

      // We use base64 encoding to safely inject file content
      const toBase64 = (str: string) => Buffer.from(str).toString("base64");

      await execCommand(`echo "${toBase64(envContent)}" | base64 -d > .env`);
      await execCommand(
        `echo "${toBase64(deployJsContent)}" | base64 -d > deploy.js`,
      );
      await execCommand(
        `echo "${toBase64(agentMdContent)}" | base64 -d > AGENT.md`,
      );

      await bot.api.sendMessage(
        args.chatId,
        "🚀 Configuration injected. The Pi-Mono agent has been given the task and is executing now...",
      );

      // Execute Pi-Mono agent passing the user's original Telegram message (prompt) as the goal
      // Simulating the agent execution which should eventually print "Live URL: <url>"
      const promptEscaped = Buffer.from(args.prompt).toString("base64");
      const agentStartCommand = `echo "${promptEscaped}" | base64 -d > prompt.txt && npx pi-mono start --goal="$(cat prompt.txt)"`;

      const executionOutput = await execCommand(agentStartCommand);

      await bot.api.sendMessage(
        args.chatId,
        "🏁 Pi-Mono agent has finished its task! Parsing output...",
      );

      // Send the entire output back to the user as a text file
      const buffer = Buffer.from(executionOutput, "utf-8");
      await bot.api.sendDocument(
        args.chatId,
        new InputFile(buffer, "agent-output.txt"),
        {
          caption: "Here is everything the agent wrote in the sandbox.",
        },
      );

      // Task 4: Callback / Notification
      // Parse the output for the "Live URL" from the Netlify deployment
      const liveUrlMatch = executionOutput.match(
        /Live URL:\s*(https:\/\/[^\s]+)/,
      );
      const liveUrl = liveUrlMatch ? liveUrlMatch[1] : null;

      if (liveUrl) {
        await bot.api.sendMessage(
          args.chatId,
          `🎉 Success! Your React app has been built and deployed.\\n\\nLive URL: ${liveUrl}`,
        );
      } else {
        await bot.api.sendMessage(
          args.chatId,
          "⚠️ The deployment did not return a Live URL. Please check the logs in the text file above for more details.",
        );
      }
    } catch (error: any) {
      console.error(error);
      await bot.api.sendMessage(
        args.chatId,
        `❌ An error occurred during orchestration:\\n${error.message}`,
      );
    }
  },
});

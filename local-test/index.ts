import { Bot, InputFile } from "grammy";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env file
dotenv.config();

const DAYTONA_API_URL =
  process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY!;
const NETLIFY_AUTH_TOKEN =
  process.env.NETLIFY_AUTH_TOKEN || "mock_netlify_token";
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || "mock_site_id";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
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

async function checkSandboxStatus(
  workspaceId: string,
): Promise<{ exists: boolean; running: boolean }> {
  try {
    const statusRes = await fetch(
      `${DAYTONA_API_URL}/workspace/${workspaceId}`,
      {
        headers: { Authorization: `Bearer ${DAYTONA_API_KEY}` },
      },
    );
    if (!statusRes.ok) {
      return { exists: false, running: false };
    }
    const statusData = (await statusRes.json()) as {
      state?: string;
      status?: string;
    };
    const isRunning =
      statusData.state === "running" ||
      statusData.state === "started" ||
      statusData.status === "running" ||
      statusData.status === "started";
    return { exists: true, running: isRunning };
  } catch (e) {
    return { exists: false, running: false };
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
if (!DAYTONA_API_KEY) {
  console.warn(
    "DAYTONA_API_KEY is not set. The API calls will likely fail unless mocked.",
  );
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

bot.command("start", (ctx) =>
  ctx.reply(
    "Send me a prompt, and I will spin up a Daytona sandbox and run the Pi-Mono agent!",
  ),
);

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const prompt = ctx.message.text;

  try {
    await ctx.reply("🛠️ Initiating Daytona workspace orchestration...");

    // Try to use existing sandbox
    let workspaceId = getSavedSandboxId();
    let isNewSandbox = false;

    if (workspaceId) {
      await ctx.reply(`🔍 Checking existing sandbox (ID: ${workspaceId})...`);
      const { exists, running } = await checkSandboxStatus(workspaceId);
      if (exists && running) {
        await ctx.reply(
          `✅ Using existing running sandbox (ID: ${workspaceId})`,
        );
      } else {
        await ctx.reply(
          `⚠️ Existing sandbox not available, creating new one...`,
        );
        workspaceId = null;
      }
    }

    // Create new sandbox if needed
    if (!workspaceId) {
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

      const workspace = (await createResponse.json()) as { id: string };
      workspaceId = workspace.id;
      isNewSandbox = true;
      saveSandboxId(workspaceId!);
    }

    await ctx.reply(
      `⏳ Sandbox ${isNewSandbox ? "created" : "selected"} (ID: ${workspaceId}). Waiting for it to reach 'running' state...`,
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
      const statusData = (await statusRes.json()) as {
        state?: string;
        status?: string;
      };

      if (
        statusData.state === "running" ||
        statusData.state === "started" ||
        statusData.status === "running" ||
        statusData.status === "started"
      ) {
        isRunning = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    if (!isRunning) {
      throw new Error(
        "Daytona workspace failed to reach running state within timeout.",
      );
    }

    await ctx.reply(
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
      const data = (await res.json()) as { output?: string };
      return data.output || "";
    };

    // Task 3: File Injection & Agent Execution
    const envContent = `NETLIFY_AUTH_TOKEN=${NETLIFY_AUTH_TOKEN}
NETLIFY_SITE_ID=${NETLIFY_SITE_ID}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
`;

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

    console.log("[*] exec-chk 1");
    await execCommand(`echo "${toBase64(envContent)}" | base64 -d > .env`);
    console.log("[*] exec-chk 2");
    await execCommand(
      `echo "${toBase64(deployJsContent)}" | base64 -d > deploy.js`,
    );
    console.log("[*] exec-chk 3");
    await execCommand(
      `echo "${toBase64(agentMdContent)}" | base64 -d > AGENT.md`,
    );
    console.log("[*] exec-chk 4");

    await ctx.reply(
      "🚀 Configuration injected. The Pi-Mono agent has been given the task and is executing now...",
    );

    const promptEscaped = Buffer.from(prompt).toString("base64");
    const agentStartCommand = `echo "${promptEscaped}" | base64 -d > prompt.txt && npx pi-mono start --goal="$(cat prompt.txt)"`;

    // This blocks until the execution is finished.
    const executionOutput = await execCommand(agentStartCommand);
    console.log("[*] exec-chk 4");

    await ctx.reply(
      "🏁 Pi-Mono agent has finished its task! Parsing output...",
    );

    // Send the entire output back to the user as a text file
    const buffer = Buffer.from(executionOutput, "utf-8");
    await ctx.replyWithDocument(new InputFile(buffer, "agent-output.txt"), {
      caption: "Here is everything the agent wrote in the sandbox.",
    });

    // Parse the output for the "Live URL" from the Netlify deployment
    const liveUrlMatch = executionOutput.match(
      /Live URL:\s*(https:\/\/[^\s]+)/,
    );
    const liveUrl = liveUrlMatch ? liveUrlMatch[1] : null;

    if (liveUrl) {
      await ctx.reply(
        `🎉 Success! Your React app has been built and deployed.\n\nLive URL: ${liveUrl}`,
      );
    } else {
      await ctx.reply(
        "⚠️ The deployment did not return a Live URL. Please check the logs in the text file above for more details.",
      );
    }
  } catch (error: any) {
    console.error(error);
    await ctx.reply(
      `❌ An error occurred during orchestration:\n${error.message}`,
    );
  }
});

bot.catch((err) => {
  console.error("Error in bot:", err);
});

console.log(
  "Local bot is starting... Send a message to your bot to test the flow.",
);
bot.start();

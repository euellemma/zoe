import { getModel } from "@mariozechner/pi-ai";
import { createAgentSession, createBashTool, createEditTool, createReadTool, createWriteTool } from "@mariozechner/pi-coding-agent";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

async function main() {
  const model = getModel("openrouter", "minimax/minimax-m2.5");
  const workspaceDir = path.join(process.cwd(), "agent-workspace");
  const { session } = await createAgentSession({
    model,
    cwd: workspaceDir,
    tools: [
      createBashTool(workspaceDir),
      createEditTool(workspaceDir),
      createReadTool(workspaceDir),
      createWriteTool(workspaceDir)
    ],
  });

  session.subscribe((e) => {
      if (e.type === "message_end" && e.message.role === "assistant") {
         console.log(e.message.content.find(c => c.type === "text")?.text);
      }
  });

  await session.prompt("What is your current working directory? Use the bash tool to run pwd and tell me.");
}
main().catch(console.error);

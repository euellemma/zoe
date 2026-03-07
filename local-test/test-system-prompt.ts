import { getModel } from "@mariozechner/pi-ai";
import { createAgentSession } from "@mariozechner/pi-coding-agent";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

async function main() {
  const model = getModel("openrouter", "minimax/minimax-m2.5");
  const workspaceDir = path.join(process.cwd(), "agent-workspace");
  const { session } = await createAgentSession({
    model,
    cwd: workspaceDir,
  });

  console.log(session.systemPrompt);
}
main().catch(console.error);

import { getModel } from "@mariozechner/pi-ai";
import { createAgentSession, createCodingTools } from "@mariozechner/pi-coding-agent";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const model = getModel("openrouter", "minimax/minimax-m2.5");
  const { session } = await createAgentSession({
    model,
    cwd: process.cwd(),
    tools: createCodingTools(process.cwd()),
  });

  session.subscribe((e) => {
      console.log("Event:", e.type);
      if (e.type === "message_end") {
          console.log("Message:", JSON.stringify((e as any).message, null, 2));
      }
      if (e.type === "error") {
          console.log("Error:", (e as any).error);
      }
  });

  await session.prompt("Say hello");
}
main().catch(console.error);

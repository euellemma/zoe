import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

export const LOCAL_MODE = process.env.LOCAL_MODE === "true" || process.argv.includes("--local");

export const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";
export const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY || "";
export const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN || "mock_netlify_token";
export const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || "mock_site_id";
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
export const SANDBOX_ID_FILE = path.join(__dirname, "sandbox-id.txt");

export function getSavedSandboxId(): string | null {
  try {
    if (fs.existsSync(SANDBOX_ID_FILE)) {
      return fs.readFileSync(SANDBOX_ID_FILE, "utf-8").trim() || null;
    }
  } catch (e) {
    console.error("Error reading sandbox ID file:", e);
  }
  return null;
}

export function saveSandboxId(id: string): void {
  try {
    fs.writeFileSync(SANDBOX_ID_FILE, id);
  } catch (e) {
    console.error("Error saving sandbox ID:", e);
  }
}

# Next Steps: Daytona Migration

This document outlines the step-by-step migration plan to transition the local programmatic SDK execution into the Convex/Daytona serverless environment.

## Goal
The `convex/daytona.ts` script needs to be refactored so that instead of running `npx pi start` in the sandbox, it injects a custom Node.js runner script that programmatically initializes the Pi SDK, hooks into the event stream for live Telegram updates, and manages the execution (exactly like `local-test/index.ts` currently does).

## Implementation Steps

- [ ] **1. Define the Runner Script String**
  - Create a large string literal inside `convex/daytona.ts` that contains the exact SDK logic we built in `local-test/index.ts`.
  - The script must import `grammy`, `dotenv`, and the `@mariozechner/pi-*` packages.
  - It must initialize `createAgentSession` with the `minimax/minimax-m2.5` model via OpenRouter.
  - It must include the `session.subscribe` logic to send live Telegram updates on `toolcall_start`, `error`, and `agent_end`.
  - It must include the token tracking logic writing to `usage.json` (even though it's ephemeral for now).

- [ ] **2. Inject Dependencies (`package.json`)**
  - Construct a minimal `package.json` string literal inside `convex/daytona.ts` that includes `"type": "module"` and dependencies:
    - `@mariozechner/pi-coding-agent`
    - `@mariozechner/pi-ai`
    - `grammy`
    - `dotenv`
  - Base64 encode and inject this `package.json` into the root of the Daytona workspace.

- [ ] **3. Inject Environment Variables**
  - Update the `.env` injection logic in `daytona.ts` to include:
    - `TELEGRAM_BOT_TOKEN`
    - `TELEGRAM_CHAT_ID`
    - `OPENROUTER_API_KEY`
    - `NETLIFY_AUTH_TOKEN`
    - `NETLIFY_SITE_ID`

- [ ] **4. Inject and Execute the Runner**
  - Base64 encode and inject the runner script (e.g., as `runner.js`) into the Daytona workspace.
  - Execute `npm install` in the Daytona sandbox to fetch the injected dependencies.
  - Execute the runner using `node runner.js`.

- [ ] **5. Clean Up Convex Orchestration**
  - Remove the old execution logic (`npx pi start`) from `convex/daytona.ts`.
  - Rely entirely on the injected `runner.js` to send the final text response and Netlify URL back to Telegram (Convex no longer needs to scrape the `bash` output buffers).

## Future Research & Tasks (Not Immediate)
- **Filesystem Synchronization:** Research and implement a way to sync or persist the Daytona sandbox filesystem (e.g., `usage.json` and session histories) back to a permanent remote store before the sandbox is destroyed.

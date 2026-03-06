# Zoe - Autonomous Coding Agent Orchestrator

## Overview
Zoe is a Telegram bot orchestrator that listens for user prompts and spins up a programmatic AI coding agent using the `@mariozechner/pi-coding-agent` SDK. 

The project consists of two environments:
1. **Local Prototype (`local-test/`)**: A testing playground where the Pi SDK is instantiated directly. It features live tool-call streaming to Telegram, token/cost tracking, and a simulated workspace (`agent-workspace/`).
2. **Production (`convex/`)**: A serverless environment that provisions ephemeral Daytona sandboxes to run the agent in the cloud.

**Primary Goal:** The next major architectural step is migrating the programmatic SDK logic (currently in `local-test`) directly into the Daytona sandboxes managed by Convex.

## Architecture & Constraints

- **Core Agent Framework:** `@mariozechner/pi-coding-agent` installed via npm. We do not use a custom fork.
- **Default Model:** `openrouter/minimax/minimax-m2.5` (accessed via `@mariozechner/pi-ai`).
- **Memory & Statefulness:** Currently **OUT-OF-SCOPE**. The agent operates statelessly.
- **Deployment:** Netlify deployment is a **required plugin** right now. Every agent execution is provided a `deploy.js` script and instructed to build an app and deploy it.
- **User Communication:** The agent does *not* use a custom tool to talk to the user. Instead, the orchestrator hooks into the SDK's `session.subscribe()` event emitter. It listens for `toolcall_start` and `error` events and pushes live text updates to the Telegram bot.

## Future Research & Reference
For future agents working on this repository, the local `pi-mono` directory contains the source code for the Pi agent. It should be used exclusively for research and documentation lookups. 

Particularly valuable resources:
- **SDK Documentation:** `zoe/pi-mono/packages/coding-agent/docs/sdk.md`
- **SDK Examples:** `zoe/pi-mono/packages/coding-agent/examples/sdk`

# recommendations for minimal and token-efficient agent harness

based on the patterns in `docs/agent-harness.md` and observations from the `local-test` logs, here are the architectural and implementation recommendations for a robust, production-ready agent harness.

## 1. context management & efficiency

### adopt "progressive disclosure"
the agent currently receives the full `AGENTS.md` and `deploy.js` instructions in the system prompt. this is expensive and noisy during the coding phase.
- **recommendation:** shift technical details to files. tell the agent in the system prompt: *"refer to `AGENTS.md` for project rules and `deploy.js` for deployment requirements."* the agent only "pays" for these tokens when it reads them.

### implement context compaction (the 90% trigger)
as the session grows, "context rot" and "lost in the middle" phenomena degrade performance.
- **recommendation:** when tokens reach ~90% of the model's window (or a fixed turn limit like 15 turns), trigger a **compaction turn**.
- **action:** have the model generate a "state-of-the-union" summary (completed tasks, current blockers, file paths, live url) and replace the history with this single summary.

### maintain a "stable prefix"
to maximize kv-cache hits (reducing latency and cost), ensure the system prompt and early messages stay identical across turns.
- **recommendation:** avoid injecting dynamic timestamps or changing instructions mid-session unless absolutely necessary.

## 2. planning & execution (the taor loop)

### force "agentic memory" via `todo.md`
the agent often "one-shots" and fails because it loses track of the sub-steps (scaffold -> code -> build -> deploy).
- **recommendation:** make the creation of a `todo.md` in the workspace root a mandatory first step.
- **action:** update `AGENTS.md` to require the agent to check off tasks in `todo.md` after every tool call. this pushes the global plan into the model's most recent attention span.

### optimize the agent-computer interface (aci)
the agent wasted turns diagnosing `require` vs `import` and `build/` directory locations.
- **recommendation:** pre-scaffold the environment to remove ambiguity.
- **action:** provide a base `package.json` with `"type": "module"` and a `vite.config.js` with `outDir: 'build'` already set. "dumb" tools are more reliable than "smart" agents.

## 3. reliability & loop detection

### clean state isolation
the logs showed the agent getting confused by files left over from previous runs.
- **recommendation:** ensure a "clean room" environment for every prompt.
- **action:** the orchestrator should `rm -rf agent-workspace` and re-scaffold the base configuration (like `deploy.js`) before triggering the agent.

### implement "doom loop" detection
the agent tried the same failed scaffolding command multiple times.
- **recommendation:** implement a simple middleware in `local-handler.ts` that tracks repeated tool calls.
- **action:** if the same command fails 3 times, inject a hidden "system nudge": *"you have tried [command] 3 times without success. consider checking the directory state or using different flags."*

## 4. summary of improvements for `local-handler.ts`

| feature | current state | recommended state |
| :--- | :--- | :--- |
| **deployment logic** | injected in system prompt | moved to `deploy.js` read on-demand |
| **workspace state** | persistent between runs | wiped and re-initialized per run |
| **history** | grows indefinitely | compacted after 15k tokens |
| **scaffolding** | agent-driven `npm init` | orchestrator-provided `package.json` |
| **module system** | mixed cjs/esm | strict esm by default |

---
*this document serves as a roadmap for optimizing the `local-test` harness before migrating to production convex/daytona environments.*

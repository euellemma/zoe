# The Complete Guide to Building Effective Agent Harnesses

*A Comprehensive Technical Reference*

---

## Table of Contents

1. [Introduction: The Emerging Discipline of Harness Engineering](#introduction)
2. [Understanding Context as a First-Class Resource](#context-fundamentals)
3. [The Anatomy of Effective Context](#anatomy)
4. [Context Retrieval and Dynamic Discovery](#retrieval)
5. [Managing Long-Running Agent Sessions](#long-running)
6. [The Architecture of Production Agents](#architecture)
7. [Tool Design and Agent-Computer Interfaces](#tools)
8. [Memory Systems and State Management](#memory)
9. [Planning, Reasoning, and Execution Control](#planning)
10. [Performance Optimization and Benchmarking](#performance)
11. [Failure Modes and Mitigation Strategies](#failure)
12. [The Future of Agent Harnesses](#future)

---

<a name="introduction"></a>
## 1. Introduction: The Emerging Discipline of Harness Engineering

The landscape of AI-powered software development has undergone a dramatic transformation in recent years. What began as simple prompt engineering—crafting the perfect instruction to get a language model to generate desired outputs—has evolved into an entirely new discipline: **harness engineering**. This field encompasses the design and construction of the infrastructure, tooling, and systems that enable AI agents to operate effectively in real-world environments.

This guide synthesizes learnings from industry leaders including Anthropic, Cursor, Manus, LangChain, Cognition (Devin), and numerous open-source projects to present a comprehensive framework for building production-grade AI agents. The material draws from eighteen foundational documents covering context engineering, agent architecture, performance optimization, and real-world deployment strategies.

### 1.1 What is a Harness?

In the context of AI agents, a **harness** refers to the complete system infrastructure that surrounds and supports a language model. While the model itself provides the "intelligence" or decision-making capability, the harness provides:

- **Tool definitions and execution**: The interface through which the agent interacts with external systems
- **Context management**: Systems for loading, curating, and maintaining the information the model has access to
- **Execution flow control**: The logic that determines how agent loops operate, when to terminate, and how to handle various states
- **Memory and state persistence**: Mechanisms for maintaining continuity across sessions
- **Safety and permission systems**: Controls that prevent harmful actions while enabling productive work

The goal of harness engineering is to mold the inherently variable intelligence of language models into a consistent, reliable system optimized for specific tasks. As noted by LangChain, "the goal of a harness is to mold the inherently spiky intelligence of a model for tasks we care about."

### 1.2 Why Harnesses Matter

The distinction between a model and a production agent system cannot be overstated. A language model, no matter how capable, is fundamentally a prediction engine. It generates text based on patterns learned during training. When we want these models to perform useful work—particularly complex, multi-step tasks that require interacting with real systems—we need significant scaffolding.

Consider the difference between asking a model to write a function and asking it to debug a production system. The former requires only the model's training. The latter requires:

1. Access to the codebase (context)
2. Ability to read files, run commands, and execute tests (tools)
3. Understanding of the project's structure and conventions (knowledge)
4. Ability to track progress across multiple steps (state management)
5. Awareness of when work is complete (evaluation criteria)

All of these capabilities are provided by the harness, not the model. The harness transforms a general-purpose text predictor into a targeted problem-solving agent.

### 1.3 The Evolution of Agent Systems

The documents in this collection trace a clear evolution in how practitioners approach agent construction:

**First Generation (2023-2024)**: Simple tool-calling loops where models would invoke functions and receive results. Systems like early ReAct implementations demonstrated the basic pattern but struggled with complex tasks.

**Second Generation (2024-2025)**: Introduction of sophisticated context management. Researchers discovered that context engineering—how information is selected, formatted, and presented to the model—was as important as the model itself. Key innovations included:

- Just-in-time context retrieval instead of pre-loading everything
- Progressive disclosure of information
- Structured memory systems with multiple layers

**Third Generation (2025-present)**: The emergence of "deep agents" capable of extended, multi-session work. Claude Code, Manus, and similar systems demonstrated that with proper harness design, agents could work for hours or days on complex tasks, maintaining state and making consistent progress.

This evolution reflects a deeper understanding: the bottleneck in agent performance is rarely the model's intelligence but rather how that intelligence is channeled and supported.

### 1.4 Scope of This Guide

This guide covers the complete landscape of harness engineering, from fundamental concepts to advanced optimizations. The target audience is developers and engineers building production AI agent systems. The content is organized into four major documents:

1. **Fundamentals and Context Engineering** (this document): Core concepts, context management, and foundational patterns
2. **Architecture Deep Dive**: Detailed examination of harness architectures from leading systems
3. **Implementation Guide**: Practical implementation details, tool design, and code patterns
4. **Performance and Optimization**: Benchmarking, optimization strategies, and production considerations

Each section draws heavily from real-world implementations, including specific metrics and results where available. The goal is to provide both conceptual understanding and practical, implementable guidance.

---

<a name="context-fundamentals"></a>
## 2. Understanding Context as a First-Class Resource

Perhaps no concept is more central to effective harness design than **context**. In traditional software development, memory and storage are treated as plentiful resources to be managed. In agent systems, context represents a fundamentally different kind of resource: a bounded attention budget that must be carefully curated.

### 2.1 Context is Finite and Precious

Despite the increasing context windows offered by modern language models—some supporting 128K tokens or more—practical context remains a scarce resource. This scarcity stems from architectural realities of transformer-based models.

**The Attention Bottleneck**: Language models are based on the transformer architecture, which enables every token to attend to every other token across the entire context. This creates n² pairwise relationships for n tokens. As the context grows, the model's ability to focus on any specific piece of information diminishes.

**Context Rot**: Research, including work from Anthropic, has identified a phenomenon called **context rot**. As the number of tokens in the context window increases, the model's ability to accurately recall information decreases. A model may technically have access to 100,000 tokens, but its effective usable context may be much smaller.

**The "Lost in the Middle" Phenomenon**: Research published by Liu et al. demonstrated that performance is often highest when relevant information occurs at the beginning or end of the input context, and significantly degrades when models must access relevant information in the middle of long contexts. This "lost in the middle" effect means that even within the available context, information placement matters enormously.

### 2.2 The Dumb Zone

The concept of the "dumb zone" was introduced in the 12 Factor Agents framework. This refers to the middle 40-60% of a large context window where model recall degrades and reasoning falters. The key insight is that filling past 40% of the context window leads to diminishing returns—the more you use the context window, the worse the outcomes.

Practical implications:

- Place the most critical information at the edges of context
- Use retrieval systems to bring relevant information to "edge positions"
- Be aware that information buried in long contexts may be effectively invisible to the model
- Test agent performance with relevant information at different positions in context

### 2.3 Context Engineering vs. Prompt Engineering

Anthropic frames context engineering as the natural progression of prompt engineering. While prompt engineering focuses on writing effective prompts, context engineering refers to strategies for curating and maintaining the optimal set of tokens during LLM inference.

The key difference is scope:

- **Prompt Engineering**: Crafting the instructions that tell the model what to do
- **Context Engineering**: Designing the entire information environment the model operates within

This includes:
- System prompts
- Tool definitions
- Retrieved information
- Conversation history
- External references (files, documents)
- Memory systems

Context engineering recognizes that the model doesn't just need good instructions—it needs the right information, in the right format, at the right time.

### 2.4 The Four Horsemen of Context Degradation

The industry has identified four primary failure modes related to context:

1. **Context Rot**: Performance degradation as the context window fills, even when total token count is within technical limits

2. **Context Pollution**: The presence of too much irrelevant, redundant, or conflicting information within the context. This is sometimes called "context overflow" or the "kitchen sink problem"

3. **Context Confusion**: The failure mode where an LLM cannot distinguish between instructions, data, and structural markers. This often happens when tool definitions, retrieved content, and conversation history are mixed without clear boundaries

4. **Context Exhaustion**: When the model has used so much of its attention budget on early tokens that it cannot effectively process new information

Understanding these failure modes is the first step to designing systems that avoid them.

### 2.5 Principles of Context Curation

Effective context engineering follows a core principle: **find the smallest possible set of high-signal tokens that maximize the likelihood of desired outcomes**.

This means:

- **Minimization**: Include only what's necessary, not everything that might be relevant
- **High Signal**: Information should be directly relevant to the current task
- **Dynamic Loading**: Pull information in just-in-time rather than pre-loading everything
- **Progressive Disclosure**: Layer information from minimal to comprehensive based on need

The shift from static context (always included) to dynamic context discovery (loaded on demand) represents one of the most significant advances in harness engineering.

---

<a name="anatomy"></a>
## 3. The Anatomy of Effective Context

Understanding what makes up context and how each component contributes to agent performance is essential for effective harness design. This section breaks down the major components of context and discusses best practices for each.

### 3.1 System Prompts

System prompts form the foundation of agent behavior. They should be extremely clear and use simple, direct language. The art lies in finding the right altitude:

- **Too Specific (Brittle)**: If-else hardcoded prompts that handle every possible situation create complexity and can fail in unexpected ways
- **Too General**: Overly general prompts that assume shared context can lead to misaligned behavior

**Key Principles for System Prompts**:

1. **Be Explicit**: Don't rely on implicit knowledge or assumptions. What seems obvious to humans often isn't to models

2. **Provide Clear Instructions**: Break down complex behaviors into step-by-step guidance

3. **Include Boundaries**: Clearly specify what the agent should and should not do

4. **Use Simple Language**: Avoid jargon and complex sentence structures

5. **Iterate Based on Behavior**: Treat system prompts as living documents that evolve based on observed agent behavior

### 3.2 Tools: The Contract Between Agent and Environment

Tools define the contract between agents and their information/action space. They are perhaps the most critical component of any harness.

**Tool Design Principles**:

1. **Self-Contained and Robust**: Tools should handle their own errors gracefully. If a tool fails, it should provide useful error information rather than crashing

2. **Extremely Clear Intended Use**: Every tool should have a clear purpose and clear inputs/outputs

3. **Descriptive, Unambiguous Input Parameters**: Parameter names and descriptions should leave no room for confusion

4. **Minimal Parameters**: Only include what's necessary. Too many parameters create complexity

5. **Consistent Patterns**: Use consistent naming conventions and parameter structures across tools

**The Agent-Computer Interface (ACI) Concept**:

Research from SWE-agent introduced the concept of the Agent-Computer Interface. The core insight is that agents need specially-built interfaces to the software they use, just as humans benefit from IDEs.

Key ACI principles:

- Optimize for the agent's needs, not human convenience
- Make tool definitions clear and unambiguous
- Minimize the amount of context the agent must manage

As noted in the SWE-agent paper: "Small changes in how tools are defined and presented can lead to large differences in agent success rates."

### 3.3 Few-Shot Prompting

Few-shot prompting involves providing examples of desired behavior directly in the context. For an LLM, examples are the "pictures" worth a thousand words.

**Best Practices**:

1. **Diversity**: Curate a set of diverse, canonical examples that effectively portray the expected behavior

2. **Representativeness**: Examples should represent the range of situations the agent will encounter

3. **Brevity**: Include only what's necessary—too many examples can confuse more than help

4. **Recency**: More recent examples generally have more impact than older ones

5. **Edge Cases**: Include examples of handling difficult situations when appropriate

However, there are caveats. As Manus notes: "Few-shot prompting can backfire in agent systems. If the context is full of similar past action-observation pairs, the model will tend to follow that pattern, even when it's no longer optimal."

The fix is to increase diversity—introduce small amounts of structured variation in actions and observations.

### 3.4 Retrieved Information

When agents need to work with external information—codebases, documentation, databases—the harness must provide effective retrieval mechanisms.

**Retrieval Best Practices**:

1. **Just-in-Time Retrieval**: Rather than pre-processing all relevant data up front, maintain lightweight identifiers and use these references to dynamically load data into context at runtime

2. **Semantic Search**: Use embedding-based similarity search in addition to keyword matching. Cursor's research showed 12.5% higher accuracy in answering questions with semantic search

3. **Hybrid Approaches**: Combine semantic search with regex-based grep for best results

4. **Position Management**: Ensure retrieved information appears at context edges, not buried in the middle

5. **Confidence Signals**: When possible, indicate the relevance or confidence level of retrieved information

### 3.5 Conversation History

For multi-turn interactions, the conversation history becomes part of the context. Managing this history effectively is crucial for maintaining agent coherence.

**Approaches to History Management**:

1. **Full History**: Include everything (simple but limited by context size)

2. **Truncation**: Remove oldest messages when approaching limits (loses early context)

3. **Summarization**: Use an LLM to summarize history (lossy but compact)

4. **Compaction**: Remove redundant details while preserving raw recent interactions (preferred by Manus)

**Compaction vs. Summarization**:

Manus distinguishes between these two approaches:

- **Compaction (Reversible)**: Strip out information that exists in the environment. If an agent writes a code file, the chat history should not contain the file content—it should only contain the file path

- **Summarization (Lossy)**: Use an LLM to summarize history. When summarizing, keep the most recent tool calls in raw, full-detail format

The preference order: raw > compaction > summarization

### 3.6 External References and Files

Modern agents often need to work with files, documents, and other external resources.

**Best Practices**:

1. **File System as Context**: As Manus demonstrates, treat the file system as the ultimate context—unlimited in size, persistent by nature, and directly operable by the agent itself

2. **Compression Strategies**: Always design compression to be restorable. The content of a web page can be dropped from context as long as the URL is preserved

3. **Clear References**: Use consistent naming and paths to avoid confusion

4. **Metadata Where Possible**: Include metadata (timestamps, sources) to help the agent assess relevance

---

<a name="retrieval"></a>
## 4. Context Retrieval and Dynamic Discovery

One of the most significant advances in harness engineering has been the shift from static context loading to dynamic context discovery. This section explores the concepts, implementations, and benefits of this approach.

### 4.1 The Case for Dynamic Discovery

Traditional approaches to context would load as much relevant information as possible into the context window at the start of each agent turn. This approach has several problems:

1. **Wasted Tokens**: Much of the loaded information may not be relevant to the current task
2. **Noise**: Irrelevant information can confuse the model and reduce performance
3. **Context Pressure**: Pre-loading accelerates context window consumption
4. **Static Doesn't Match Dynamic**: Agent tasks evolve; pre-loaded context may become stale

Dynamic context discovery addresses these issues by:

1. **Minimal Initial Context**: Start with the minimum necessary information
2. **On-Demand Loading**: Pull additional information as the task requires it
3. **Agent Agency**: Let the agent determine what information it needs

### 4.2 Five Implementations of Dynamic Context Discovery

Cursor's documentation outlines five specific implementations of dynamic context discovery:

#### 4.2.1 Turning Long Tool Responses into Files

Tool calls can dramatically increase the context window by returning large JSON responses. Instead of truncating long shell commands or MCP results (which leads to data loss), Cursor writes the output to a file and gives the agent the ability to read it.

The agent calls `tail` to check the end, and then reads more if it needs to. This approach:

- Preserves all information without truncation
- Gives the agent control over what to examine
- Reduces pressure on context window

#### 4.2.2 Referencing Chat History During Summarization

When the model's context window fills up, Cursor triggers a summarization step. But the agent's knowledge can degrade after summarization.

In Cursor's approach, chat history is used as files to improve the quality of summarization. After the context limit is reached, the agent is given a reference to the history file. If the agent knows it needs more details that are missing from the summary, it can search through the history to recover them.

This creates a two-tier system:
- **Tier 1**: Summary in main context
- **Tier 2**: Full history accessible on demand

#### 4.2.3 Supporting the Agent Skills Open Standard

Cursor supports Agent Skills, an open standard for extending coding agents with specialized capabilities. Skills are defined by files that tell the agent how to perform on a domain-specific task.

Skills include a name and description which can be included as "static context" in the system prompt. The agent can then do dynamic context discovery to pull in relevant skills when needed.

This implements progressive disclosure at the skill level:
- At startup: Only skill names and descriptions
- On demand: Full skill content when relevant

#### 4.2.4 Efficiently Loading Only MCP Tools Needed

Some MCP (Model Context Protocol) servers include many tools with long descriptions, which can significantly bloat the context window.

Cursor supports dynamic context discovery for MCP by syncing tool descriptions to a folder. The agent now only receives a small bit of static context, including names of the tools, prompting it to look up tools when the task calls for it.

**Results**: In an A/B test, this strategy reduced total agent tokens by 46.9% in runs that called an MCP tool—nearly half the context usage for significant savings.

#### 4.2.5 Treating All Integrated Terminal Sessions as Files

Cursor syncs the integrated terminal outputs to the local filesystem. This makes it easy to ask "why did my command fail?" and allow the agent to understand what's being referenced.

Since terminal history can be long, the agent can grep for only the relevant outputs rather than having to process everything.

### 4.3 Progressive Disclosure: A Design Pattern

The concept of progressive disclosure has emerged as a fundamental pattern in agent design. Borrowed from UI design, it refers to the practice of layering information from minimal to comprehensive based on need.

**Applied to AI Agents**:

A three-layer architecture:
- **Layer 1 (Index)**: Lightweight metadata—titles, descriptions, capabilities, token counts
- **Layer 2 (Details)**: Full content, loaded only when the agent determines it's relevant
- **Layer 3 (Deep Dive)**: Supporting materials, examples, accessed only when needed

**The Trade-offs**:

Progressive disclosure isn't free:
- Loading information on demand introduces latency
- Routing decisions can be wrong

The core trade-off is latency versus accuracy. In general:
- Design for layers
- Respect context as currency
- Invest in descriptions
- Build explicit control points
- Keep it shallow (2-3 layers typically sufficient)

### 4.4 Retrieval-Augmented Generation (RAG) for Agents

RAG has become a fundamental building block for agent systems. The core pattern:

1. **Index**: Process and embed documents, code, or other content into a searchable vector database
2. **Query**: When the agent needs information, search the index for relevant content
3. **Retrieve**: Pull the most relevant content into context
4. **Generate**: Use the retrieved content along with the original query

**RAG Best Practices for Agents**:

1. **Don't Use RAG to Manage Tool Definitions**: RAG is for domain knowledge, not for tool selection

2. **Embed at the Right Level**: Consider chunk size carefully—too small loses context, too large introduces noise

3. **Combine with Keyword Search**: Semantic search finds similar content, but keyword search finds exact matches

4. **Rank and Filter**: Not all retrieved content is equally relevant; use relevance scores and filters

5. **Cache Embeddings**: Computing embeddings is expensive; cache aggressively

### 4.5 The Role of Semantic Search

Cursor's research demonstrated that semantic search significantly improves agent performance, especially over large codebases:

- **12.5% higher accuracy** in answering questions on average (6.5%–23.5% depending on the model)
- **Code changes more likely to be retained** in codebases
- **Fewer iterations** for users to arrive at a correct solution
- **Increased accuracy across all models** tested

**Custom Retrieval Models**:

Cursor's approach uses agent sessions as training data: when an agent works through a task, it performs multiple searches and opens files before finding the right By analyzing these traces code., they can see what should have been retrieved earlier.

They provide these traces to an LLM, which ranks what content would have been most helpful at each step. They then train their embedding model to align its similarity scores with these LLM-generated rankings.

**Offline Evals**:

Cursor maintains Cursor Context Bench, an evaluation dataset focused on retrieving information in codebases with known correct answers. In every configuration, semantic search significantly improves outcomes.

**Online A/B Tests**:

- Code retention increases by 0.3% when semantic search is available
- This effect increases to **2.6% on large codebases** with 1,000 files or more
- A 2.2% increase in dissatisfied follow-up user requests when semantic search was not available

---

<a name="long-running"></a>
## 5. Managing Long-Running Agent Sessions

One of the most challenging aspects of harness engineering is enabling agents to work effectively across extended time horizons—tasks that span minutes to hours or even days. This section covers the techniques that enable long-running agent sessions.

### 5.1 The Long-Running Agent Problem

As AI agents become more capable, developers are increasingly asking them to take on complex tasks requiring work that spans hours or even days. However, getting agents to make consistent progress across multiple context windows remains an open problem.

The core challenge: agents must work in discrete sessions, and each new session begins with no memory of what came before.

### 5.2 The Initializer + Coding Agent Pattern

Anthropic's solution involves a two-part architecture:

1. **Initializer Agent**: The very first agent session uses a specialized prompt that asks the model to set up the initial environment
2. **Coding Agent**: Every subsequent session asks the model to make incremental progress, then leave structured updates

This pattern ensures that:
- The initial state is well-defined
- Each coding session has clear context
- Progress is preserved across sessions

### 5.3 Feature Lists for Progress Tracking

To address the problem of the agent "one-shotting" an app or prematurely considering the project complete, the initializer agent writes a comprehensive file of feature requirements expanding on the user's initial prompt.

These features are all initially marked as "failing" so that later coding agents have a clear outline of what full functionality looks like. This approach:

- Provides a clear definition of "done"
- Prevents premature completion
- Enables incremental progress tracking
- Gives agents a roadmap to follow

### 5.4 Incremental Progress

The coding agent works on only one feature at a time. This incremental approach addresses the agent's tendency to do too much at once.

**Eliciting Clean State Behavior**:

The best ways to elicit clean state behavior:
- Ask the model to commit progress to git with descriptive commit messages
- Write summaries of progress in a progress file

Both approaches create artifacts that future sessions can use to understand what has been done.

### 5.5 Getting Up to Speed

Every coding agent should be prompted to run through steps to get its bearings:
1. Run `pwd` to see the directory
2. Read git logs and progress files to get up to speed
3. Read the features list file and choose the highest-priority feature that's not yet done

This onboarding process ensures that each session starts with relevant context.

### 5.6 Context Compaction

Compaction is the practice of taking a conversation nearing the context window limit, summarizing its contents, and reinitiating a new context window with the summary.

Claude Code implements this by passing message history to the model to summarize and compress the most critical details.

**Compaction Best Practices**:

1. **Trigger Early**: Start compaction before hitting the limit (e.g., at 80-90% capacity)
2. **Preserve Critical Information**: Ensure that key decisions, file paths, and current state are preserved
3. **Maintain Continuity**: The summary should enable the next session to pick up seamlessly

### 5.7 Structured Note-Taking

Structured note-taking, or agentic memory, is a technique where the agent regularly writes notes persisted to memory outside of the context window. These notes get pulled back into the context window at later times.

**Applications**:

1. **Progress Tracking**: Regular updates on what has been completed, what is in progress, and what remains
2. **Decision Logs**: Records of important decisions and the reasoning behind them
3. **Environment State**: Current state of files, configurations, and dependencies

**Implementation Considerations**:

- Where should notes be stored? (File system, database, external storage)
- How should notes be formatted? (Plain text, JSON, structured markup)
- When should notes be written? (On completion of milestones, on each tool call, on session end)
- How should notes be retrieved? (Full load, selective retrieval, search-based)

### 5.8 Sub-Agent Architectures

Sub-agent architectures provide another way around context limitations. Specialized sub-agents can handle focused tasks with clean context windows.

Each sub-agent might explore extensively but returns only a condensed, distilled summary of its work. This approach:

- **Limits Context Scope**: Each sub-agent has a focused task, reducing context needs
- **Enables Parallelism**: Multiple sub-agents can work simultaneously
- **Creates Natural Checkpoints**: Sub-agent completion creates natural break points

Claude Code implements sub-agents through the `dispatch_agent` tool. These sub-agents operate with depth limitations—they cannot spawn their own sub-agents.

### 5.9 Session Continuity

Claude Code's architecture treats sessions as persistent rather than disposable. Sessions function like git branches, allowing:

- **Checkpointing**: Save the current state for later resumption
- **Rollback**: Return to a previous state if something goes wrong
- **Forking**: Explore multiple approaches in parallel

This is enabled by:
- File system state
- Git history
- Structured progress files
- Persisted context summaries

---

<a name="architecture"></a>
## 6. The Architecture of Production Agents

This section examines the architectural patterns used by leading production agent systems, extracting common patterns and specific insights.

### 6.1 The Deep Agent Pattern

"Deep agents" represent a significant architectural advancement over simple tool-calling loops. Research from LangChain identified the key components:

- **A Planning Tool**: Something to help the agent track goals and progress
- **Sub Agents**: Ability to delegate work to specialized agents
- **Access to a File System**: For reading, writing, and organizing information
- **A Detailed Prompt**: Comprehensive instructions on behavior

Claude Code's architecture exemplifies the deep agent pattern. Its system prompts contain:
- Detailed instructions on how to use tools
- Examples (few-shot prompts) on how to behave in certain situations
- Clear guidelines for when to ask questions vs. proceed
- Instructions for planning and verification

### 6.2 The TAOR Loop Pattern

Vrungta's analysis of Claude Code identified a fundamental architectural shift: from Workflows to Loops.

**Traditional (Workflow)**:
- Code controls the Model
- DAG-based execution paths
- Deterministic control flow

**TAOR (Think-Act-Observe-Repeat)**:
- Model controls the Loop
- Runtime is dumb; the model is the CEO
- Natural termination when model produces non-tool output

This pattern is deceptively simple:
```
while (model_response.includes_tool_call()) {
    execute_tool(model_response.tool_call)
    feed_results_to_model()
}
```

But its simplicity is powerful: the model decides what to do next, when to stop, and when to ask for clarification.

### 6.3 Claude Code Architecture

Claude Code provides one of the best-documented examples of production agent architecture. Here's what we've learned from the documentation:

#### Core Components

- **User Interaction Layer**: CLI, VS Code plugin, or web UI
- **Agent Core Scheduling Layer**: The main agent loop engine working with an asynchronous message queue
- **StreamGen**: Manages streaming output generation
- **ToolEngine & Scheduler**: Orchestrates tool invocations and queues model queries
- **Compressor**: Automatically triggers at ~92% context window usage to summarize conversations

#### The Master Agent Loop

The core pattern: `while(tool_call) → execute tool → feed results → repeat`

The loop continues as long as the model's response includes tool usage; when Claude produces plain text without tool calls, the loop naturally terminates.

Claude Code maintains a single main thread with one flat list of messages—no swarms, no multiple agent personas.

#### Real-Time Steering

The async dual-buffer queue provides:
- Pause/resume support
- Ability to incorporate user interjections mid-task without requiring a full restart

This is critical for user control and intervention during long-running tasks.

#### Tools as Capability Primitives

Claude Code uses a small set of powerful primitives:

- **View**: Reads files (default ~2000 lines)
- **LS**: Lists directory contents
- **Glob**: Wildcard searches
- **GrepTool**: Regex-powered search (Anthropic chose regex over vector databases)
- **Edit**: Surgical patches and diffs
- **Write/Replace**: Whole-file operations
- **Bash**: Persistent shell sessions with risk level classification

Note the simplicity: only 14 core tools. This is a deliberate choice—fewer, more powerful tools are easier to use effectively than many specialized tools.

#### Layered Memory

Claude Code implements six layers of memory at session start:
1. Organization policies
2. Project-specific configuration
3. User preferences
4. Session history
5. Working files
6. Dynamic context

### 6.4 Manus Architecture

Manus takes a distinctive approach, with several innovative techniques:

#### Design Around the KV-Cache

The KV-cache hit rate is the single most important metric for a production-stage AI agent. It directly affects both latency and cost.

Key practices:
1. **Keep prompt prefix stable** - Even a single-token difference can invalidate the cache
2. **Make context append-only** - Avoid modifying previous actions or observations
3. **Mark cache breakpoints explicitly** - Account for potential cache expiration

#### Mask, Don't Remove

As agents take on more capabilities, the action space grows more complex. Manus uses a context-aware state machine to manage tool availability. Rather than removing tools, it masks the token logits during decoding to prevent or enforce the selection of certain actions.

#### Use the File System as Context

Modern LLMs offer context windows of 128K tokens or more, but that's often not enough. Manus treats the file system as the ultimate context—unlimited in size, persistent by nature, and directly operable by the agent itself.

Compression strategies are always designed to be restorable. The content of a web page can be dropped from context as long as the URL is preserved.

#### Manipulate Attention Through Recitation

When handling complex tasks, Manus creates a todo.md file and updates it step-by-step as the task progresses. By constantly rewriting the todo list, Manus recites its objectives into the end of the context, pushing the global plan into the model's recent attention span.

#### Keep the Wrong Stuff In

One of the most effective ways to improve agent behavior: leave the wrong turns in the context. When the model sees a failed action, it implicitly updates its internal beliefs, reducing the chance of repeating the same mistake.

### 6.5 SWE-Agent Architecture

SWE-agent introduced the concept of Agent-Computer Interfaces (ACIs). The architecture is built around the principle that agents need specially-designed interfaces:

#### Performance

- **SWE-bench**: 12.5% pass@1 rate
- **HumanEvalFix**: 87.7% pass@1 rate

Far exceeding previous state-of-the-art achieved with non-interactive LMs.

#### Key Design Decisions

1. **Custom Tool Interfaces**: Rather than using generic tool definitions, SWE-agent provides custom interfaces optimized for the agent's needs

2. **Minimal Context Loading**: Tools return only what's necessary, reducing context pressure

3. **Explicit State Transitions**: Clear boundaries between reading, editing, and executing

### 6.6 Devin Architecture

Cognition's Devin represents one of the most advanced production agents. After 18 months of development, the architecture has evolved significantly.

#### Strengths

Devin excels at:
- **Tasks with Clear Requirements**: Junior execution at infinite scale
- **Verifiable Outcomes**: Things that can be automatically tested
- **Repetitive Work**: Migration, test generation, vulnerability fixes

#### Architecture Patterns

- **Incremental Progress**: Breaking large tasks into small, verifiable steps
- **Testing Integration**: Automatically running tests to verify work
- **Documentation Generation**: Creating and updating documentation
- **Planning Capabilities**: Drafting architecture for human review

#### Limitations

- Ambiguous requirements are challenging
- Mid-task scope changes are difficult
- No interpersonal or "soft" skills

---

<a name="tools"></a>
## 7. Tool Design and Agent-Computer Interfaces

Tools are the means by which agents affect change in the world. This section covers best practices for designing tools that agents can use effectively.

### 7.1 Tools as the Agent's Hands

In Claude Code's architecture, tools are described as "the agent's hands"—the means by which it manipulates the world. This metaphor captures the essential role of tools: they extend the model's capabilities into actionable domains.

Core tools that most agent systems include:

**Reading and Discovery**:
- View/Read: Files, typically with configurable line limits
- LS: Directory listing
- Glob: Wildcard pattern matching
- Grep/Find: Text-based search

**Writing and Editing**:
- Edit: In-place modifications (diffs)
- Write: Whole-file creation or replacement
- Create: New file creation

**Execution**:
- Bash/Shell: Command execution
- Python/REPL: Code execution
- Test: Test execution

**Web**:
- Search: Web search
- Fetch: URL content retrieval

### 7.2 Principles of Tool Design

Based on research from SWE-agent and practical implementations, here are the key principles:

#### 7.2.1 Optimize for the Agent's Needs

This is perhaps the most important principle. Tools should be designed for how agents think, not how humans work.

For example, a human-friendly file viewer might show formatted output with syntax highlighting. An agent-friendly viewer might return raw text with line numbers—easier to parse programmatically.

#### 7.2.2 Make Tool Definitions Clear and Unambiguous

Every tool needs:
- Clear name describing what it does
- Unambiguous parameter names
- Explicit parameter types
- Helpful descriptions of what each parameter means

**Bad Example**:
```json
{
  "name": "edit",
  "description": "Edit a file",
  "parameters": {
    "file": "string",
    "content": "string"
  }
}
```

**Good Example**:
```json
{
  "name": "edit_file",
  "description": "Make targeted edits to a file by replacing specific text. Use for small to medium changes to existing files.",
  "parameters": {
    "file_path": {
      "type": "string",
      "description": "Absolute path to the file to edit (e.g., /home/user/project/main.py)"
    },
    "old_string": {
      "type": "string",
      "description": "Exact text to find in the file. Must match exactly, including whitespace."
    },
    "new_string": {
      "type": "string",
      "description": "Text to replace old_string with. Can be empty to delete text."
    }
  }
}
```

#### 7.2.3 Minimize Context the Agent Must Manage

Tools should do as much work as possible. If a tool requires the agent to track complex state, it's likely to fail.

For example, rather than requiring the agent to remember and construct a complex command, provide a simpler interface that handles complexity internally.

#### 7.2.4 Handle Errors Gracefully

Tools should provide useful error information when things go wrong. A tool that just crashes or returns "error" is useless to an agent trying to debug a problem.

**Error Information Should Include**:
- What went wrong
- What the tool was trying to do
- What input caused the problem (if applicable)
- Suggestions for recovery (if possible)

### 7.3 Specific Tool Implementations

#### 7.3.1 File Reading Tools

**Design Considerations**:
- Default line limits prevent overwhelming context
- Configurable limits for specific needs
- Line numbers for reference in edit operations
- Syntax-aware formatting where helpful

**Claude Code's Approach**:
- View tool defaults to ~2000 lines
- Supports offsets for reading specific sections
- Can read specific line ranges

#### 7.3.2 Search Tools

**Design Considerations**:
- Should support both regex and simple string matching
- Return context around matches (line numbers, surrounding lines)
- Support file type filters
- Limit results to prevent overwhelming output

**Cursor's Approach**:
- Combines semantic search with grep
- Provides results ranked by relevance
- Supports filtering by file type

#### 7.3.3 Bash/Shell Tools

**Design Considerations**:
- Persistent sessions for command chains
- Working directory tracking
- Output capture (stdout, stderr)
- Error code reporting
- Permission/safety considerations

**Claude Code's Approach**:
- Risk level classification for commands
- Permission system for write operations
- Command sanitization

### 7.4 Tool Selection Strategies

How should an agent decide which tool to use? This is a critical question in harness design.

#### 7.4.1 Explicit Tool Selection

The model explicitly chooses tools based on:
- The task description
- Available tool definitions
- Its understanding of what each tool does

This is the standard approach in tool-calling models.

#### 7.4.2 Hierarchical Tool Spaces

Manus uses a hierarchical approach:
- **Level 1**: ~20 core tools (stable, cache-friendly)
- **Level 2**: Use bash to call CLI tools
- **Level 3**: Code/packages for complex logic chains

This prevents Context Confusion from having too many tools directly available.

#### 7.4.3 Dynamic Tool Discovery

Cursor's approach of syncing tool descriptions to a folder allows:
- Static context includes only tool names and high-level descriptions
- Agent dynamically looks up tool details when needed
- Results: 46.9% reduction in total agent tokens

### 7.5 Tool Definition Best Practices

Based on analysis of multiple production systems:

1. **Use Simple, Consistent Naming**: `read_file` not `ReadTheFileContent` or `rf`

2. **Provide Parameter Examples**: Show what valid inputs look like

3. **Document Edge Cases**: What happens with empty files? Very large files? Binary files?

4. **Consider Tool Dependencies**: If tool B requires output from tool A, make this explicit

5. **Version Tool Definitions**: As tools evolve, version to maintain compatibility

6. **Test Tool Definitions**: Use the same evaluation framework as agents to test tool quality

---

<a name="memory"></a>
## 8. Memory Systems and State Management

Effective memory management is crucial for agents that need to work across extended time horizons. This section covers the various approaches to memory and state in agent systems.

### 8.1 The Multi-Layer Memory Problem

Agents need to maintain state at multiple levels:

1. **Working Memory**: What the agent is actively thinking about (in context)
2. **Session Memory**: What happened in the current session
3. **Persistent Memory**: What should be remembered across sessions
4. **Shared Memory**: What multiple agents or users need to share

Each level has different characteristics and requires different management approaches.

### 8.2 Layered Memory in Practice

Claude Code implements six layers of memory at session start:

1. **Organization Policies**: Global rules and guidelines
2. **Project Configuration**: Project-specific settings and conventions
3. **User Preferences**: Individual user settings
4. **Session History**: What happened in previous sessions
5. **Working Files**: Current state of the codebase
6. **Dynamic Context**: Information loaded as needed

At session start, the agent loads relevant information from each layer. This provides comprehensive context without overwhelming any single layer.

### 8.3 Memory Types and Their Management

#### 8.3.1 Context Window Memory

This is the working memory—directly accessible to the model during inference.

**Management Strategies**:
- **Full Inclusion**: Include everything (limited by window size)
- **Sliding Window**: Keep only the most recent N tokens
- **Importance-Based**: Keep most important tokens, regardless of recency
- **Hybrid**: Combine recency with importance scoring

#### 8.3.2 Summarized Memory

When context gets too large, summarization compresses the history.

**Best Practices**:
- Keep the most recent tool calls in raw format
- Summarize older content
- Preserve critical decisions and state changes

#### 8.3.3 File System Memory

Treating the file system as memory is a powerful pattern:

- **Project Structure**: How the code is organized
- **Progress Files**: What's been done, what remains
- **Git History**: What changes have been made
- **Configuration Files**: Settings and preferences

**Benefits**:
- Unlimited capacity
- Persistent across sessions
- Directly accessible to agents
- Human-readable for debugging

#### 8.3.4 Database Memory

For more structured memory needs:
- Embeddings for semantic search
- Structured records for entity tracking
- Time-series data for activity logs

### 8.4 State Management Patterns

#### 8.4.1 Stateless Reducers

The 12 Factor Agents framework recommends treating agents as pure functions: input state → output state. This makes testing easier and enables parallelism.

```python
def agent(state: AgentState, context: Context) -> AgentState:
    # Process current state and context
    # Return new state
    return new_state
```

#### 8.4.2 State Machines

For agents with discrete modes or phases:
- Planning → Executing → Verifying → Completed
- Each state has allowed transitions
- Clear entry/exit conditions

#### 8.4.3 Event Sourcing

Record all actions and events, reconstruct state by replaying:
- Complete audit trail
- Easy debugging (replay to any point)
- Natural fit for agent workflows

### 8.5 The Role of Structured Note-Taking

Structured note-taking is one of the most effective memory techniques:

1. **Todo Lists**: Track what needs to be done, what's in progress, what's complete
2. **Decision Logs**: Record important decisions and reasoning
3. **Progress Reports**: Summarize completed work for future sessions
4. **Reference Notes**: Store information that might be needed later

Claude Code uses TodoWrite as a core tool. The TODO list is typically the first thing created and is continuously updated.

### 8.6 Memory Retrieval Strategies

Having memory isn't enough—agents need effective ways to retrieve relevant memories:

1. **Full Load**: Load all relevant memory at session start (simple but limited)
2. **Search-Based**: Search memory for relevant items (flexible but may miss)
3. **Hybrid**: Load key items, search for additional as needed
4. **Context-Included**: Include memory retrieval in context (automatic)

### 8.7 Avoiding Memory Pitfalls

Common problems and solutions:

| Problem | Solution |
|---------|----------|
| Amnesia (lost context) | Structured note-taking + compaction |
| Memory Pollution | Careful filtering, relevance scoring |
| Inconsistent State | Single source of truth, atomic updates |
| Context Confusion | Clear boundaries between memory types |

---

<a name="planning"></a>
## 9. Planning, Reasoning, and Execution Control

A sophisticated agent needs more than just tools and memory—it needs the ability to plan, reason about its actions, and control execution flow. This section covers these higher-level capabilities.

### 9.1 Planning in Agent Systems

Planning is how agents organize their approach to complex tasks. Without planning, agents tend to:

- Make impulsive decisions
- Miss dependencies
- Overlook edge cases
- Fail to recognize completion

#### 9.1.1 Todo Lists as Planning Tools

The most common planning mechanism in modern agents is the TODO list:

1. Create at task start
2. Break down into discrete steps
3. Update as work progresses
4. Check off completed items

**Why Todo Lists Work**:

- Externalize the plan from the model's internal state
- Provide a clear definition of done
- Enable human review of the plan
- Create natural checkpoints

Claude Code uses TodoWrite as a no-op tool—the function doesn't actually "do" anything beyond maintaining the list. Its value is entirely in context engineering.

#### 9.1.2 Recitation for Attention

Manus uses a technique called "recitation" to keep plans in attention:

- Create a todo.md file at task start
- Continuously update it as work progresses
- The updates appear at the end of context
- This pushes the plan into the model's recent attention span

The key insight: models pay most attention to recent tokens. By updating the todo list frequently, the plan stays visible.

#### 9.1.3 Sub-Agent Delegation

For complex tasks, agents can spawn sub-agents to handle portions:

- **Context Management**: Each sub-agent has limited context
- **Parallelism**: Multiple sub-agents can work simultaneously
- **Specialization**: Sub-agents can be optimized for specific task types

Claude Code's dispatch_agent tool enables this pattern. Sub-agents are full Claude Code instances with only the limitation that they cannot spawn their own sub-agents.

### 9.2 Reasoning and Self-Verification

LangChain's research on harness engineering identified self-verification as a critical capability.

#### 9.2.1 The Build & Self-Verify Pattern

The most common failure pattern: "the agent wrote a solution, re-read its own code, confirmed it looks ok, and stopped."

To address this, LangChain added guidance to system prompts:

1. **Planning & Discovery**: Read the task, scan the codebase, build an initial plan
2. **Build**: Implement the plan with verification in mind
3. **Verify**: Run tests, read full output, compare against what was asked
4. **Fix**: Analyze errors, revisit spec, fix issues

#### 9.2.2 Encouraging Agents to Step Back

Agents can be myopic once they've decided on a plan, resulting in "doom loops" where they repeatedly try the same approach unsuccessfully.

LangChain uses LoopDetectionMiddleware that:
- Tracks per-file edit counts
- Adds context like "consider reconsidering your approach" after N edits to the same file
- Nudges the agent toward alternative strategies

### 9.3 Execution Flow Control

#### 9.3.1 Loop Termination

The basic TAOR loop terminates when the model produces output without tool calls. This is elegant but can be problematic:

- Agent might stop before task is complete
- Agent might not recognize when to ask for clarification

**Solutions**:
- Clear completion criteria in prompts
- Verification steps before termination
- Human-in-the-loop checkpoints for critical decisions

#### 9.3.2 Pause and Resume

For long-running tasks, pause/resume capability is essential:

- User wants to provide input mid-task
- External event requires agent to wait
- Resource constraints require batching

Claude Code's async queue provides this capability through dual-buffer architecture.

#### 9.3.3 Checkpoints and Rollback

For reliability, agents should support:

- **Checkpoints**: Save state at key decision points
- **Rollback**: Return to a previous checkpoint if something fails
- **Forking**: Explore multiple approaches from a checkpoint

Claude Code sessions function like git branches, supporting these operations.

### 9.4 Handling Ambiguity

A key limitation of current agents: they struggle with ambiguous requirements.

**Devin's Findings**:
- Best with clear, upfront requirements
- Struggles with ambiguous tasks
- Handles scope changes poorly

**Design Implications**:
- Prompt agents to ask clarifying questions
- Build interfaces that help users provide clear requirements
- Detect ambiguity and surface it to humans

### 9.5 Reasoning About Time and Budgets

LangChain found that injecting time budget warnings improved agent behavior:

- Remind agents of time/iteration limits
- Nudge toward completion as limits approach
- Prevent infinite loops

---

<a name="performance"></a>
## 10. Performance Optimization and Benchmarking

Understanding how to measure and improve agent performance is crucial for production systems. This section covers benchmarking approaches and optimization strategies.

### 10.1 Benchmarking Agent Performance

#### 10.1.1 Common Benchmarks

**SWE-bench**: Software engineering benchmark using real GitHub issues
- Measures ability to resolve issues in existing codebases
- Pass@1 rate is the primary metric

**HumanEvalFix**: Code fixing benchmark
- Based on the HumanEval dataset
- Measures debugging capability

**Terminal Bench**: CLI-based evaluation
- Tests agent ability to work in terminal environments
- 89 tasks across domains like ML, debugging, biology

**Cursor Context Bench**: Information retrieval evaluation
- Focuses on finding relevant information in codebases
- Has known correct answers

#### 10.1.2 Offline vs. Online Evaluation

**Offline Evaluation**:
- Use curated datasets with known answers
- Fast iteration, no user impact
- May not capture real-world complexity

**Online Evaluation (A/B Testing)**:
- Test with real users
- Measures actual impact
- Slower, riskier

Cursor maintains both:
- Cursor Context Bench for offline evaluation
- Online A/B tests for real-world validation

### 10.2 Key Performance Metrics

#### 10.2.1 Accuracy Metrics

- **Pass Rate**: Percentage of tasks completed successfully
- **Code Retention**: Whether agent-written code remains in user codebases
- **User Satisfaction**: Follow-up request rates, feedback

#### 10.2.2 Efficiency Metrics

- **Token Usage**: Total tokens consumed per task
- **Latency**: Time from request to completion
- **Iterations**: Number of tool calls or loops needed

#### 10.2.3 Reliability Metrics

- **Failure Rate**: How often agents fail to complete tasks
- **Recovery Rate**: How often agents recover from failures
- **Consistency**: Performance variance across similar tasks

### 10.3 What Actually Improves Performance

LangChain documented their journey from Top 30 to Top 5 on Terminal Bench 2.0—using only harness changes:

#### 10.3.1 Build & Self-Verify

Self-verification allows agents to self-improve via feedback within a run. Adding explicit verification steps dramatically improved completion rates.

#### 10.3.2 Context About Environment

1. **Directory Context & Tooling**: Map cwd and other directories, find tools like Python
2. **Teaching Agents to Work Testably**: Add prompting that says work will be measured against programmatic tests
3. **Time Budgeting**: Inject time budget warnings to nudge the agent to finish work

#### 10.3.3 Loop Detection

Middleware that detects doom loops and redirects agent behavior improved reliability.

#### 10.3.4 Reasoning Compute Selection

`gpt-5.2-codex` has 4 reasoning modes: low, medium, high, and xhigh.

LangChain found that a "reasoning sandwich" works best—spending more reasoning on planning and verification:
- xhigh for planning
- high for execution
- xhigh for verification

### 10.4 Cursor's Performance Results

#### Semantic Search Impact

- **12.5% higher accuracy** in answering questions
- **2.6% improvement in code retention** on large codebases
- **2.2% decrease in dissatisfied follow-ups** with semantic search

#### Dynamic Context Discovery

- **46.9% reduction in total agent tokens** for MCP tool calls
- Significant latency improvements
- Better accuracy from reduced noise

### 10.5 Optimization Strategies

#### 10.5.1 Token Optimization

- Minimize included context
- Use dynamic loading
- Compress where possible
- Cache aggressively

#### 10.5.2 Latency Optimization

- Async tool execution where possible
- Pre-fetch likely-needed context
- Parallelize independent operations
- Optimize tool implementations

#### 10.5.3 Accuracy Optimization

- Better tool definitions
- More specific prompts
- Self-verification steps
- Clearer completion criteria

---

<a name="failure"></a>
## 11. Failure Modes and Mitigation Strategies

Understanding how agents fail is essential for building robust systems. This section catalogs common failure modes and proven mitigation strategies.

### 11.1 Common Failure Patterns

#### 11.1.1 Premature Completion

**Problem**: Agent declares victory before work is actually complete.

**Symptoms**:
- Stops after minimal changes
- Doesn't verify against requirements
- Marks features as done without testing

**Solutions**:
- Set up a feature list file with explicit completion criteria
- Prompt for self-verification of all requirements
- Require test passing before marking complete

#### 11.1.2 Runaway Loops

**Problem**: Agent repeatedly attempts the same action without progress.

**Symptoms**:
- Same tool calls repeated
- No forward progress
- Excessive resource consumption

**Solutions**:
- Loop detection middleware tracking per-action counts
- Explicit nudges to reconsider approach
- Clear termination criteria

#### 11.1.3 Context Collapse

**Problem**: Agent loses track of context or forgets important information.

**Symptoms**:
- Asks same questions repeatedly
- Loses track of task goal
- Makes contradictory statements

**Solutions**:
- Structured note-taking
- Context compaction before limits
- Progressive context refresh

#### 11.1.4 Permission Roulette

**Problem**: Inconsistent trust decisions lead to unpredictable behavior.

**Symptoms**:
- Sometimes allows, sometimes blocks
- User repeatedly asked same questions
- Unclear why permissions vary

**Solutions**:
- Consistent permission policies
- Clear communication about what's allowed
- Explicit user preference storage

#### 11.1.5 Tool Misuse

**Problem**: Agent uses wrong tools or uses tools incorrectly.

**Symptoms**:
- Ineffective approaches to problems
- Incorrect tool parameters
- Failed tool calls

**Solutions**:
- Clear, unambiguous tool definitions
- Error messages that guide correction
- Tool usage examples in prompts

### 11.2 Anthropic's Failure Mode Analysis

Anthropic documented specific failure modes and solutions:

| Problem | Solution |
|---------|----------|
| Claude declares victory too early | Set up a feature list file |
| Claude leaves environment with bugs | Write git commits and progress notes |
| Claude marks features as done prematurely | Self-verify all features |
| Claude spends time figuring out how to run the app | Write an init.sh script |

### 11.3 Designing for Today's Limitations

The 12 Factor Agents framework emphasizes: "Models today aren't perfect; design around today's shortcomings."

This means:
- Don't assume perfect reasoning
- Build in verification
- Create explicit control points
- Enable human intervention

### 11.4 Safety and Protection Layers

Claude Code implements multiple layers of protection:

- **Permission System**: Tool-level allow/deny/ask
- **Command Sanitization**: Prevent dangerous commands
- **Diff-Based Workflows**: Review changes before applying
- **CLAUDE.md as Project Memory**: Store safety-critical information
- **Compressor for Context Management**: Prevent context overflow

---

<a name="future"></a>
## 12. The Future of Agent Harnesses

The field of harness engineering is evolving rapidly. This section speculates on future directions based on current trends.

### 12.1 Trends to Watch

#### 12.1.1 Increasing Model Capability

As models become smarter, harnesses may shrink:
- Fewer explicit instructions needed
- Better tool use without detailed definitions
- More implicit context understanding

#### 12.1.2 Standardization

Patterns like:
- Agent Skills open standard
- Model Context Protocol (MCP)
- Tool definition formats

Will enable interoperability and faster development.

#### 12.1.3 Multi-Agent Systems

The future likely involves:
- Multiple specialized agents working together
- Agents that spawn and manage sub-agents
- Agent-to-agent communication protocols

#### 12.1.4 Longer Contexts

As context windows continue to grow:
- Less aggressive optimization needed
- New patterns for using massive contexts
- Context becomes even more important as a design parameter

### 12.2 Open Questions

1. **How much should we rely on prompting vs. training?**
2. **What is the right balance of agency and control?**
3. **How do we enable agents to handle ambiguity better?**
4. **What new failure modes will emerge?**

### 12.3 Principles for the Future

Based on everything we've learned:

1. **Context is Currency**: Treat it as precious, spend wisely
2. **Simplicity Wins**: Few powerful tools beat many complex ones
3. **Design for Failure**: Assume things will go wrong
4. **Human in the Loop**: Enable intervention, don't fully automate
5. **Measure Everything**: Build feedback loops into production systems

---

## Conclusion

Harness engineering has emerged as a critical discipline for building effective AI agents. The difference between a capable model and a useful agent lies entirely in the harness—the tools, context management, memory systems, and execution control that surround it.

The key principles that emerge from this comprehensive survey:

1. **Context is Finite**: Treat context as a scarce resource to be carefully managed
2. **Dynamic is Better than Static**: Pull information just-in-time rather than loading everything
3. **Progressive Disclosure**: Layer information from minimal to comprehensive
4. **Plan Explicitly**: Use todo lists and structured note-taking to externalize plans
5. **Verify Everything**: Build self-verification into agent workflows
6. **Design for Failure**: Assume agents will fail and build recovery mechanisms
7. **Measure and Iterate**: Use benchmarks and A/B testing to improve

The field is evolving rapidly, but these principles provide a solid foundation for building production-grade AI agents that can work reliably on complex, real-world tasks.

---

*This document is part of a four-volume comprehensive guide to agent harness engineering. See also: Architecture Deep Dive, Implementation Guide, and Performance and Optimization.*


---


# Agent Harness Architecture: A Deep Dive

*A Comprehensive Technical Analysis*

---

## Table of Contents

1. [Architectural Foundations](#foundations)
2. [The Evolution from Workflows to Loops](#workflows-to-loops)
3. [Core Architectural Components](#components)
4. [Detailed System Comparisons](#comparisons)
5. [Scalability Patterns](#scalability)
6. [Integration Patterns](#integration)
7. [Security and Safety Architecture](#security)
8. [State Management Deep Dive](#state)
9. [Event-Driven Architectures](#event-driven)
10. [Multi-Agent Architectures](#multi-agent)
11. [Platform-Specific Considerations](#platform)
12. [Future Architectural Directions](#future)

---

<a name="foundations"></a>
## 1. Architectural Foundations

Understanding agent harness architecture requires first establishing the fundamental concepts that underpin all modern implementations.

### 1.1 What Makes an Architecture "Agent-native"?

Not all software architectures are suited for AI agents. An agent-native architecture has several distinguishing characteristics:

**Model-Driven Control Flow**: Unlike traditional software where control flow is determined by code, in agent-native systems the model drives execution. The runtime doesn't know what the next step will be—that's determined by the model's output.

**Tool-Centric Design**: Every capability the agent needs is exposed as a tool. The architecture assumes tools are the primary interface between intelligence and action.

**Context as Infrastructure**: Context management isn't an afterthought—it's a first-class architectural concern. The system is built around optimizing context use.

**Graceful Degradation**: Agent-native architectures account for the inherent unpredictability of model behavior. They include fallbacks, retries, and human escalation paths.

### 1.2 The Role of the Runtime

The runtime is the execution environment that surrounds the model. In a TAOR (Think-Act-Observe-Repeat) loop, the runtime is responsible for:

1. **Model Invocation**: Calling the model with appropriate context
2. **Output Parsing**: Extracting tool calls from model output
3. **Tool Execution**: Running the requested tools with appropriate parameters
4. **Result Formatting**: Presenting tool results back to the model
5. **Loop Management**: Determining when to continue or terminate

The runtime should be "dumb" in the sense that it doesn't contain business logic—it simply executes the model's decisions. However, it must be sophisticated in handling the mechanics of execution.

### 1.3 Architectural Layers

A complete agent system typically contains these architectural layers:

**Layer 1: User Interface**
- How users interact with the agent
- CLI, IDE plugin, web UI, API
- Handles input/output formatting

**Layer 2: Session Management**
- Maintains state across turns
- Handles multi-session continuity
- Manages user context

**Layer 3: Context Orchestration**
- Loads and manages context
- Implements retrieval and discovery
- Handles compaction and summarization

**Layer 4: Agent Core**
- Executes the main loop
- Coordinates tool calls
- Manages execution flow

**Layer 5: Tool Layer**
- Tool definitions and schemas
- Tool execution
- Result formatting

**Layer 6: External Integrations**
- File system access
- Network requests
- Database connections

### 1.4 The Harness as the Body

Vrungta's analysis provides a useful metaphor: "The AI is wrapped in a local Harness that gives the 'Brain' (LLM) a 'Body' (Shell, Filesystem, Memory) to act in the real world."

This captures an essential truth: the model provides intelligence, but the harness provides agency. Without a harness, a model is just a prediction engine. With a harness, it becomes an agent that can act in the world.

---

<a name="workflows-to-loops"></a>
## 2. The Evolution from Workflows to Loops

One of the most significant architectural shifts in agent systems has been the transition from workflow-based to loop-based execution. Understanding this evolution clarifies why modern architectures look the way they do.

### 2.1 Workflow-Based Architectures

In workflow-based architectures, control flow is explicitly defined:

```
Graph:
  A → B → C → D
  
Code:
if (condition) { do_X() } else { do_Y() }
```

The system knows at each step what comes next. This is the traditional software engineering model.

**Advantages**:
- Predictable, deterministic behavior
- Easy to understand and debug
- Straightforward to test
- Clear performance characteristics

**Disadvantages**:
- Inflexible—can't adapt to unexpected situations
- Requires explicit handling of every case
- Doesn't leverage model's reasoning capability
- Brittle when facing novel inputs

### 2.2 The Problem with Pure Workflows

Early agent systems attempted to use pure workflows. The model would decide which branch to take, but the overall flow was predetermined.

This approach failed because:

1. **Complexity Explosion**: Handling all possible paths required exponential logic
2. **No Learning**: The system couldn't improve from experience
3. **Context Blindness**: Workflows couldn't adapt to context
4. **Scaling Issues**: More complex tasks required exponentially more workflow steps

### 2.3 The Loop Revolution

The breakthrough came from recognizing that the model itself could control the loop:

```
while (model_has_more_work()) {
    decision = model.decide()
    if (decision.requires_action) {
        result = execute(decision.action)
        model.incorporate(result)
    } else {
        break  // Model is done
    }
}
```

This simple pattern, now called TAOR (Think-Act-Observe-Repeat), is deceptively powerful.

**Why Loops Work**:

1. **Emergent Complexity**: Simple rules produce sophisticated behavior
2. **Context Sensitivity**: Each iteration can adapt to current context
3. **Natural Termination**: The model decides when it's done
4. **Human-Like**: Mirrors how humans approach complex tasks

### 2.4 Hybrid Approaches

Modern systems combine workflows and loops:

**Workflow as Scaffold**: Define the overall structure as a workflow, but allow the model to make decisions within each step.

**Loop with Guardrails**: The main execution is a loop, but certain actions trigger workflow-based handling.

**State Machine + Loop**: Discrete states are managed as a workflow, but transitions between states are model-driven.

LangChain's approach exemplifies this: "Build & Self-Verify" provides a workflow-like scaffold around the model's loop execution.

### 2.5 The Runtime's Role in Loop Execution

In a TAOR loop, the runtime must handle several complexities:

**Iteration Counting**:
- Track number of iterations
- Detect infinite loops
- Enforce budget limits

**State Management**:
- Maintain loop state across iterations
- Handle state transitions
- Support pause/resume

**Tool Coordination**:
- Execute tools in correct order
- Handle tool dependencies
- Manage concurrent tool execution

**Termination Logic**:
- Detect when model indicates completion
- Handle ambiguous termination signals
- Support external termination (user interrupt, timeout)

---

<a name="components"></a>
## 3. Core Architectural Components

This section provides detailed analysis of the core components that make up production agent systems.

### 3.1 The Message Bus

At the heart of most agent systems is a message-passing infrastructure. Messages flow between:

- User and agent
- Agent and tools
- Tools and external systems
- Multiple agents in multi-agent systems

**Design Considerations**:

1. **Message Format**: JSON is standard, with structured fields for type, content, metadata
2. **Ordering**: Messages should maintain causal ordering
3. **Delivery**: At-least-once vs exactly-once semantics
4. **Persistence**: Should messages survive restarts?
5. **Capacity**: Buffer sizes, overflow handling

Claude Code uses an asynchronous dual-buffer queue (h2A) that provides pause/resume support and the ability to incorporate user interjections mid-task.

### 3.2 Tool Engine and Scheduler

The tool engine is responsible for:

1. **Tool Lookup**: Finding the requested tool by name
2. **Validation**: Checking that required parameters are provided
3. **Execution**: Running the tool with provided parameters
4. **Error Handling**: Catching and formatting errors
5. **Result Formatting**: Returning results in a consistent format

**Architectural Patterns**:

**Synchronous Execution**:
- Tools run one at a time
- Simple to reason about
- Clear error propagation

**Asynchronous Execution**:
- Multiple tools can run concurrently
- Better throughput for I/O-bound tools
- More complex error handling

**Distributed Execution**:
- Tools can run on different machines
- Enables scaling
- Requires network coordination

### 3.3 Context Manager

The context manager handles all aspects of context:

**Context Window Management**:
- Track current token usage
- Calculate remaining capacity
- Trigger compaction when approaching limits

**Context Loading**:
- Load initial context at session start
- Support dynamic loading during execution
- Handle context refresh

**Context Retrieval**:
- Semantic search integration
- File system access
- Database queries

**Context Compaction**:
- Summarization triggers
- Summary generation
- History management

### 3.4 Memory Subsystem

The memory subsystem handles long-term state:

**In-Memory Storage**:
- Fast access for active data
- Limited by RAM
- Volatile

**File System Storage**:
- Persistent storage
- Large capacity
- Human-readable formats

**Database Storage**:
- Structured data
- Queryable
- Supports complex relationships

**Embedding Storage**:
- Vector databases for semantic search
- Efficient similarity queries
- Scalable

### 3.5 Execution Orchestrator

The orchestrator manages the overall execution flow:

**Loop Execution**:
- Main TAOR loop
- Sub-agent execution
- Parallel agent coordination

**State Transitions**:
- Tracking execution state
- Managing state machines
- Handling transitions

**Error Recovery**:
- Retry logic
- Fallback handling
- Escalation paths

---

<a name="comparisons"></a>
## 4. Detailed System Comparisons

Understanding different architectural approaches requires direct comparison. This section analyzes several major production systems.

### 4.1 Claude Code Architecture

Claude Code provides one of the most sophisticated and well-documented architectures.

**Core Design Principles**:

1. **Simplicity**: Only 14 core tools
2. **Single Thread**: One flat message list, no swarms
3. **Native Tool Loop**: While(tool_use) pattern
4. **Layered Memory**: Six memory layers at session start

**Key Components**:

| Component | Description |
|-----------|-------------|
| User Interface | CLI, VS Code plugin, web UI |
| Scheduling Layer | Main agent loop + async queue |
| StreamGen | Streaming output generation |
| ToolEngine | Tool invocation |
| Compressor | Context summarization |

**What Makes It Work**:

- Detailed system prompts
- Todo list for planning
- Sub-agents for parallelism
- File system as memory
- Permission system for safety

### 4.2 Manus Architecture

Manus takes a distinctive approach with several innovative techniques.

**Core Design Principles**:

1. **KV-Cache Optimization**: Every decision optimized for cache hit rate
2. **Append-Only Context**: Never modify previous context
3. **Action Masking**: Control tool availability through logits masking
4. **Recitation Pattern**: Constant todo.md updates push plans into attention

**Key Techniques**:

| Technique | Purpose |
|-----------|---------|
| Stable Prompt Prefix | Maximize KV cache hits |
| Append-Only Context | Preserve cache validity |
| Hierarchical Action Space | Avoid context confusion |
| Wrong Stuff In | Learn from failures |

**What Makes It Work**:

- File system as ultimate context
- Compression designed to be restorable
- Sub-agents with structured schemas
- Clear separation of planning and execution

### 4.3 SWE-agent Architecture

SWE-agent introduced the Agent-Computer Interface (ACI) concept.

**Core Design Principles**:

1. **ACI-First**: Tools designed specifically for agents
2. **Minimal Interface**: Each tool does one thing well
3. **Explicit State**: Clear boundaries between modes

**Key Components**:

| Component | Description |
|-----------|-------------|
| Custom Tool Interface | Optimized for agent needs |
| State Manager | Track editing vs. reading mode |
| Repository Access | Navigate entire repos |
| Test Runner | Execute and verify tests |

**What Makes It Work**:

- Custom tool definitions per task type
- Emphasis on clear error messages
- Test execution integration

### 4.4 Devin Architecture

Cognition's Devin represents production-scale agent deployment.

**Core Design Principles**:

1. **Incremental Progress**: Break tasks into verifiable steps
2. **Testing Integration**: Automatic test execution
3. **Documentation**: Generate docs as part of workflow
4. **Planning**: Draft architecture for review

**Architecture Characteristics**:

| Aspect | Approach |
|--------|----------|
| Execution Model | Long-running sessions |
| Progress Tracking | Feature-based |
| Verification | Programmatic testing |
| Human Collaboration | Planning and review |

**What Makes It Work**:

- Clear upfront requirements
- Incremental verification
- Documentation generation
- PR workflow integration

### 4.5 Cursor Architecture

Cursor focuses on the IDE integration aspect of agents.

**Core Design Principles**:

1. **Semantic Search**: Embedding-based code search
2. **Dynamic Context**: Progressive disclosure of information
3. **Model-Specific Optimization**: Different harnesses for different models

**Key Components**:

| Component | Description |
|-----------|-------------|
| Context Engine | Manages context loading |
| Semantic Search | Embedding-based retrieval |
| MCP Integration | Model Context Protocol |
| Terminal Sync | File-based terminal output |

**What Makes It Work**:

- Semantic + grep hybrid search
- Dynamic tool loading
- Progressive disclosure
- Offline + online evaluation

### 4.6 Comparison Matrix

| System | Primary Focus | Loop Type | Memory Model | Tool Count |
|--------|---------------|-----------|---------------|-------------|
| Claude Code | Coding agent | TAOR | Layered (6) | 14 core |
| Manus | General agent | TAOR + state | File system | Hierarchical |
| SWE-agent | SWE tasks | TAOR | Context window | Custom ACI |
| Devin | Dev workflow | Workflow + loop | Feature-based | Domain-specific |
| Cursor | IDE integration | TAOR | Progressive | Dynamic loading |

---

<a name="scalability"></a>
## 5. Scalability Patterns

Building agents that can handle increased load requires architectural patterns that support scaling.

### 5.1 Horizontal Scaling

**Multiple Agent Instances**:
- Run multiple agent instances behind a load balancer
- Session affinity for stateful sessions
- Stateless design where possible

**Partitioning Strategies**:
- By user: Each user gets dedicated agent instance
- By task: Different instances handle different task types
- By capacity: Instance pools based on load

### 5.2 Vertical Scaling

**More Powerful Models**:
- Use larger models for complex tasks
- Route based on task complexity

**More Context**:
- Support larger context windows
- More aggressive context loading

### 5.3 Tool Execution Scaling

**Async Tool Execution**:
- Non-blocking tool calls
- Concurrent tool execution
- Better resource utilization

**Tool Caching**:
- Cache frequently-used tool results
- Invalidate based on inputs
- TTL for freshness

### 5.4 Context Scaling

**Distributed Retrieval**:
- Multiple retrieval workers
- Result aggregation
- Cache distribution

**Multi-Level Context**:
- In-memory cache for hot data
- File system for warm data
- Database for cold data

---

<a name="integration"></a>
## 6. Integration Patterns

Production agents must integrate with existing systems and workflows.

### 6.1 Version Control Integration

**Git Integration**:
- Commit progress at logical points
- Branch for exploration
- Merge back on success

Claude Code patterns:
- Commit after completing features
- Use commit messages as progress notes
- Branch for experimental work

### 6.2 CI/CD Integration

**Pipeline Integration**:
- Trigger agents from pipeline events
- Report results back to pipeline
- Automatic test execution

### 6.3 IDE Integration

**Plugin Architecture**:
- Inline editing
- Real-time suggestions
- Context menu actions

Cursor's approach:
- VS Code plugin
- Terminal integration
- File system sync

### 6.4 API Integration

**REST/GraphQL**:
- Expose agent capabilities as APIs
- Webhook triggers
- Authentication and rate limiting

### 6.5 Database Integration

**Data Access**:
- Query databases as needed
- Cache results appropriately
- Transaction handling

---

<a name="security"></a>
## 7. Security and Safety Architecture

Building safe agents requires architectural safeguards at multiple levels.

### 7.1 Permission Systems

Claude Code implements tool-level permissions:

| Permission | Description |
|------------|-------------|
| Allow | Tool can execute without prompting |
| Deny | Tool cannot execute |
| Ask | User prompted before execution |

**Design Considerations**:
- Default to conservative permissions
- Allow users to customize
- Log permission decisions

### 7.2 Command Sanitization

**Input Validation**:
- Sanitize shell commands
- Prevent injection attacks
- Limit dangerous operations

**Path Safety**:
- Restrict file access to allowed directories
- Prevent path traversal
- Validate file operations

### 7.3 Diff-Based Workflows

**Review Before Apply**:
- Show changes before applying
- Allow user approval
- Enable rollback

### 7.4 Safety Layers

Multiple layers of protection:

1. **Model-Level**: Constitutional AI, safety training
2. **Tool-Level**: Permission system, input validation
3. **Runtime-Level**: Execution monitoring, limits
4. **Human-Level**: Approval workflows, intervention points

### 7.5 Haiku for Security Checks

Claude Code sends commands to Claude Haiku (smallest model) for safety review before execution. This provides:

- Fast security check without slowing main loop
- Structured output for decision making
- Lightweight overhead

---

<a name="state"></a>
## 8. State Management Deep Dive

State management is one of the most complex aspects of agent architecture.

### 8.1 State Categories

**Execution State**:
- Current position in task
- Active tool calls
- Loop iterations

**Session State**:
- Conversation history
- Loaded context
- Active memory

**Application State**:
- User preferences
- Project configuration
- External integrations

### 8.2 State Machine Patterns

For agents with discrete modes:

```
States:
- IDLE: Waiting for input
- PLANNING: Creating task breakdown
- EXECUTING: Running tools
- VERIFYING: Checking work
- COMPLETED: Task done
- ERROR: Failure state

Transitions:
- IDLE → PLANNING (on new task)
- PLANNING → EXECUTING (plan ready)
- EXECUTING → VERIFYING (tools done)
- VERIFYING → EXECUTING (fix needed)
- VERIFYING → COMPLETED (all good)
- Any → ERROR (on failure)
```

### 8.3 Event Sourcing

Event sourcing records all state changes as events:

**Benefits**:
- Complete audit trail
- Easy debugging
- Natural replay capability

**Implementation**:
- Event store (database or log)
- Projector functions
- Snapshotting for performance

### 8.4 Snapshotting

For long-running sessions:

1. **Periodic Snapshots**: Save state every N iterations
2. **里程碑 Snapshots**: Save at key decision points
3. **On-Demand**: User-triggered snapshots

### 8.5 Distributed State

For horizontally scaled systems:

**Challenges**:
- Consistency across instances
- State transfer on failover
- Conflict resolution

**Solutions**:
- Centralized state store (Redis, etcd)
- Event-based replication
- Client-side state with validation

---

<a name="event-driven"></a>
## 9. Event-Driven Architectures

Event-driven patterns are increasingly important for complex agent systems.

### 9.1 Event Types

| Event | Description |
|-------|-------------|
| TaskStarted | New task received |
| ToolCallRequested | Model wants to call tool |
| ToolCallCompleted | Tool execution finished |
| ToolCallFailed | Tool execution failed |
| ContextLoaded | Context retrieved |
| ContextFull | Context limit reached |
| SessionCreated | New session started |
| SessionEnded | Session completed |

### 9.2 Event Handlers

Events can trigger various handlers:

**Automatic Responses**:
- Context compaction on ContextFull
- Logging on any state change
- Metrics collection

**Human Notifications**:
- Alerts on errors
- Completion notifications
- Approval requests

### 9.3 Event Bus Implementation

**In-Memory Bus**:
- Simple, fast
- Single instance only

**Distributed Bus**:
- Kafka, RabbitMQ, etc.
- Multi-instance support
- Durable events

---

<a name="multi-agent"></a>
## 10. Multi-Agent Architectures

Complex tasks often benefit from multiple agents working together.

### 10.1 Why Multi-Agent?

**Benefits**:
- Specialization: Different agents for different tasks
- Parallelism: Work simultaneously
- Context Management: Limited context per agent
- Modularity: Easier to develop and test

### 10.2 Architectures

#### 10.2.1 Supervisor Pattern

One main agent delegates to sub-agents:

```
Supervisor:
  - Maintains overall context
  - Delegates to sub-agents
  - Aggregates results
  
Sub-agents:
  - Focused task context
  - Limited scope
  - Return structured results
```

#### 10.2.2 Swarm Pattern

Multiple agents work in parallel:

```
Coordination Layer:
  - Task distribution
  - Result aggregation
  - Conflict resolution
  
Agents:
  - Work on subtasks
  - Communicate through coordination layer
```

#### 10.2.3 Pipeline Pattern

Agents in sequence:

```
Agent A → Agent B → Agent C
  Output    Input      Output
```

### 10.3 Communication Patterns

**Structured Messages**:
- Define message schemas
- Type-safe communication
- Clear protocols

**Shared Context**:
- Shared memory/workspace
- Event-based updates
- Conflict resolution

### 10.4 Sub-Agent Implementation in Claude Code

Claude Code implements sub-agents through the `dispatch_agent` tool:

- Each sub-agent is a full Claude Code instance
- Limited depth (can't spawn sub-agents)
- Returns condensed summaries
- Context window management through encapsulation

---

<a name="platform"></a>
## 11. Platform-Specific Considerations

Different deployment platforms require different architectural considerations.

### 11.1 Local Deployment

**Advantages**:
- Low latency
- No network costs
- Data stays local
- Full control

**Considerations**:
- Resource constraints (CPU, RAM)
- Limited model options
- Manual updates

### 11.2 Cloud Deployment

**Advantages**:
- Scalable resources
- Latest models
- Managed infrastructure
- High availability

**Considerations**:
- Network latency
- Data privacy
- Cost management
- Vendor lock-in

### 11.3 Hybrid Approaches

**Edge + Cloud**:
- Lightweight agents on edge
- Heavy lifting in cloud
- Local context caching

### 11.4 Model-Specific Optimization

Different models require different harnesses:

**OpenAI Codex**:
- Reasoning traces critical (30% drop if removed)
- Shell-forward approach
- Message ordering matters
- Bias toward action

**Anthropic Models**:
- Strong tool use
- Complex prompt following
- Context window management critical

**Google Models**:
- Different attention patterns
- Context length variations
- Specific optimization needs

---

<a name="future"></a>
## 12. Future Architectural Directions

The field is evolving rapidly. Here are emerging trends and future directions.

### 12.1 Emerging Patterns

#### 12.1.1 Agent-as-a-Tool

Treating agents as tools that can be invoked by other agents:

- Main model invokes "Deep Research" as a tool
- Sub-agent created on demand
- Returns structured results
- Maintains clean separation

Manus applies this principle: "For the main model, 'Deep Research' should just be a tool call."

#### 12.1.2 Skills Architecture

Progressive disclosure at the skill level:

- Skill registry
- Lazy loading of skill details
- Composition of skills

Claude Code's Skills:
- At startup: Only names and descriptions
- On demand: Full skill content
- Supports skill dependencies

#### 12.1.3 Composable Permissions

Tool-level granular permissions:

- Allow/Deny/Ask per tool
- User-specific rules
- Context-aware policies

### 12.2 Technology Trends

**Larger Contexts**:
- 1M+ token context windows
- Less aggressive optimization needed
- New patterns for context use

**Better Models**:
- More capable reasoning
- Better tool use
- Less harness needed

**Standardization**:
- MCP (Model Context Protocol)
- Agent Skills standard
- Tool definition formats

### 12.3 Open Research Questions

1. **How do we measure agent "intelligence"?**
2. **What is the optimal harness complexity?**
3. **How do we enable agents to learn from failures?**
4. **What are the limits of current architectures?**
5. **How do we ensure agent safety at scale?**

---

## Conclusion

Agent harness architecture has evolved from simple tool wrappers to sophisticated systems managing context, state, security, and execution flow. The key principles:

1. **Loop-Based Execution**: Model drives the loop
2. **Context as First-Class**: Design around context management
3. **Tool-Centric**: Everything is a tool
4. **Layered Memory**: Multiple levels of persistence
5. **Human in the Loop**: Enable intervention
6. **Security by Design**: Multiple protection layers

The field continues to evolve rapidly. The architectures described here represent current best practices, but the landscape is shifting. Stay current, measure everything, and iterate based on real-world performance.

---

*Part 2 of the Comprehensive Guide to Agent Harnesses. See also: Fundamentals and Context Engineering, Implementation Guide, and Performance and Optimization.*


---


# Agent Harness Implementation Guide

*A Practical Guide to Building Production Systems*

---

## Table of Contents

1. [Getting Started: Core Implementation Patterns](#getting-started)
2. [Tool Implementation Deep Dive](#tools)
3. [Prompt Engineering for Agents](#prompts)
4. [Context Management Implementation](#context)
5. [Memory System Implementation](#memory)
6. [Planning and Reasoning Implementation](#planning)
7. [Execution Loop Implementation](#execution)
8. [Testing Agent Systems](#testing)
9. [Deployment Considerations](#deployment)
10. [Monitoring and Observability](#monitoring)
11. [Common Implementation Patterns](#patterns)
12. [Case Studies: Building Specific Features](#case-studies)

---

<a name="getting-started"></a>
## 1. Getting Started: Core Implementation Patterns

This section covers the fundamental building blocks of agent system implementation.

### 1.1 The Minimal Agent

At its core, an agent needs only a few components:

```python
class MinimalAgent:
    def __init__(self, model_client, tools):
        self.model = model_client
        self.tools = tools
        self.messages = []
    
    def run(self, user_message):
        # Add user message
        self.messages.append({"role": "user", "content": user_message})
        
        # Main loop
        while True:
            # Get model response
            response = self.model.chat(self.messages)
            
            # Check for tool calls
            if response.tool_calls:
                for tool_call in response.tool_calls:
                    # Execute tool
                    result = self.execute_tool(tool_call)
                    # Add result to messages
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result
                    })
            else:
                # No tool calls = done
                return response.content
    
    def execute_tool(self, tool_call):
        tool_name = tool_call.name
        tool = self.tools.get(tool_name)
        if not tool:
            return f"Error: Unknown tool {tool_name}"
        try:
            return tool(**tool_call.arguments)
        except Exception as e:
            return f"Error: {str(e)}"
```

This minimal pattern is the foundation. Every production system builds on this structure.

### 1.2 Adding System Prompts

System prompts shape agent behavior. Add them as the first message:

```python
def __init__(self, model_client, tools, system_prompt):
    self.model = model_client
    self.tools = tools
    self.system_prompt = system_prompt
    self.messages = [{"role": "system", "content": system_prompt}]

def run(self, user_message):
    self.messages.append({"role": "user", "content": user_message})
    # ... rest of loop
```

### 1.3 The Tool Registry

Tools need to be registered and discoverable:

```python
class ToolRegistry:
    def __init__(self):
        self.tools = {}
    
    def register(self, name, func, description, parameters):
        self.tools[name] = {
            "function": func,
            "description": description,
            "parameters": parameters
        }
    
    def get_schema(self):
        """Return OpenAI-style tool schema"""
        return [
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool["description"],
                    "parameters": tool["parameters"]
                }
            }
            for name, tool in self.tools.items()
        ]
    
    def execute(self, name, arguments):
        if name not in self.tools:
            raise ValueError(f"Unknown tool: {name}")
        return self.tools[name]["function"](**arguments)
```

### 1.4 Message Formatting

Messages need consistent formatting for the model:

```python
def format_messages(self, messages):
    """Format messages for model input"""
    formatted = []
    for msg in messages:
        if msg["role"] == "system":
            formatted.append({
                "role": "system",
                "content": msg["content"]
            })
        elif msg["role"] == "user":
            formatted.append({
                "role": "user", 
                "content": msg["content"]
            })
        elif msg["role"] == "assistant":
            if "tool_calls" in msg:
                formatted.append({
                    "role": "assistant",
                    "content": msg.get("content"),
                    "tool_calls": msg["tool_calls"]
                })
                # Tool results come as separate messages
            else:
                formatted.append({
                    "role": "assistant",
                    "content": msg["content"]
                })
        elif msg["role"] == "tool":
            formatted.append({
                "role": "tool",
                "tool_call_id": msg["tool_call_id"],
                "content": msg["content"]
            })
    return formatted
```

---

<a name="tools"></a>
## 2. Tool Implementation Deep Dive

Tools are the primary interface between agents and the world. This section covers implementation patterns.

### 2.1 Tool Schema Definition

Tools are defined using JSON Schema:

```python
def create_tool_schema(
    name: str,
    description: str,
    parameters: dict,
    required: list = None
) -> dict:
    """Create a tool schema definition"""
    return {
        "type": "object",
        "properties": parameters,
        "required": required or [],
        "name": name,
        "description": description
    }
```

Example: File Read Tool

```python
READ_FILE_SCHEMA = {
    "name": "read_file",
    "description": "Read contents of a file. Use this to view file contents before editing or to understand code.",
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "The absolute path to the file to read (e.g., /home/user/project/main.py)"
            },
            "offset": {
                "type": "integer", 
                "description": "Line number to start reading from (1-indexed)",
                "default": 1
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of lines to read",
                "default": 2000
            }
        },
        "required": ["file_path"]
    }
}
```

### 2.2 Tool Implementation Patterns

#### 2.2.1 File Operations

```python
def read_file(file_path: str, offset: int = 1, limit: int = 2000) -> str:
    """
    Read a file with line numbers for reference.
    
    Returns formatted file contents with line numbers.
    """
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        # Apply offset and limit (convert to 0-indexed)
        start = max(0, offset - 1)
        end = start + limit
        
        selected_lines = lines[start:end]
        
        if not selected_lines:
            return f"File is empty or requested range is beyond EOF"
        
        # Format with line numbers
        result = []
        for i, line in enumerate(selected_lines, start=start + 1):
            result.append(f"{i:4d}: {line.rstrip()}")
        
        return "\n".join(result)
    
    except FileNotFoundError:
        return f"Error: File not found: {file_path}"
    except PermissionError:
        return f"Error: Permission denied: {file_path}"
    except Exception as e:
        return f"Error reading file: {str(e)}"
```

#### 2.2.2 Bash/Shell Execution

```python
import subprocess
import shlex

class BashTool:
    def __init__(self, working_directory: str = None, allowed_directories: list = None):
        self.working_directory = working_directory
        self.allowed_directories = allowed_directories or []
    
    def execute(self, command: str, timeout: int = 30) -> str:
        """
        Execute a shell command and return output.
        
        Includes safety checks and proper output formatting.
        """
        # Security: Check command safety
        if not self._is_command_safe(command):
            return "Error: Command not allowed for security reasons"
        
        # Security: Check directory
        if not self._is_directory_allowed(command):
            return f"Error: Command would access disallowed directory"
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=self.working_directory,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            output = []
            if result.stdout:
                output.append(f"STDOUT:\n{result.stdout}")
            if result.stderr:
                output.append(f"STDERR:\n{result.stderr}")
            output.append(f"Exit code: {result.returncode}")
            
            return "\n\n".join(output)
        
        except subprocess.TimeoutExpired:
            return f"Error: Command timed out after {timeout} seconds"
        except Exception as e:
            return f"Error executing command: {str(e)}"
    
    def _is_command_safe(self, command: str) -> bool:
        """Basic command safety checks"""
        dangerous = ['rm -rf /', 'mkfs', ':(){:|:&};:']
        for pattern in dangerous:
            if pattern in command:
                return False
        return True
    
    def _is_directory_allowed(self, command: str) -> bool:
        """Check if command accesses allowed directories"""
        if not self.allowed_directories:
            return True
        # Simple check - in production, parse more carefully
        return any(allowed in command for allowed in self.allowed_directories)
```

#### 2.2.3 Search Tools

```python
import os
import re

def grep_tool(
    pattern: str,
    path: str = ".",
    file_pattern: str = "*",
    context_lines: int = 3
) -> str:
    """
    Search for pattern in files.
    
    Returns matches with surrounding context.
    """
    matches = []
    regex = re.compile(pattern)
    
    for root, dirs, files in os.walk(path):
        # Skip hidden directories and common ignores
        dirs[:] = [d for d in dirs if not d.startswith('.') 
                   and d not in ['node_modules', '__pycache__', 'venv']]
        
        for filename in files:
            if not _matches_pattern(filename, file_pattern):
                continue
            
            filepath = os.path.join(root, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                for i, line in enumerate(lines, 1):
                    if regex.search(line):
                        # Get context
                        start = max(0, i - context_lines - 1)
                        end = min(len(lines), i + context_lines)
                        
                        context = []
                        for j in range(start, end):
                            marker = ">>>" if j == i - 1 else "   "
                            context.append(f"{marker}{j+1:4d}: {lines[j].rstrip()}")
                        
                        matches.append({
                            "file": filepath,
                            "line": i,
                            "match": line.strip(),
                            "context": "\n".join(context)
                        })
            
            except Exception as e:
                continue
    
    if not matches:
        return f"No matches found for: {pattern}"
    
    result = [f"Found {len(matches)} matches:\n"]
    for m in matches[:50]:  # Limit results
        result.append(m["context"])
        result.append("")
    
    return "\n".join(result)

def _matches_pattern(filename: str, pattern: str) -> bool:
    """Simple glob-like matching"""
    import fnmatch
    return fnmatch.fnmatch(filename, pattern)
```

### 2.3 Tool Error Handling

Good error messages help agents recover:

```python
def safe_execute_tool(tool_func, arguments, max_retries=3):
    """Execute a tool with proper error handling"""
    for attempt in range(max_retries):
        try:
            return tool_func(**arguments)
        except TypeError as e:
            # Missing or invalid argument
            return f"Error: Invalid arguments - {str(e)}. Check tool schema."
        except FileNotFoundError as e:
            return f"Error: File not found - {str(e)}"
        except PermissionError as e:
            return f"Error: Permission denied - {str(e)}"
        except Exception as e:
            if attempt == max_retries - 1:
                return f"Error after {max_retries} attempts: {str(e)}"
            # Retry on other errors
    return "Error: Max retries exceeded"
```

### 2.4 Tool Categories

Organize tools by category:

| Category | Tools | Purpose |
|----------|-------|---------|
| **File I/O** | read, write, edit | File manipulation |
| **Search** | grep, glob, find | Code discovery |
| **Execution** | bash, python | Running commands |
| **Web** | fetch, search | External data |
| **Planning** | todo | Task management |
| **Meta** | agent, task | Sub-agent dispatch |

---

<a name="prompts"></a>
## 3. Prompt Engineering for Agents

Prompts are the primary way to shape agent behavior. This section covers prompt patterns.

### 3.1 System Prompt Structure

A well-structured system prompt includes:

```python
def create_system_prompt(
    agent_name: str,
    capabilities: list,
    constraints: list,
    examples: list = None
) -> str:
    """Create a comprehensive system prompt"""
    
    sections = [
        f"You are {agent_name}, an AI coding assistant.",
        "",
        "## Capabilities",
        *[f"- {cap}" for cap in capabilities],
        "",
        "## Constraints",
        *[f"- {constraint}" for constraint in constraints],
    ]
    
    if examples:
        sections.extend([
            "",
            "## Examples",
            *examples
        ])
    
    return "\n".join(sections)
```

### 3.2 Claude Code-Inspired System Prompt

Based on the documented Claude Code approach:

```python
SYSTEM_PROMPT = """You are Claude Code, an AI programming assistant.

## Core Guidelines

- Think carefully about the task before acting
- Break complex tasks into smaller steps
- Verify your work after each step
- Ask for clarification when needed

## Available Tools

You have access to the following tools:

- **read_file**: Read file contents
- **write_file**: Create or overwrite files  
- **edit_file**: Make targeted edits to files
- **bash**: Execute shell commands
- **grep**: Search for patterns in code
- **glob**: Find files by pattern
- **todo_write**: Track task progress

## Working with Code

1. **Understand first**: Read relevant code before making changes
2. **Plan your approach**: Create a todo list for complex tasks
3. **Make incremental changes**: Edit one thing at a time
4. **Test your changes**: Run tests or verify manually
5. **Commit progress**: Use git to save progress regularly

## Error Handling

- When you encounter errors, read them carefully
- Understand what went wrong before trying to fix
- If stuck, try a different approach
- Ask for help if needed

## Communication

- Be clear and concise in your responses
- Explain what you're doing and why
- If you need more information, ask
- When done, summarize what was accomplished

Remember: Take it step by step, verify your work, and don't hesitate to ask questions.
"""
```

### 3.3 Few-Shot Prompting

Add examples for complex behaviors:

```python
FEW_SHOT_EXAMPLES = """
## Example 1: Reading a file before editing

User: Add error handling to main.py
Assistant (thought): I should read main.py first to understand its structure.
Tool call: read_file(file_path="main.py")
...

## Example 2: Creating a todo list for complex tasks

User: Build a web application with user auth
Assistant (thought): This is a complex task. I should create a todo list first.
Tool call: todo_write(todo_items=[{"content": "Create project structure", "status": "pending"}, ...])
...

## Example 3: Verifying work with tests

User: Fix the login bug
Assistant (thought): I made a fix. Let me run the tests to verify.
Tool call: bash(command="python -m pytest tests/")
...
"""
```

### 3.4 Model-Specific Prompting

Different models require different approaches:

#### OpenAI Codex

```python
CODEX_PROMPT_ADDITIONS = """
### Reasoning Guidelines

- Keep reasoning summaries brief (1-2 sentences)
- Note when discovering new information
- Avoid commenting on your own communication

### Action Bias

- Unless the user explicitly asks for a plan, assume they want code changes
- Prefer using tools to asking questions when the path is clear

### Message Order

- System messages take precedence
- Your instructions follow system prompts
"""
```

### 3.5 Dynamic Prompt Components

Build prompts dynamically based on context:

```python
def build_prompt(session_context):
    """Build dynamic prompt based on session state"""
    
    components = [
        BASE_PROMPT,
        get_user_preferences_prompt(session_context.user_id),
        get_project_context_prompt(session_context.project_path),
        get_session_history_prompt(session_context.messages[-10:]),
        get_reminder_prompt(session_context)
    ]
    
    return "\n\n".join(components)

def get_reminder_prompt(context):
    """Get contextual reminders"""
    reminders = []
    
    if not context.get("todo_items"):
        reminders.append("- The task has no todo list; consider creating one")
    
    if context.get("recent_errors"):
        reminders.append("- Recent errors occurred; investigate if related to your changes")
    
    if context.get("time_budget_remaining"):
        budget = context["time_budget_remaining"]
        reminders.append(f"- Time budget: ~{budget} minutes remaining")
    
    return "\n".join(reminders) if reminders else ""
```

---

<a name="context"></a>
## 4. Context Management Implementation

Context management is crucial for agent performance.

### 4.1 Context Tracking

```python
class ContextManager:
    def __init__(self, max_tokens: int, model_name: str):
        self.max_tokens = max_tokens
        self.model_name = model_name
        self.messages = []
        self.current_tokens = 0
        self.tokenizer = self._get_tokenizer(model_name)
    
    def _get_tokenizer(self, model_name: str):
        """Get appropriate tokenizer"""
        if "gpt" in model_name:
            import tiktoken
            return tiktoken.get_encoding("cl100k_base")
        else:
            # Fallback: estimate at 4 chars per token
            return None
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        else:
            return len(text) // 4
    
    def add_message(self, role: str, content: str):
        """Add message and track tokens"""
        tokens = self.count_tokens(content)
        self.messages.append({
            "role": role,
            "content": content,
            "tokens": tokens
        })
        self.current_tokens += tokens
    
    def is_near_limit(self, threshold: float = 0.8) -> bool:
        """Check if approaching context limit"""
        return self.current_tokens > (self.max_tokens * threshold)
    
    def get_messages_for_api(self) -> list:
        """Get formatted messages for API"""
        return [
            {"role": m["role"], "content": m["content"]}
            for m in self.messages
        ]
```

### 4.2 Context Compaction

```python
class ContextCompactor:
    def __init__(self, model_client):
        self.model = model_client
    
    async def compact(self, messages: list, keep_recent: int = 10) -> list:
        """
        Compact context by summarizing old messages.
        
        Keeps recent messages in full, summarizes older ones.
        """
        if len(messages) <= keep_recent:
            return messages
        
        recent = messages[-keep_recent:]
        older = messages[:-keep_recent]
        
        # Summarize older messages
        summary = await self._summarize_messages(older)
        
        # Create compacted messages
        compacted = [
            {
                "role": "system",
                "content": f"Previous conversation summary: {summary}"
            }
        ]
        compacted.extend(recent)
        
        return compacted
    
    async def _summarize_messages(self, messages: list) -> str:
        """Summarize a list of messages"""
        # Extract non-system messages
        relevant = [m for m in messages if m["role"] != "system"]
        
        if not relevant:
            return "No previous relevant conversation."
        
        # Build summary prompt
        conversation = "\n".join([
            f"{m['role']}: {m['content'][:200]}..."
            for m in relevant
        ])
        
        summary_prompt = f"""Summarize this conversation concisely, preserving key information:
        
{conversation}

Summary:"""
        
        response = self.model.chat([
            {"role": "user", "content": summary_prompt}
        ])
        
        return response.content
```

### 4.3 Dynamic Context Loading

```python
class DynamicContextLoader:
    def __init__(self, retrieval_system):
        self.retrieval = retrieval_system
        self.cache = {}
    
    async def load_context(
        self, 
        query: str, 
        current_context: str,
        max_context: int
    ) -> str:
        """
        Dynamically load relevant context based on query.
        
        Uses hybrid of semantic search and keyword matching.
        """
        # Estimate current context size
        current_size = len(current_context)
        available = max_context - current_size
        
        if available < 1000:
            return current_context  # Not enough room
        
        # Search for relevant content
        results = await self.retrieval.search(
            query=query,
            max_results=5
        )
        
        # Add results up to available space
        added = []
        for result in results:
            result_text = f"\n\nContext from {result['source']}:\n{result['content']}"
            if len(result_text) + current_size + len("".join(added)) < max_context:
                added.append(result_text)
            else:
                break
        
        return current_context + "".join(added)
```

### 4.4 Progressive Disclosure Implementation

```python
class ProgressiveDisclosureManager:
    def __init__(self):
        self.layers = {
            "index": {},      # Layer 1: Names/descriptions
            "detail": {},     # Layer 2: Full content
            "deep": {}        # Layer 3: Supporting materials
        }
    
    def register(self, item_id: str, content: dict):
        """
        Register an item with multiple layers.
        
        content should have:
        - name: For layer 1
        - description: For layer 1
        - detail: For layer 2
        - deep: For layer 3 (optional)
        """
        self.layers["index"][item_id] = {
            "name": content.get("name"),
            "description": content.get("description")
        }
        self.layers["detail"][item_id] = content.get("detail")
        if "deep" in content:
            self.layers["deep"][item_id] = content["deep"]
    
    def get_layer(self, layer: str) -> dict:
        """Get all items at a specific layer"""
        return self.layers.get(layer, {})
    
    def get_item(self, item_id: str, layer: str = "detail") -> str:
        """Get specific item at specific layer"""
        return self.layers.get(layer, {}).get(item_id)
```

---

<a name="memory"></a>
## 5. Memory System Implementation

Memory enables agents to work across extended time horizons.

### 5.1 Structured Note-Taking

```python
class NoteTakingSystem:
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self.notes = {}
    
    def write_note(self, key: str, content: str):
        """Write a note to memory"""
        self.notes[key] = {
            "content": content,
            "updated_at": datetime.now().isoformat()
        }
        self._persist()
    
    def read_note(self, key: str) -> str:
        """Read a note from memory"""
        note = self.notes.get(key)
        return note["content"] if note else None
    
    def list_notes(self) -> list:
        """List all note keys"""
        return list(self.notes.keys())
    
    def _persist(self):
        """Persist notes to disk"""
        import json
        with open(self.storage_path, 'w') as f:
            json.dump(self.notes, f)
```

### 5.2 Todo List Implementation

```python
import json
from datetime import datetime

class TodoList:
    def __init__(self, storage_file: str = None):
        self.items = []
        self.storage_file = storage_file
        if storage_file:
            self.load()
    
    def add(self, content: str, status: str = "pending", priority: int = 0):
        """Add a todo item"""
        self.items.append({
            "id": len(self.items),
            "content": content,
            "status": status,  # pending, in_progress, completed
            "priority": priority,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
        self.save()
    
    def update(self, item_id: int, **updates):
        """Update a todo item"""
        for item in self.items:
            if item["id"] == item_id:
                item.update(updates)
                item["updated_at"] = datetime.now().isoformat()
                self.save()
                return True
        return False
    
    def complete(self, item_id: int):
        """Mark item as completed"""
        return self.update(item_id, status="completed")
    
    def get_status(self) -> dict:
        """Get current status summary"""
        return {
            "total": len(self.items),
            "pending": sum(1 for i in self.items if i["status"] == "pending"),
            "in_progress": sum(1 for i in self.items if i["status"] == "in_progress"),
            "completed": sum(1 for i in self.items if i["status"] == "completed")
        }
    
    def to_prompt_string(self) -> str:
        """Convert to prompt-friendly format"""
        lines = ["## Current Task List", ""]
        for item in self.items:
            status_icon = {
                "pending": "[ ]",
                "in_progress": "[→]",
                "completed": "[✓]"
            }.get(item["status"], "[?]")
            lines.append(f"{status_icon} {item['content']}")
        
        status = self.get_status()
        lines.append(f"\nProgress: {status['completed']}/{status['total']} completed")
        
        return "\n".join(lines)
    
    def save(self):
        if self.storage_file:
            with open(self.storage_file, 'w') as f:
                json.dump(self.items, f)
    
    def load(self):
        try:
            with open(self.storage_file, 'r') as f:
                self.items = json.load(f)
        except FileNotFoundError:
            self.items = []
```

### 5.3 Session State Management

```python
import pickle
from pathlib import Path

class SessionManager:
    def __init__(self, sessions_dir: str = "./sessions"):
        self.sessions_dir = Path(sessions_dir)
        self.sessions_dir.mkdir(exist_ok=True)
    
    def create_session(self, session_id: str) -> 'Session':
        """Create a new session"""
        session = Session(session_id)
        session.save(self.sessions_dir / f"{session_id}.pkl")
        return session
    
    def load_session(self, session_id: str) -> 'Session':
        """Load an existing session"""
        path = self.sessions_dir / f"{session_id}.pkl"
        if path.exists():
            with open(path, 'rb') as f:
                return pickle.load(f)
        return None
    
    def list_sessions(self) -> list:
        """List all session IDs"""
        return [p.stem for p in self.sessions_dir.glob("*.pkl")]


class Session:
    def __init__(self, session_id: str):
        self.id = session_id
        self.created_at = datetime.now().isoformat()
        self.messages = []
        self.tool_history = []
        self.state = {}
        self.metadata = {}
    
    def add_message(self, role: str, content: str):
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_tool_call(self, tool_name: str, args: dict, result: str):
        self.tool_history.append({
            "tool": tool_name,
            "args": args,
            "result": result[:500],  # Truncate long results
            "timestamp": datetime.now().isoformat()
        })
    
    def save(self, path: Path):
        with open(path, 'wb') as f:
            pickle.dump(self, f)
```

### 5.4 Long-Term Memory

```python
class LongTermMemory:
    def __init__(self, vector_store, storage_path: str):
        self.vector_store = vector_store
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok()
    
    def store(self, content: str, metadata: dict):
        """Store content with embeddings"""
        # Generate embedding
        embedding = self.vector_store.get_embedding(content)
        
        # Store in vector DB
        self.vector_store.add(
            vectors=[embedding],
            documents=[content],
            metadatas=[metadata]
        )
        
        # Also store full content
        import json
        memory_file = self.storage_path / f"{metadata['id']}.json"
        with open(memory_file, 'w') as f:
            json.dump({
                "content": content,
                "metadata": metadata
            }, f)
    
    def recall(self, query: str, top_k: int = 5) -> list:
        """Recall relevant memories"""
        query_embedding = self.vector_store.get_embedding(query)
        
        results = self.vector_store.search(
            query_vectors=[query_embedding],
            n_results=top_k
        )
        
        return results
```

---

<a name="planning"></a>
## 6. Planning and Reasoning Implementation

Implementing planning capabilities in agents.

### 6.1 Task Decomposition

```python
class TaskDecomposer:
    def __init__(self, model_client):
        self.model = model_client
    
    async def decompose(self, task: str) -> list:
        """Break a task into subtasks"""
        prompt = f"""Break this task into small, actionable subtasks:

Task: {task}

List each subtask on a separate line, keeping it small and focused."""
        
        response = self.model.chat([{"role": "user", "content": prompt}])
        
        # Parse response into list
        lines = response.content.strip().split("\n")
        tasks = []
        for line in lines:
            line = line.strip()
            # Remove numbering/bullets
            line = re.sub(r'^[\d\.\)\-\*]+\s*', '', line)
            if line:
                tasks.append({
                    "content": line,
                    "status": "pending"
                })
        
        return tasks
```

### 6.2 Self-Verification

```python
class SelfVerifier:
    def __init__(self, model_client):
        self.model = model_client
    
    async def verify_completion(
        self, 
        task: str, 
        work_done: str,
        verification_criteria: list = None
    ) -> dict:
        """Verify if task was completed successfully"""
        
        criteria = verification_criteria or [
            "Does the solution address the original task?",
            "Are there any obvious errors or issues?",
            "Is the code complete and functional?"
        ]
        
        prompt = f"""Verify if this task was completed successfully:

Original Task: {task}

Work Completed:
{work_done}

Verification Questions:
{chr(10).join(f"- {q}" for q in criteria)}

Provide your verification in this format:
VERIFIED: Yes/No
ISSUES: (list any issues found)
NOTES: (any additional observations)"""
        
        response = self.model.chat([{"role": "user", "content": prompt}])
        
        # Parse verification
        return self._parse_verification(response.content)
    
    def _parse_verification(self, response: str) -> dict:
        """Parse verification response"""
        result = {"verified": False, "issues": [], "notes": ""}
        
        for line in response.split("\n"):
            line = line.strip()
            if line.startswith("VERIFIED:"):
                result["verified"] = "Yes" in line
            elif line.startswith("ISSUES:"):
                # Parse issues
                issues_text = line.replace("ISSUES:", "").strip()
                if issues_text:
                    result["issues"] = [i.strip() for i in issues_text.split("-") if i.strip()]
            elif line.startswith("NOTES:"):
                result["notes"] = line.replace("NOTES:", "").strip()
        
        return result
```

### 6.3 Loop Detection

```python
class LoopDetector:
    def __init__(self, max_same_action: int = 3):
        self.max_same_action = max_same_action
        self.action_history = []
    
    def record_action(self, action: str, params: dict = None):
        """Record an action for loop detection"""
        action_key = f"{action}:{str(params)}"
        self.action_history.append(action_key)
        
        # Keep only recent history
        self.action_history = self.action_history[-20:]
    
    def is_looping(self) -> bool:
        """Detect if agent is in a loop"""
        if len(self.action_history) < self.max_same_action:
            return False
        
        # Check for repeated pattern
        recent = self.action_history[-self.max_same_action:]
        return len(set(recent)) == 1
    
    def get_loop_warning(self) -> str:
        """Generate warning message"""
        return (
            "Warning: The same action was performed multiple times. "
            "Consider trying a different approach or asking for help."
        )
```

### 6.4 Plan Execution

```python
class PlanExecutor:
    def __init__(self, agent, todo_list: TodoList):
        self.agent = agent
        self.todo = todo_list
    
    async def execute_plan(self):
        """Execute plan from todo list"""
        pending_items = [
            item for item in self.todo.items 
            if item["status"] == "pending"
        ]
        
        for item in pending_items:
            # Mark as in progress
            self.todo.update(item["id"], status="in_progress")
            
            # Execute
            result = await self.agent.run(item["content"])
            
            # Check if successful
            if self._is_success(result):
                self.todo.complete(item["id"])
            else:
                self.todo.update(item["id"], status="pending")
                # Add note about issue
                self.todo.update(
                    item["id"], 
                    notes=f"Failed: {result[:100]}"
                )
    
    def _is_success(self, result: str) -> bool:
        """Determine if execution was successful"""
        # Check for error indicators
        error_patterns = [
            "Error:",
            "Failed:",
            "Exception:",
            "Traceback"
        ]
        return not any(pattern in result for pattern in error_patterns)
```

---

<a name="execution"></a>
## 7. Execution Loop Implementation

The main execution loop is the heart of the agent system.

### 7.1 Basic Execution Loop

```python
class AgentLoop:
    def __init__(
        self, 
        model_client,
        tool_registry,
        context_manager,
        max_iterations: int = 100
    ):
        self.model = model_client
        self.tools = tool_registry
        self.context = context_manager
        self.max_iterations = max_iterations
    
    async def run(self, user_message: str) -> str:
        """Main execution loop"""
        # Initialize
        self.context.add_message("user", user_message)
        iteration = 0
        
        while iteration < self.max_iterations:
            iteration += 1
            
            # Check context limit
            if self.context.is_near_limit():
                await self._compact_context()
            
            # Get model response
            response = await self.model.chat(
                self.context.get_messages_for_api(),
                tools=self.tools.get_schema()
            )
            
            # Handle tool calls
            if response.tool_calls:
                for tool_call in response.tool_calls:
                    # Execute tool
                    result = await self._execute_tool(tool_call)
                    
                    # Add result to context
                    self.context.add_message(
                        "tool",
                        result,
                        tool_call_id=tool_call.id
                    )
                
                # Continue loop
                continue
            
            # No tool calls = done
            self.context.add_message("assistant", response.content)
            return response.content
        
        return "Error: Max iterations exceeded"
    
    async def _execute_tool(self, tool_call) -> str:
        """Execute a tool call"""
        try:
            result = self.tools.execute(
                tool_call.name,
                tool_call.arguments
            )
            return str(result)
        except Exception as e:
            return f"Error: {str(e)}"
    
    async def _compact_context(self):
        """Compact context when near limit"""
        compactor = ContextCompactor(self.model)
        compacted = await compactor.compact(
            self.context.messages,
            keep_recent=10
        )
        self.context.messages = compacted
```

### 7.2 Advanced Loop Features

#### Pause/Resume

```python
class PausableLoop(AgentLoop):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.paused = False
        self.pause_queue = []
    
    async def pause(self):
        """Pause the loop"""
        self.paused = True
    
    async def resume(self, user_input: str = None):
        """Resume the loop"""
        self.paused = False
        if user_input:
            self.context.add_message("user", user_input)
        return await self.run_loop()
    
    async def run_loop(self):
        """Main loop with pause support"""
        while not self.paused:
            # ... rest of loop
            pass
```

#### Human-in-the-Loop

```python
class HumanInLoop(AgentLoop):
    def __init__(self, *args, approval_threshold: str = "high", **kwargs):
        super().__init__(*args, **kwargs)
        self.approval_threshold = approval_threshold
        self.pending_approvals = []
    
    async def should_approve(self, tool_call) -> bool:
        """Determine if tool call needs approval"""
        high_risk_tools = ["bash", "write_file", "delete"]
        
        if self.approval_threshold == "high":
            return tool_call.name in high_risk_tools
        elif self.approval_threshold == "medium":
            return tool_call.name in high_risk_tools + ["edit_file"]
        
        return False
    
    async def run_loop(self):
        while True:
            # ... get response ...
            
            if response.tool_calls:
                for tool_call in response.tool_calls:
                    if await self.should_approve(tool_call):
                        # Request approval
                        approval = await self.request_approval(tool_call)
                        if not approval:
                            continue  # Skip tool
                    
                    # Execute tool
                    # ...
```

### 7.3 Error Recovery

```python
class ResilientLoop(AgentLoop):
    def __init__(self, *args, max_retries: int = 3, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_retries = max_retries
    
    async def run_with_retry(self, user_message: str) -> str:
        """Run with automatic retry on failure"""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await self.run(user_message)
            except Exception as e:
                last_error = e
                # Check if retryable
                if not self._is_retryable(e):
                    raise
                
                # Add error context
                self.context.add_message(
                    "system",
                    f"Previous attempt failed: {str(e)}. Try a different approach."
                )
        
        raise last_error
    
    def _is_retryable(self, error: Exception) -> bool:
        """Determine if error is retryable"""
        retryable = [
            "timeout",
            "rate limit",
            "temporary"
        ]
        error_str = str(error).lower()
        return any(r in error_str for r in retryable)
```

---

<a name="testing"></a>
## 8. Testing Agent Systems

Testing agents requires different approaches than traditional software.

### 8.1 Unit Testing Tools

```python
import pytest
from unittest.mock import Mock, AsyncMock

def test_read_file_tool():
    """Test read_file tool"""
    # Create temp file
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write("line 1\nline 2\nline 3")
        temp_path = f.name
    
    try:
        result = read_file(temp_path)
        
        # Verify
        assert "line 1" in result
        assert "line 2" in result
        assert "1:" in result  # Line numbers
    finally:
        os.unlink(temp_path)

def test_grep_tool():
    """Test grep tool"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        file1 = os.path.join(tmpdir, "test.py")
        with open(file1, 'w') as f:
            f.write("def hello():\n    print('hello')")
        
        result = grep_tool("def", tmpdir)
        
        assert "test.py" in result
        assert "def hello" in result
```

### 8.2 Integration Testing the Agent Loop

```python
@pytest.mark.asyncio
async def test_agent_loop_basic():
    """Test basic agent loop"""
    # Setup
    mock_model = AsyncMock()
    mock_model.chat.return_value = Mock(
        content="Task completed",
        tool_calls=None
    )
    
    tool_registry = ToolRegistry()
    tool_registry.register(
        "echo",
        lambda msg: msg,
        "Echo a message",
        {"msg": {"type": "string"}}
    )
    
    context_manager = ContextManager(max_tokens=10000, model_name="test")
    
    agent = AgentLoop(
        mock_model,
        tool_registry,
        context_manager
    )
    
    result = await agent.run("Hello")
    
    assert result == "Task completed"
    mock_model.chat.assert_called()

@pytest.mark.asyncio
async def test_agent_loop_tool_calls():
    """Test agent loop with tool calls"""
    mock_model = AsyncMock()
    mock_model.chat.side_effect = [
        Mock(
            content="I'll read the file",
            tool_calls=[Mock(
                id="call_1",
                name="read_file",
                arguments={"file_path": "/test.txt"}
            )]
        ),
        Mock(content="File contains: hello world", tool_calls=None)
    ]
    
    tool_registry = ToolRegistry()
    tool_registry.register(
        "read_file",
        lambda file_path: f"File contains: {file_path}",
        "Read a file",
        {"file_path": {"type": "string"}}
    )
    
    context_manager = ContextManager(max_tokens=10000, model_name="test")
    
    agent = AgentLoop(mock_model, tool_registry, context_manager)
    
    result = await agent.run("What's in /test.txt?")
    
    assert "hello" in result.lower()
```

### 8.3 Evaluation Frameworks

```python
class AgentEvaluator:
    def __init__(self, agent, metrics: list):
        self.agent = agent
        self.metrics = metrics
    
    async def evaluate(self, test_cases: list) -> dict:
        """Run evaluation on test cases"""
        results = []
        
        for test_case in test_cases:
            result = await self._run_test_case(test_case)
            results.append(result)
        
        # Aggregate metrics
        return {
            "total": len(results),
            "passed": sum(1 for r in results if r["passed"]),
            "failed": sum(1 for r in results if not r["passed"]),
            "metrics": self._aggregate_metrics(results)
        }
    
    async def _run_test_case(self, test_case: dict) -> dict:
        """Run a single test case"""
        task = test_case["task"]
        expected = test_case.get("expected")
        
        result = await self.agent.run(task)
        
        # Check result
        passed = self._check_result(result, expected, test_case)
        
        return {
            "task": task,
            "result": result,
            "expected": expected,
            "passed": passed
        }
    
    def _check_result(self, result, expected, test_case) -> bool:
        """Check if result meets expectations"""
        if "contains" in expected:
            return expected["contains"] in result
        if "regex" in expected:
            import re
            return re.search(expected["regex"], result) is not None
        return True
```

### 8.4 Regression Testing

```python
def test_regression_baseline():
    """Run baseline tests to detect regressions"""
    # Define baseline tasks
    baseline_tasks = [
        "Create a hello world Python file",
        "Find all files with .py extension",
        "Read the contents of README.md",
    ]
    
    # Run agent on each
    results = []
    for task in baseline_tasks:
        result = run_agent(task)
        results.append((task, result))
    
    # Compare with previous baseline
    # This would load previous results from storage
    previous = load_baseline()
    
    regressions = []
    for (task, result), prev in zip(results, previous):
        if result != prev:
            regressions.append({
                "task": task,
                "previous": prev,
                "current": result
            })
    
    assert len(regressions) == 0, f"Found {len(regressions)} regressions"
```

---

<a name="deployment"></a>
## 9. Deployment Considerations

Production deployment requires additional considerations.

### 9.1 Environment Configuration

```python
import os
from dataclasses import dataclass

@dataclass
class AgentConfig:
    model_name: str
    max_tokens: int
    temperature: float
    max_iterations: int
    timeout: int
    
    @classmethod
    def from_env(cls):
        return cls(
            model_name=os.getenv("MODEL_NAME", "gpt-4"),
            max_tokens=int(os.getenv("MAX_TOKENS", "32000")),
            temperature=float(os.getenv("TEMPERATURE", "0.7")),
            max_iterations=int(os.getenv("MAX_ITERATIONS", "100")),
            timeout=int(os.getenv("TIMEOUT", "300"))
        )
```

### 9.2 Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY agent/ ./agent/
COPY tools/ ./tools/

# Environment
ENV MODEL_NAME=gpt-4
ENV MAX_ITERATIONS=100

# Run
CMD ["python", "-m", "agent.server"]
```

### 9.3 Scaling Configuration

```python
@dataclass
class ScalingConfig:
    min_instances: int = 1
    max_instances: int = 10
    target_cpu_utilization: float = 0.7
    scale_up_cooldown: int = 60
    scale_down_cooldown: int = 300
```

### 9.4 Health Checks

```python
async def health_check():
    """Health check endpoint"""
    checks = {
        "model": check_model_health(),
        "tools": check_tools_health(),
        "storage": check_storage_health()
    }
    
    all_healthy = all(checks.values())
    
    return {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks
    }

async def check_model_health():
    """Check if model is responding"""
    try:
        response = await model.chat([{"role": "user", "content": "ping"}])
        return response is not None
    except:
        return False
```

---

<a name="monitoring"></a>
## 10. Monitoring and Observability

Production agents need comprehensive monitoring.

### 10.1 Metrics Collection

```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
agent_requests = Counter(
    'agent_requests_total',
    'Total agent requests',
    ['status']
)

iteration_count = Histogram(
    'agent_iterations',
    'Number of iterations per request'
)

token_usage = Histogram(
    'agent_tokens',
    'Token usage per request',
    ['type']  # input/output
)

tool_calls = Counter(
    'agent_tool_calls_total',
    'Total tool calls',
    ['tool_name', 'status']
)

active_sessions = Gauge(
    'agent_active_sessions',
    'Number of active sessions'
)
```

### 10.2 Logging

```python
import logging
import json
from datetime import datetime

class AgentLogger:
    def __init__(self, log_file: str):
        self.logger = logging.getLogger("agent")
        self.log_file = log_file
    
    def log_request(self, session_id: str, request: str):
        self._write("request", {
            "session_id": session_id,
            "request": request,
            "timestamp": datetime.now().isoformat()
        })
    
    def log_tool_call(
        self, 
        session_id: str, 
        tool: str, 
        args: dict, 
        result: str
    ):
        self._write("tool_call", {
            "session_id": session_id,
            "tool": tool,
            "args": args,
            "result_preview": result[:200],
            "timestamp": datetime.now().isoformat()
        })
    
    def log_response(self, session_id: str, response: str):
        self._write("response", {
            "session_id": session_id,
            "response_preview": response[:200],
            "timestamp": datetime.now().isoformat()
        })
    
    def _write(self, event_type: str, data: dict):
        line = json.dumps({"event": event_type, **data})
        self.logger.info(line)
```

### 10.3 Tracing

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

class TracedAgent:
    def __init__(self, agent):
        self.agent = agent
    
    async def run(self, message: str):
        with tracer.start_as_current_span("agent.run") as span:
            span.set_attribute("user.message", message)
            
            # Trace model calls
            with tracer.start_as_current_span("model.call"):
                result = await self.agent.run(message)
            
            span.set_attribute("result", result[:100])
            return result
```

### 10.4 Alerting

```python
# Alert rules
ALERTS = {
    "high_error_rate": {
        "condition": "error_rate > 0.1",
        "window": "5m",
        "severity": "critical"
    },
    "high_latency": {
        "condition": "p95_latency > 30s",
        "window": "10m",
        "severity": "warning"
    },
    "loop_detected": {
        "condition": "iterations > 50",
        "window": "1m",
        "severity": "warning"
    }
}
```

---

<a name="patterns"></a>
## 11. Common Implementation Patterns

This section catalogs common patterns seen in production systems.

### 11.1 The Initializer Pattern

```python
class InitializerAgent:
    """First session agent that sets up environment"""
    
    def run(self, user_request: str) -> dict:
        # Create feature list
        features = self._create_feature_list(user_request)
        
        # Create project structure
        self._setup_structure()
        
        # Write feature file
        self._write_feature_file(features)
        
        return {
            "initialized": True,
            "features": features
        }
```

### 11.2 The Resume Pattern

```python
class ResumeAgent:
    """Subsequent session agent that resumes work"""
    
    def run(self) -> dict:
        # Get up to speed
        self._read_git_history()
        self._read_progress_file()
        self._read_feature_list()
        
        # Pick next task
        task = self._get_next_task()
        
        # Execute
        return await self._execute(task)
```

### 11.3 The Sub-Agent Pattern

```python
class SubAgentDispatcher:
    """Dispatch work to sub-agents"""
    
    def __init__(self, agent_factory):
        self.agent_factory = agent_factory
    
    async def dispatch(self, task: str, context: dict) -> str:
        # Create sub-agent
        agent = self.agent_factory.create_sub_agent(
            parent_context=context
        )
        
        # Run with limited context
        result = await agent.run(task)
        
        # Summarize result
        return self._summarize(result)
```

### 11.4 The Checkpoint Pattern

```python
class CheckpointManager:
    """Save and restore agent state"""
    
    def checkpoint(self, session: Session, label: str):
        checkpoint = {
            "session": session,
            "label": label,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save to disk
        path = f"checkpoints/{session.id}/{label}.pkl"
        with open(path, 'wb') as f:
            pickle.dump(checkpoint, f)
        
        return path
    
    def restore(self, path: str) -> Session:
        with open(path, 'rb') as f:
            checkpoint = pickle.load(f)
        return checkpoint["session"]
```

---

<a name="case-studies"></a>
## 12. Case Studies: Building Specific Features

### 12.1 Building a Code Review Agent

```python
class CodeReviewAgent:
    """Agent specialized for code review"""
    
    def __init__(self):
        self.tools = ToolRegistry()
        self._register_review_tools()
    
    def _register_review_tools(self):
        self.tools.register(
            "get_diff",
            self._get_diff,
            "Get git diff for review",
            {"target": {"type": "string"}}
        )
        
        self.tools.register(
            "get_file_history",
            self._get_file_history,
            "Get commit history for a file",
            {"file": {"type": "string"}}
        )
    
    async def review(self, diff: str) -> dict:
        # Analyze diff
        issues = await self._analyze_diff(diff)
        
        # Categorize issues
        severity_issues = self._categorize_by_severity(issues)
        
        return {
            "summary": len(issues),
            "critical": severity_issues.get("critical", []),
            "warnings": severity_issues.get("warning", []),
            "suggestions": severity_issues.get("suggestion", [])
        }
```

### 12.2 Building a Database Agent

```python
class DatabaseAgent:
    """Agent specialized for database operations"""
    
    def __init__(self, connection_pool):
        self.pool = connection_pool
        self.tools = ToolRegistry()
        self._register_db_tools()
    
    def _register_db_tools(self):
        self.tools.register(
            "query",
            self._execute_query,
            "Execute SQL query",
            {"sql": {"type": "string"}, "params": {"type": "array"}}
        )
        
        self.tools.register(
            "schema",
            self._get_schema,
            "Get database schema",
            {"table": {"type": "string"}}
        )
```

### 12.3 Building a Research Agent

```python
class ResearchAgent:
    """Agent specialized for research tasks"""
    
    def __init__(self):
        self.tools = ToolRegistry()
        self._register_research_tools()
    
    def _register_research_tools(self):
        self.tools.register(
            "web_search",
            self._web_search,
            "Search the web",
            {"query": {"type": "string"}, "num_results": {"type": "integer"}}
        )
        
        self.tools.register(
            "fetch_url",
            self._fetch_url,
            "Fetch content from URL",
            {"url": {"type": "string"}}
        )
        
        self.tools.register(
            "save_note",
            self._save_note,
            "Save research note",
            {"title": {"type": "string"}, "content": {"type": "string"}}
        )
    
    async def research(self, topic: str) -> dict:
        # Search for initial information
        results = await self._web_search(topic, num_results=10)
        
        # Fetch relevant pages
        findings = []
        for result in results[:5]:
            content = await self._fetch_url(result["url"])
            findings.append(self._extract_key_info(content))
        
        # Synthesize findings
        synthesis = await self._synthesize(findings)
        
        return {
            "topic": topic,
            "findings": findings,
            "synthesis": synthesis
        }
```

---

## Conclusion

Implementing agent systems requires combining multiple components: tool infrastructure, context management, memory systems, planning capabilities, and robust execution loops. The patterns and code examples in this guide provide a foundation for building production systems.

Key takeaways:

1. **Start Simple**: The minimal agent pattern is surprisingly powerful
2. **Tools are Critical**: Invest heavily in tool design
3. **Context is King**: Manage context carefully
4. **Plan and Verify**: Implement explicit planning and verification
5. **Test Thoroughly**: Agents have many failure modes; test for them
6. **Monitor Everything**: You can't improve what you don't measure

The implementation landscape continues to evolve. Stay current with model capabilities, and adapt your implementations accordingly.

---

*Part 3 of the Comprehensive Guide to Agent Harnesses. See also: Fundamentals and Context Engineering, Architecture Deep Dive, and Performance and Optimization.*


---


# Performance and Optimization for Agent Systems

*A Comprehensive Technical Guide*

---

## Table of Contents

1. [Performance Fundamentals](#fundamentals)
2. [Benchmarking and Measurement](#benchmarking)
3. [Token Optimization](#tokens)
4. [Latency Optimization](#latency)
5. [Accuracy Optimization](#accuracy)
6. [Resource Optimization](#resources)
7. [Cost Optimization](#cost)
8. [Reliability and Error Handling](#reliability)
9. [Scaling Strategies](#scaling)
10. [Production Considerations](#production)
11. [Common Performance Issues and Solutions](#issues)
12. [Case Studies from Production Systems](#case-studies)

---

<a name="fundamentals"></a>
## 1. Performance Fundamentals

Understanding agent performance requires understanding the unique characteristics of agent workloads.

### 1.1 What Makes Agent Performance Unique

Agent performance differs from traditional software in several ways:

**Non-Deterministic Behavior**: Agents can produce different outputs for the same inputs, making performance measurement challenging.

**Multi-Stage Execution**: A single agent request can involve dozens of tool calls, each with different performance characteristics.

**Context Dependency**: Performance depends heavily on what information is in context, not just the request.

**Iterative Nature**: Agents often improve their outputs through iteration, so first-attempt metrics can be misleading.

### 1.2 Key Performance Metrics

#### 1.2.1 Task Completion Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Pass Rate** | Percentage of tasks completed successfully | >80% |
| **Partial Success** | Tasks completed with issues | Track separately |
| **Failure Rate** | Tasks that failed completely | <5% |
| **Time to Complete** | Total time from start to finish | Varies by task |

#### 1.2.2 Efficiency Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Token Usage** | Total tokens consumed per task | Minimize |
| **Tool Calls** | Number of tool calls per task | Minimize while succeeding |
| **Iterations** | Number of model calls per task | Minimize |
| **Latency** | Time per model call | Minimize |

#### 1.2.3 Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Code Retention** | % of agent code that remains in codebase | >80% |
| **User Satisfaction** | User ratings and feedback | >4/5 |
| **Follow-up Rate** | User needs to repeat or clarify | <20% |
| **Error Rate** | Errors requiring intervention | <5% |

### 1.3 The Performance Triangle

Agent performance involves trade-offs between:

1. **Accuracy**: How correct/complete are the results?
2. **Speed**: How fast does the agent respond?
3. **Cost**: How much does each request cost?

Often, improving one dimension requires sacrificing another. For example:
- More reasoning (higher accuracy) → more tokens → higher cost
- More tool calls (better results) → higher latency
- Larger context (better context) → higher cost and latency

Understanding these trade-offs is crucial for making optimization decisions.

### 1.4 Performance Measurement Challenges

**Variance**: Agent behavior can vary significantly between runs. Measure over many samples.

**Confounding Factors**: Context, prompt wording, and model version all affect performance.

**Ground Truth**: Many agent tasks don't have clear correct answers, making accuracy measurement difficult.

**Long Tails**: Most requests may perform well, but edge cases can dominate latency.

---

<a name="benchmarking"></a>
## 2. Benchmarking and Measurement

Effective optimization requires effective measurement.

### 2.1 Building a Benchmark Suite

A good benchmark suite includes:

#### 2.1.1 Task-Based Benchmarks

Define specific tasks with expected outcomes:

```python
BENCHMARK_TASKS = [
    {
        "id": "read_file",
        "description": "Read a specific file",
        "expected": "File content returned",
        "setup": lambda: create_test_file()
    },
    {
        "id": "search_code",
        "description": "Find function definition",
        "expected": "Correct file and line number",
        "setup": lambda: create_test_codebase()
    },
    {
        "id": "fix_bug",
        "description": "Fix a specific bug",
        "expected": "Tests pass after fix",
        "setup": lambda: create_buggy_code()
    }
]
```

#### 2.1.2 Automated Evaluation

```python
class BenchmarkRunner:
    def __init__(self, agent, evaluator):
        self.agent = agent
        self.evaluator = evaluator
    
    async def run_benchmark(self, tasks: list) -> dict:
        results = []
        
        for task in tasks:
            # Setup
            await task["setup"]()
            
            # Run
            result = await self.agent.run(task["description"])
            
            # Evaluate
            passed = self.evaluator.evaluate(result, task["expected"])
            
            results.append({
                "task_id": task["id"],
                "passed": passed,
                "result": result,
                "metrics": self.agent.get_metrics()
            })
        
        return self._aggregate_results(results)
```

### 2.2 Industry Benchmarks

Several industry benchmarks exist for agent systems:

#### 2.2.1 SWE-bench

- **Purpose**: Software engineering task evaluation
- **Tasks**: Real GitHub issues from popular projects
- **Metric**: Pass@1 rate (correct solution on first attempt)
- **Current Best**: ~12.5% (SWE-agent)

#### 2.2.2 HumanEvalFix

- **Purpose**: Code debugging
- **Tasks**: buggy code that needs fixing
- **Metric**: Pass@1 rate
- **Current Best**: ~87.7% (SWE-agent)

#### 2.2.3 Terminal Bench 2.0

- **Purpose**: CLI task evaluation
- **Tasks**: 89 tasks across domains
- **Metric**: Pass rate
- **LangChain Results**: Top 30 → Top 5 with harness changes

#### 2.2.4 Cursor Context Bench

- **Purpose**: Information retrieval in codebases
- **Tasks**: Finding specific code in known locations
- **Metric**: Retrieval accuracy

### 2.3 Offline vs. Online Evaluation

#### 2.3.1 Offline Evaluation

**Advantages**:
- Fast iteration
- Reproducible
- No user impact
- Easy to automate

**Disadvantages**:
- May not capture real-world complexity
- Can be gamed

**Implementation**:
```python
async def offline_evaluation(agent, benchmark):
    """Run offline evaluation"""
    results = []
    
    for task in benchmark.tasks:
        result = await agent.run(task.input)
        results.append(compare(result, task.expected))
    
    return aggregate(results)
```

#### 2.3.2 Online Evaluation (A/B Testing)

**Advantages**:
- Measures real-world impact
- Captures user satisfaction
- Tests in production conditions

**Disadvantages**:
- Slower
- Risk to users
- Complex to set up

**Implementation**:
```python
async def ab_test(agent_a, agent_b, traffic_split=0.5):
    """A/B test two agent configurations"""
    results = {"a": [], "b": []}
    
    for request in incoming_requests:
        # Randomly assign
        agent = agent_a if random.random() < traffic_split else agent_b
        result = await agent.run(request)
        
        results[agent.id].append(measure(result))
    
    return compare(results["a"], results["b"])
```

### 2.4 Cursor's Dual Approach

Cursor maintains both:
- **Offline Benchmarks**: For rapid iteration
- **Online A/B Tests**: For validation

This provides the best of both worlds.

---

<a name="tokens"></a>
## 3. Token Optimization

Tokens are the fundamental unit of agent cost and context management.

### 3.1 Token Usage Patterns

Understanding where tokens go:

| Source | Typical % | Optimization Potential |
|--------|-----------|----------------------|
| System Prompt | 5-15% | High |
| Retrieved Context | 30-60% | Very High |
| Tool Results | 10-30% | Medium |
| Conversation History | 10-30% | High |
| Model Output | 5-15% | Low |

### 3.2 Token Reduction Strategies

#### 3.2.1 Context Optimization

**Cursor's MCP Optimization Results**:
- 46.9% reduction in total agent tokens
- Simple change: dynamic tool loading instead of static

**Implementation**:
```python
class OptimizedMCPClient:
    def __init__(self, mcp_server):
        self.server = mcp_server
        self.tool_descriptions = {}  # Lazy loaded
    
    def get_tool_schemas(self):
        # Return minimal info initially
        return [
            {
                "name": name,
                "description": "Click to load details"
            }
            for name in self.server.list_tools()
        ]
    
    async def load_tool_details(self, tool_name):
        # Load full details on demand
        if tool_name not in self.tool_descriptions:
            self.tool_descriptions[tool_name] = (
                await self.server.get_tool_schema(tool_name)
            )
        return self.tool_descriptions[tool_name]
```

#### 3.2.2 Retrieval Optimization

**Strategies**:

1. **Query Rewriting**: Make queries more precise
2. **Result Truncation**: Limit retrieved content
3. **Ranking**: Prioritize most relevant
4. **Hybrid Search**: Combine semantic and keyword

```python
class OptimizedRetriever:
    def __init__(self, vector_store, keyword_index):
        self.vector = vector_store
        self.keyword = keyword_index
    
    async def search(self, query, max_tokens=5000):
        # Get both types of results
        semantic_results = await self.vector.search(query, top_k=10)
        keyword_results = await self.keyword.search(query, top_k=10)
        
        # Merge and rerank
        merged = self._merge_results(semantic_results, keyword_results)
        
        # Add results until token limit
        selected = []
        token_count = 0
        for result in merged:
            result_tokens = count_tokens(result.content)
            if token_count + result_tokens > max_tokens:
                break
            selected.append(result)
            token_count += result_tokens
        
        return selected
```

#### 3.2.3 History Compression

**Strategies**:

1. **Summarization**: Compress old messages
2. **Selective Retention**: Keep only important messages
3. **Compaction**: Remove redundant information

```python
class HistoryCompressor:
    def __init__(self, model):
        self.model = model
    
    async def compress(self, messages, keep_recent=10):
        # Keep recent messages raw
        recent = messages[-keep_recent:]
        old = messages[:-keep_recent]
        
        if not old:
            return messages
        
        # Summarize old messages
        summary = await self._summarize(old)
        
        # Create compressed history
        return [
            {"role": "system", "content": f"Summary: {summary}"}
        ] + recent
    
    async def _summarize(self, messages):
        prompt = f"""Summarize this conversation concisely:
        
{format_messages(messages)}

Summary:"""
        
        result = await self.model.chat([{"role": "user", "content": prompt}])
        return result.content
```

### 3.3 Token Budgeting

Implement token budgets to prevent runaway usage:

```python
class TokenBudget:
    def __init__(self, max_tokens, warn_at=0.8):
        self.max_tokens = max_tokens
        self.warn_at = warn_at
        self.used = 0
    
    def allocate(self, tokens):
        if self.used + tokens > self.max_tokens:
            raise TokenLimitExceeded()
        self.used += tokens
    
    def warn(self):
        if self.used > self.max_tokens * self.warn_at:
            return f"Warning: {100*(self.used/self.max_tokens):.0f}% tokens used"
        return None
```

---

<a name="latency"></a>
## 4. Latency Optimization

Latency affects user experience and throughput.

### 4.1 Sources of Latency

| Source | Typical Range | Mitigation |
|--------|--------------|------------|
| Model Inference | 0.5-30s | Faster models, caching |
| Tool Execution | 0.1-60s | Async, optimize tools |
| Retrieval | 0.1-5s | Caching, pre-fetching |
| Context Processing | 0.1-2s | Efficient encoding |

### 4.2 Model Selection for Latency

**Trade-offs**:

| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| Haiku | Fastest | Lower | Lowest |
| Sonnet | Medium | Medium | Medium |
| Opus | Slow | Highest | Highest |

**Strategy**: Use fast models for simple tasks, slow models for complex ones.

```python
class AdaptiveModelSelector:
    def __init__(self, models):
        self.models = models  # {"fast": model, "smart": model}
    
    async def select(self, task_complexity):
        # Simple heuristic
        if task_complexity < 0.3:
            return self.models["fast"]
        elif task_complexity < 0.7:
            return self.models["sonnet"]
        else:
            return self.models["smart"]
    
    def estimate_complexity(self, task):
        # Use task characteristics
        length = len(task)
        has_technical_terms = any(t in task for t in ["debug", "implement", "fix"])
        return min(1.0, length / 1000 + (0.3 if has_technical_terms else 0))
```

### 4.3 Parallelization

#### 4.3.1 Parallel Tool Execution

```python
async def execute_tools_parallel(tools):
    """Execute multiple tools concurrently"""
    tasks = [tool.execute() for tool in tools]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

#### 4.3.2 Speculative Execution

```python
class SpeculativeExecutor:
    def __init__(self, agent):
        self.agent = agent
    
    async def run_with_speculation(self, task):
        # Start main execution
        main_task = asyncio.create_task(self.agent.run(task))
        
        # Speculate next steps while running
        speculation = asyncio.create_task(self._speculate(task))
        
        # Wait for main
        result = await main_task
        
        # Optionally incorporate speculation
        return result
    
    async def _speculate(self, task):
        # Think ahead
        return await self.agent.think_ahead(task)
```

### 4.4 Caching

#### 4.4.1 Response Caching

```python
import hashlib
import json
from functools import lru_cache

class CachedModelClient:
    def __init__(self, model, cache):
        self.model = model
        self.cache = cache
    
    def _cache_key(self, messages):
        """Generate cache key from messages"""
        content = json.dumps(messages, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()
    
    async def chat(self, messages):
        key = self._cache_key(messages)
        
        # Check cache
        cached = await self.cache.get(key)
        if cached:
            return cached
        
        # Call model
        result = await self.model.chat(messages)
        
        # Cache result
        await self.cache.set(key, result, ttl=3600)
        
        return result
```

#### 4.4.2 Retrieval Caching

```python
class CachedRetriever:
    def __init__(self, retriever, cache):
        self.retriever = retriever
        self.cache = cache
    
    async def retrieve(self, query):
        # Check cache
        cached = await self.cache.get(query)
        if cached:
            return cached
        
        # Retrieve
        results = await self.retriever.retrieve(query)
        
        # Cache
        await self.cache.set(query, results)
        
        return results
```

### 4.5 Pre-fetching

```python
class PrefetchContextLoader:
    def __init__(self, agent, retriever):
        self.agent = agent
        self.retriever = retriever
    
    async def run_with_prefetch(self, task):
        # Identify likely needs
        likely_needs = self._predict_context_needs(task)
        
        # Pre-fetch in background
        prefetch_task = asyncio.create_task(
            self._prefetch(likely_needs)
        )
        
        # Run agent
        result = await self.agent.run(task)
        
        # Wait for prefetch to complete
        prefetched = await prefetch_task
        
        # Merge if needed
        return result
    
    async def _prefetch(self, needs):
        tasks = [self.retriever.retrieve(need) for need in needs]
        return await asyncio.gather(*tasks)
```

---

<a name="accuracy"></a>
## 5. Accuracy Optimization

Improving agent accuracy requires understanding failure modes.

### 5.1 Accuracy Killers

Common causes of agent errors:

| Issue | Frequency | Solution |
|-------|-----------|----------|
| Wrong tool selection | 20-30% | Better tool definitions |
| Parameter errors | 15-25% | Validation, defaults |
| Context confusion | 15-20% | Better context management |
| Premature completion | 10-15% | Verification prompts |
| Reasoning errors | 10-20% | Better prompts, models |

### 5.2 Tool Selection Optimization

#### 5.2.1 Better Tool Definitions

**From SWE-agent**: "Small changes in how tools are defined and presented can lead to large differences in agent success rates."

**Improvement Strategies**:

1. **Clearer Descriptions**: What does the tool do?
2. **Parameter Examples**: What do valid inputs look like?
3. **Edge Case Handling**: What happens with bad inputs?

```python
def improved_tool_schema():
    return {
        "name": "edit_file",
        "description": "Edit a file by replacing specific text. "
                      "Use for targeted changes to existing files. "
                      "Not for large rewrites (use write_file instead).",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Absolute path to file, e.g., /home/user/project/main.py"
                },
                "old_string": {
                    "type": "string",
                    "description": "Exact text to find. Must match exactly including whitespace. "
                                  "Example: 'def hello():\n    return \"world\"'"
                },
                "new_string": {
                    "type": "string", 
                    "description": "Replacement text. Empty to delete. "
                                  "Example: 'def hello():\n    return \"hello world\"'"
                }
            },
            "required": ["file_path", "old_string"]
        }
    }
```

#### 5.2.2 Tool Selection Hints

```python
def create_tool_selection_guide():
    return """
    ## Tool Selection Guide
    
    Use **read_file** when:
    - You need to see what's in a file
    - You're exploring code
    - Before making edits
    
    Use **edit_file** when:
    - Making small, targeted changes
    - You know exactly what to change
    - Replacing specific text
    
    Use **write_file** when:
    - Creating new files
    - Making large rewrites
    - The file doesn't exist
    
    Use **bash** when:
    - Running commands
    - Executing tests
    - File operations not covered by other tools
    """
```

### 5.3 Verification Patterns

LangChain found that adding explicit verification dramatically improved results:

```python
VERIFICATION_PROMPT = """
After completing your work, verify:

1. **Task Completion**: Does your solution address what was asked?
2. **Code Quality**: Are there any syntax errors or issues?
3. **Testing**: Did you run tests? Do they pass?
4. **Edge Cases**: Did you handle obvious edge cases?

If you find issues, fix them before responding that you're done.
"""

class VerifyingAgent:
    async def run_with_verification(self, task):
        # Do work
        result = await self.agent.run(task)
        
        # Verify
        issues = await self.verify(result, task)
        
        if issues:
            # Fix issues
            for issue in issues:
                await self.fix(issue)
            
            # Re-verify
            issues = await self.verify(result, task)
        
        return result
```

### 5.4 Reasoning Mode Selection

Different reasoning modes for different phases:

| Phase | Recommended Mode | Rationale |
|-------|------------------|-----------|
| Planning | xhigh | Need thorough reasoning |
| Implementation | high | Balance speed/quality |
| Verification | xhigh | Need attention to detail |
| Simple Tasks | low | Don't waste resources |

LangChain's "reasoning sandwich": xhigh → high → xhigh

```python
class ReasoningModeSelector:
    def select_mode(self, phase, task_complexity):
        if phase == "planning":
            return "xhigh"
        elif phase == "execution":
            return "high" if task_complexity > 0.5 else "medium"
        elif phase == "verification":
            return "xhigh"
        else:
            return "medium"
```

---

<a name="resources"></a>
## 6. Resource Optimization

Managing compute and memory resources efficiently.

### 6.1 Memory Management

#### 6.1.1 Context Memory

```python
class EfficientContextManager:
    def __init__(self, max_tokens):
        self.max_tokens = max_tokens
        self.messages = []
        self.token_counts = []
    
    def add_message(self, role, content):
        tokens = estimate_tokens(content)
        
        # Check if we need to truncate
        while sum(self.token_counts) + tokens > self.max_tokens:
            # Remove oldest non-system message
            for i, msg in enumerate(self.messages):
                if msg["role"] != "system":
                    removed = self.messages.pop(i)
                    removed_tokens = self.token_counts.pop(i)
                    break
        
        self.messages.append({"role": role, "content": content})
        self.token_counts.append(tokens)
```

#### 6.1.2 Tool Result Handling

```python
class TruncatedToolResults:
    MAX_RESULT_TOKENS = 2000
    
    def execute_and_truncate(self, tool, args):
        result = tool.execute(args)
        
        # Truncate long results
        tokens = count_tokens(result)
        if tokens > self.MAX_RESULT_TOKENS:
            result = self._truncate(result, self.MAX_RESULT_TOKENS)
            result += f"\n\n[Result truncated from {tokens} to {self.MAX_RESULT_TOKENS} tokens]"
        
        return result
    
    def _truncate(self, text, max_tokens):
        # Find approximate truncation point
        lines = text.split('\n')
        truncated = []
        token_count = 0
        
        for line in lines:
            line_tokens = count_tokens(line)
            if token_count + line_tokens > max_tokens:
                break
            truncated.append(line)
            token_count += line_tokens
        
        return '\n'.join(truncated)
```

### 6.2 CPU Optimization

#### 6.2.1 Async Tool Execution

```python
async def execute_tools_efficiently(tools):
    # Group by whether they're I/O bound or CPU bound
    io_tools = [t for t in tools if t.is_io_bound()]
    cpu_tools = [t for t in tools if not t.is_io_bound()]
    
    # Execute I/O in parallel
    io_results = await asyncio.gather(
        *[t.execute() for t in io_tools],
        return_exceptions=True
    )
    
    # Execute CPU sequentially (or with limited parallelism)
    cpu_results = []
    for tool in cpu_tools:
        cpu_results.append(await tool.execute())
    
    return io_results + cpu_results
```

### 6.3 Network Optimization

#### 6.3.1 Connection Pooling

```python
class PooledHTTPClient:
    def __init__(self, max_connections=10):
        self.session = aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(limit=max_connections)
        )
    
    async def fetch(self, url):
        async with self.session.get(url) as response:
            return await response.text()
```

---

<a name="cost"></a>
## 7. Cost Optimization

Managing the cost of running agent systems.

### 7.1 Cost Components

| Component | Typical % | Optimization |
|-----------|----------|--------------|
| Model API | 60-80% | Model selection, caching |
| Compute | 10-20% | Efficient code |
| Storage | 5-10% | Caching, cleanup |
| Networking | 5-10% | Batching, compression |

### 7.2 Model Cost Optimization

| Model | Input $/1K tokens | Output $/1K tokens | Relative Cost |
|-------|-------------------|--------------------|----------------|
| Haiku | $0.035 | $0.035 | 1x |
| Sonnet | $0.15 | $0.60 | ~15x |
| Opus | $0.75 | $3.00 | ~75x |

**Strategy**: Route tasks to cheapest model that can handle them.

```python
class CostOptimizedAgent:
    def __init__(self, models):
        self.models = models  # {"cheap": model, "expensive": model}
    
    async def run(self, task):
        # Quick tasks: cheap model
        if self._is_simple_task(task):
            return await self.models["cheap"].run(task)
        
        # Complex: try cheap, escalate if needed
        result = await self.models["cheap"].run(task)
        
        if not self._is_satisfactory(result):
            result = await self.models["expensive"].run(task)
        
        return result
    
    def _is_simple_task(self, task):
        return len(task) < 100 and not any(
            k in task.lower() for k in ["complex", "debug", "implement"]
        )
    
    def _is_satisfactory(self, result):
        # Check quality bar
        return "error" not in result.lower()[:100]
```

### 7.3 Token Cost Optimization

```python
class TokenBudgetTracker:
    def __init__(self):
        self.total_input = 0
        self.total_output = 0
    
    def track(self, input_tokens, output_tokens):
        self.total_input += input_tokens
        self.total_output += output_tokens
    
    def cost(self, input_rate, output_rate):
        return (
            self.total_input / 1000 * input_rate +
            self.total_output / 1000 * output_rate
        )
    
    def report(self):
        return {
            "total_tokens": self.total_input + self.total_output,
            "input_tokens": self.total_input,
            "output_tokens": self.total_output,
            "estimated_cost": self.cost(0.15, 0.60)  # Example rates
        }
```

---

<a name="reliability"></a>
## 8. Reliability and Error Handling

Building robust agents that handle failures gracefully.

### 8.1 Failure Modes

| Mode | Detection | Mitigation |
|------|-----------|------------|
| Infinite Loop | Track iterations | Max iteration limits |
| Tool Failure | Error response | Retry, fallback |
| Context Overflow | Token limit | Compaction |
| Model Failure | API error | Retry, alternative |
| Premature Exit | No completion check | Verification |

### 8.2 Retry Patterns

```python
class RetryableAgent:
    def __init__(self, agent, max_retries=3):
        self.agent = agent
        self.max_retries = max_retries
    
    async def run_with_retry(self, task):
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await self.agent.run(task)
            except RateLimitError:
                # Wait and retry
                await asyncio.sleep(2 ** attempt)
            except TemporaryError as e:
                last_error = e
                # Try different approach
                task = self._modify_task(task)
            except PermanentError:
                raise
        
        raise last_error
```

### 8.3 Circuit Breaker

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failures = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.state = "closed"  # closed, open, half-open
    
    async def call(self, func):
        if self.state == "open":
            if time.time() > self.last_failure + self.timeout:
                self.state = "half-open"
            else:
                raise CircuitOpenError()
        
        try:
            result = await func()
            if self.state == "half-open":
                self.state = "closed"
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure = time.time()
            
            if self.failures >= self.failure_threshold:
                self.state = "open"
            
            raise
```

### 8.4 Graceful Degradation

```python
class DegradingAgent:
    def __init__(self, primary, fallback):
        self.primary = primary
        self.fallback = fallback
    
    async def run(self, task):
        try:
            # Try primary
            return await self.primary.run(task)
        except Exception as e:
            # Log failure
            logger.warning(f"Primary failed: {e}, trying fallback")
            
            try:
                # Try fallback
                return await self.fallback.run(task)
            except Exception as e2:
                # Both failed
                logger.error(f"Fallback also failed: {e2}")
                raise
```

---

<a name="scaling"></a>
## 9. Scaling Strategies

Handling increased load and complexity.

### 9.1 Horizontal Scaling

#### 9.1.1 Load Balancing

```python
class LoadBalancedAgents:
    def __init__(self, agents):
        self.agents = agents
        self.current = 0
    
    async def run(self, task):
        # Round-robin or least-loaded
        agent = self.agents[self.current]
        self.current = (self.current + 1) % len(self.agents)
        return await agent.run(task)
```

#### 9.1.2 Stateless Design

```python
class StatelessAgent:
    def __init__(self, model, tools):
        self.model = model
        self.tools = tools
        # No session state here
    
    async def run(self, task, session_state):
        # All state passed in
        context = session_state.get_context()
        
        # Process
        result = await self._process(task, context)
        
        # Return result and updated state
        return result
```

### 9.2 Vertical Scaling

**Strategy**: Use larger models for complex tasks

```python
class ScalingAgent:
    def __init__(self, small_model, large_model):
        self.small = small_model
        self.large = large_model
    
    async def run(self, task):
        # Estimate complexity
        complexity = self._estimate_complexity(task)
        
        # Select model
        if complexity > 0.7:
            return await self.large.run(task)
        else:
            return await self.small.run(task)
```

### 9.3 Caching at Scale

```python
class DistributedCache:
    def __init__(self, redis_url):
        self.redis = await aioredis.create_redis_pool(redis_url)
    
    async def get(self, key):
        return await self.redis.get(key)
    
    async def set(self, key, value, ttl=3600):
        await self.redis.setex(key, ttl, value)
    
    async def delete(self, key):
        await self.redis.delete(key)
```

---

<a name="production"></a>
## 10. Production Considerations

Running agents in production requires additional capabilities.

### 10.1 Monitoring

#### 10.1.1 Key Metrics

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
requests_total = Counter('agent_requests_total', 'Total requests', ['status'])
request_duration = Histogram('agent_request_duration_seconds', 'Request duration')

# Token metrics
tokens_used = Counter('agent_tokens_used_total', 'Tokens used', ['type'])

# Quality metrics  
task_success = Counter('agent_task_success_total', 'Task success', ['task_type'])
task_failure = Counter('agent_task_failure_total', 'Task failure', ['task_type', 'error_type'])

# Resource metrics
active_sessions = Gauge('agent_active_sessions', 'Active sessions')
queue_depth = Gauge('agent_queue_depth', 'Pending requests')
```

#### 10.1.2 Logging

```python
class StructuredLogger:
    def __init__(self, logger):
        self.logger = logger
    
    def log_request(self, session_id, request, metadata=None):
        self.logger.info(
            "agent_request",
            session_id=session_id,
            request=request[:100],
            metadata=metadata or {}
        )
    
    def log_tool_call(self, session_id, tool, args, result_preview):
        self.logger.info(
            "tool_call",
            session_id=session_id,
            tool=tool,
            args_sanitized=sanitize(args),
            result_preview=result_preview[:200]
        )
    
    def log_error(self, session_id, error, context=None):
        self.logger.error(
            "agent_error",
            session_id=session_id,
            error=str(error),
            context=context or {}
        )
```

### 10.2 Alerting

```python
ALERT_CONFIGS = {
    "high_error_rate": {
        "metric": "rate(agent_task_failure_total[5m])",
        "threshold": 0.1,
        "severity": "critical",
        "action": "page_oncall"
    },
    "high_latency": {
        "metric": "histogram_quantile(0.95, agent_request_duration_seconds)",
        "threshold": 30,
        "severity": "warning",
        "action": "create_ticket"
    },
    "cost_spike": {
        "metric": "rate(agent_tokens_used_total[1h])",
        "threshold": 1.5,  # 50% increase
        "severity": "warning",
        "action": "notify_team"
    }
}
```

### 10.3 Capacity Planning

```python
class CapacityPlanner:
    def __init__(self, metrics_client):
        self.metrics = metrics_client
    
    async def get_recommendations(self):
        # Get current utilization
        current_rps = await self.metrics.get("requests_per_second")
        avg_latency = await self.metrics.get("avg_request_duration")
        error_rate = await self.metrics.get("error_rate")
        
        # Calculate headroom
        capacity = current_rps * (1 / avg_latency)
        utilization = current_rps / capacity
        
        recommendations = []
        
        if utilization > 0.8:
            recommendations.append({
                "action": "scale_up",
                "reason": f"Utilization at {utilization:.0%}",
                "suggested": int(capacity * 1.5)
            })
        
        if error_rate > 0.05:
            recommendations.append({
                "action": "investigate_errors",
                "reason": f"Error rate at {error_rate:.1%}"
            })
        
        return recommendations
```

---

<a name="issues"></a>
## 11. Common Performance Issues and Solutions

### 11.1 Issue: High Token Usage

**Symptoms**:
- Costs much higher than expected
- Slow responses

**Causes**:
- Too much context loaded
- Inefficient tool result handling
- No history compression

**Solutions**:
```python
# 1. Check context loading
def audit_context_usage():
    # Log what's in context
    return {
        "system_prompt": len(system_prompt),
        "retrieved": sum(len(r) for r in retrieved),
        "history": sum(len(h) for h in history),
        "total": total
    }

# 2. Implement compaction
async def compact_context_if_needed(context, threshold=0.8):
    if context.usage > threshold:
        await context.compact()
```

### 11.2 Issue: High Latency

**Symptoms**:
- Users wait long times
- Low throughput

**Causes**:
- Slow model
- Sequential tool execution
- No caching
- Large context

**Solutions**:
```python
# 1. Profile where time is spent
async def profile_request():
    start = time.time()
    
    # Time each phase
    retrieval = time.time()
    await retrieve()
    retrieval_time = time.time() - retrieval
    
    model = time.time()
    await model_call()
    model_time = time.time() - model
    
    return {"retrieval": retrieval_time, "model": model_time}

# 2. Parallelize where possible
async def parallel_run(task):
    # Start retrieval in parallel with planning
    retrieval = asyncio.create_task(retrieve_context(task))
    planning = asyncio.create_task(plan_approach(task))
    
    context = await retrieval
    plan = await planning
    
    return await execute(plan, context)
```

### 11.3 Issue: Low Accuracy

**Symptoms**:
- Tasks fail
- Users need to correct agent

**Causes**:
- Poor tool definitions
- Not enough context
- No verification
- Wrong model

**Solutions**:
```python
# 1. Add verification step
async def verify_and_fix(task, result):
    issues = await check_solution(task, result)
    
    if issues:
        for issue in issues:
            result = await fix(result, issue)
        
        # Re-verify
        issues = await check_solution(task, result)
    
    return result

# 2. Improve tool definitions
def improve_tool_definitions():
    # Add examples, clearer descriptions
    return enhanced_schemas
```

### 11.4 Issue: High Failure Rate

**Symptoms**:
- Many tasks fail
- Unpredictable behavior

**Causes**:
- No error handling
- No retry logic
- Poor prompts

**Solutions**:
```python
# 1. Add retry logic
async def run_with_retry(task, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await agent.run(task)
        except RetryableError:
            if attempt == max_retries - 1:
                raise
        
        # Exponential backoff
        await asyncio.sleep(2 ** attempt)

# 2. Better error handling
async def run_with_fallback(task):
    try:
        return await primary_agent.run(task)
    except Exception as e:
        logger.error(f"Primary failed: {e}")
        
        try:
            return await fallback_agent.run(task)
        except Exception as e2:
            logger.error(f"Fallback also failed: {e2}")
            raise
```

---

<a name="case-studies"></a>
## 12. Case Studies from Production Systems

### 12.1 LangChain: Terminal Bench Journey

**Problem**: LangChain's coding agent was ranked Top 30 on Terminal Bench 2.0.

**Changes Made**:
- Added Build & Self-Verify to prompts
- Improved environment context
- Added loop detection middleware
- Optimized reasoning mode selection

**Result**: Reached Top 5—all through harness changes, not model changes.

**Key Insight**: "We only changed the harness, not the model."

### 12.2 Cursor: Semantic Search Impact

**Problem**: Needed to improve code understanding in large codebases.

**Solution**: Added semantic search alongside grep.

**Results**:
- 12.5% higher accuracy in answering questions
- 2.6% improvement in code retention on large codebases
- 2.2% decrease in dissatisfied follow-ups

**Key Insight**: Semantic + keyword search is better than either alone.

### 12.3 Cursor: MCP Token Reduction

**Problem**: MCP tools were bloating context with full descriptions.

**Solution**: Dynamic tool loading—only fetch details when needed.

**Results**:
- 46.9% reduction in total agent tokens
- Significant latency improvement

**Key Insight**: Progressive disclosure works for tools too.

### 12.4 Manus: KV-Cache Optimization

**Problem**: Latency and cost were too high.

**Solution**:
- Stable prompt prefixes
- Append-only context
- Explicit cache breakpoints

**Result**: Dramatic improvements in KV-cache hit rate.

**Key Insight**: The KV-cache hit rate is the single most important metric for production agents.

---

## Conclusion

Performance optimization for agent systems requires a multi-dimensional approach:

1. **Measure Everything**: You can't optimize what you don't measure
2. **Understand Trade-offs**: Speed vs. accuracy vs. cost
3. **Iterate Systematically**: Use A/B testing and benchmarks
4. **Focus on Context**: Most gains come from context management
5. **Plan for Failure**: Build resilience from the start

The case studies show that harness changes alone can produce dramatic improvements—often more than model changes. Invest in your harness.

---

## Quick Reference

### Optimization Checklist

- [ ] Implement token tracking
- [ ] Add context compaction
- [ ] Enable result caching
- [ ] Add retry logic
- [ ] Implement circuit breakers
- [ ] Set up monitoring
- [ ] Create benchmarks
- [ ] Add verification steps
- [ ] Optimize tool schemas
- [ ] Test at scale

### Key Metrics to Track

| Metric | Target |
|--------|--------|
| Pass Rate | >80% |
| Token Efficiency | Minimize |
| Latency P95 | <10s |
| Error Rate | <5% |
| Cost per Task | Track & optimize |

---

*Part 4 of the Comprehensive Guide to Agent Harnesses. See also: Fundamentals and Context Engineering, Architecture Deep Dive, and Implementation Guide.*


---



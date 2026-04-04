# Gravity Claw Agent Runtime -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone TypeScript agent runtime at `agent/` that runs an agentic tool loop powered by 0G Compute LLM, connects to Telegram/WhatsApp/Discord/WebChat, stores memory via ENS + 0G Storage + local markdown, and supports MCP tool bridging, scheduled tasks, web search, shell commands, and a skills system.

**Architecture:** Persistent agent loop per conversation. Messages arrive from any enabled channel, get enriched with soul (from ENS text records) and conversation history (from 0G Storage), sent to 0G Compute LLM with available tools. Tool calls execute and feed back until a final text response is returned to the originating channel.

**Tech Stack:** TypeScript, Node 20, ethers, viem, grammy, @whiskeysockets/baileys, discord.js, express+ws, @0glabs/0g-serving-broker, @0gfoundation/0g-ts-sdk, @modelcontextprotocol/sdk, node-cron, chokidar, dotenv

---

## File Structure

```
agent/
  package.json
  tsconfig.json
  Dockerfile
  docker-compose.yml
  .env.example
  mcp-servers.json
  skills/
    example.md
  data/                    # Runtime data (gitignored)
    memory/
    whatsapp-session/
    schedules.json
    webhooks.json
  src/
    index.ts               # Entry point
    config.ts              # Env var loading + validation
    core/
      types.ts             # Shared interfaces (ChatMessage, ToolCall, etc.)
      tools.ts             # Tool registry
      llm.ts               # LLM provider interface + 0G Compute implementation
      agent.ts             # Agent loop
    channels/
      types.ts             # Channel + IncomingMessage interfaces
      telegram.ts
      whatsapp.ts
      discord.ts
      webchat.ts
    memory/
      ens.ts               # ENS text record reader (soul/personality)
      zerog.ts             # 0G Storage conversation history
      markdown.ts          # Local markdown memory tool
    tools/
      shell.ts
      web-search.ts
      scheduler.ts
      webhooks.ts
      mcp-bridge.ts
      skills.ts
    heartbeat/
      index.ts             # Heartbeat loop + event checkers
  tests/
    core/
      tools.test.ts
      llm.test.ts
      agent.test.ts
    channels/
      telegram.test.ts
    memory/
      ens.test.ts
      markdown.test.ts
    tools/
      shell.test.ts
      scheduler.test.ts
      skills.test.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `agent/package.json`
- Create: `agent/tsconfig.json`
- Create: `agent/.gitignore`
- Create: `agent/.env.example`
- Create: `agent/mcp-servers.json`
- Create: `agent/skills/example.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@caas/agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@0glabs/0g-serving-broker": "^0.5.0",
    "@0gfoundation/0g-ts-sdk": "^0.8.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "@whiskeysockets/baileys": "^6.7.0",
    "chokidar": "^4.0.0",
    "discord.js": "^14.18.0",
    "dotenv": "^16.5.0",
    "duckduckgo-search": "^1.0.7",
    "ethers": "^6.13.0",
    "express": "^5.1.0",
    "grammy": "^1.36.0",
    "node-cron": "^3.0.3",
    "viem": "^2.45.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.18.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
data/
.env
*.tsbuildinfo
```

- [ ] **Step 4: Create .env.example**

```bash
# Required
AGENT_PRIVATE_KEY=0x...
AGENT_ENS_NAME=my-agent.caas.eth

# RPC
RPC_URL=https://evmrpc.0g.ai

# Channels (enable by providing tokens)
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=
ENABLE_WEB=false
WEB_PORT=3001

# Security
ALLOWED_USER_IDS=

# Tools
SHELL_ALLOWLIST=ls,cat,echo,date,whoami
MCP_CONFIG_PATH=./mcp-servers.json

# Behavior
HEARTBEAT_INTERVAL=300000
```

- [ ] **Step 5: Create mcp-servers.json**

```json
{
  "servers": []
}
```

- [ ] **Step 6: Create skills/example.md**

```markdown
---
name: greeting
description: Respond to greetings warmly
triggers:
  - hello
  - hi
  - hey
---
# Greeting Skill

When the user greets you, respond warmly and ask how you can help.
```

- [ ] **Step 7: Install dependencies**

Run: `cd agent && npm install`
Expected: `node_modules/` created, no errors

- [ ] **Step 8: Verify TypeScript compiles (empty)**

Create a minimal `src/index.ts`:
```typescript
console.log("Gravity Claw agent starting...");
```

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add agent/
git commit -m "feat(agent): scaffold project with dependencies"
```

---

### Task 2: Config and Core Types

**Files:**
- Create: `agent/src/config.ts`
- Create: `agent/src/core/types.ts`

- [ ] **Step 1: Create config.ts**

```typescript
import "dotenv/config";

export interface Config {
  agentPrivateKey: string;
  agentEnsName: string;
  rpcUrl: string;
  telegramBotToken?: string;
  discordBotToken?: string;
  enableWeb: boolean;
  webPort: number;
  allowedUserIds: string[];
  shellAllowlist: string[];
  mcpConfigPath: string;
  heartbeatInterval: number;
}

export function loadConfig(): Config {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("AGENT_PRIVATE_KEY is required");

  const ensName = process.env.AGENT_ENS_NAME;
  if (!ensName) throw new Error("AGENT_ENS_NAME is required");

  return {
    agentPrivateKey: key,
    agentEnsName: ensName,
    rpcUrl: process.env.RPC_URL || "https://evmrpc.0g.ai",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || undefined,
    discordBotToken: process.env.DISCORD_BOT_TOKEN || undefined,
    enableWeb: process.env.ENABLE_WEB === "true",
    webPort: parseInt(process.env.WEB_PORT || "3001", 10),
    allowedUserIds: (process.env.ALLOWED_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    shellAllowlist: (process.env.SHELL_ALLOWLIST || "ls,cat,echo,date,whoami")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    mcpConfigPath: process.env.MCP_CONFIG_PATH || "./mcp-servers.json",
    heartbeatInterval: parseInt(
      process.env.HEARTBEAT_INTERVAL || "300000",
      10
    ),
  };
}
```

- [ ] **Step 2: Create core/types.ts**

```typescript
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
}

export interface AgentResponse {
  text: string;
  media?: MediaAttachment[];
}

export interface MediaAttachment {
  type: "image" | "audio" | "file";
  data: Buffer;
  mimeType: string;
  filename?: string;
}

export interface StoredConversation {
  id: string;
  channelName: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add agent/src/config.ts agent/src/core/types.ts
git commit -m "feat(agent): add config loader and core types"
```

---

### Task 3: Tool Registry

**Files:**
- Create: `agent/src/core/tools.ts`
- Create: `agent/tests/core/tools.test.ts`

- [ ] **Step 1: Write failing test for tool registry**

```typescript
// tests/core/tools.test.ts
import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../src/core/tools.js";

describe("ToolRegistry", () => {
  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "test-tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} },
      handler: async () => "result",
    });

    const tool = registry.get("test-tool");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("test-tool");
  });

  it("lists all tools as OpenAI function definitions", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "tool-a",
      description: "Tool A",
      parameters: { type: "object", properties: {} },
      handler: async () => "a",
    });
    registry.register({
      name: "tool-b",
      description: "Tool B",
      parameters: {
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      },
      handler: async () => "b",
    });

    const defs = registry.toOpenAITools();
    expect(defs).toHaveLength(2);
    expect(defs[0]).toEqual({
      type: "function",
      function: {
        name: "tool-a",
        description: "Tool A",
        parameters: { type: "object", properties: {} },
      },
    });
  });

  it("executes a tool handler", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "Echoes input",
      parameters: {
        type: "object",
        properties: { msg: { type: "string" } },
      },
      handler: async (args: { msg: string }) => args.msg,
    });

    const result = await registry.execute("echo", '{"msg":"hello"}');
    expect(result).toBe("hello");
  });

  it("throws on unknown tool execution", async () => {
    const registry = new ToolRegistry();
    await expect(registry.execute("nope", "{}")).rejects.toThrow(
      'Unknown tool: nope'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/core/tools.test.ts`
Expected: FAIL -- cannot find module

- [ ] **Step 3: Implement ToolRegistry**

```typescript
// src/core/tools.ts
import type { ToolDefinition } from "./types.js";

export interface RegisteredTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: unknown) => Promise<string>;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  toOpenAITools(): OpenAITool[] {
    return Array.from(this.tools.values()).map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  async execute(name: string, argsJson: string): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const args = JSON.parse(argsJson);
    return tool.handler(args);
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/core/tools.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/core/tools.ts agent/tests/core/tools.test.ts
git commit -m "feat(agent): add tool registry with OpenAI format export"
```

---

### Task 4: LLM Provider (0G Compute)

**Files:**
- Create: `agent/src/core/llm.ts`
- Create: `agent/tests/core/llm.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/core/llm.test.ts
import { describe, it, expect, vi } from "vitest";
import { ZeroGLLMProvider } from "../src/core/llm.js";
import type { ChatMessage } from "../src/core/types.js";

describe("ZeroGLLMProvider", () => {
  it("formats messages for OpenAI-compatible API", () => {
    const provider = new ZeroGLLMProvider({
      privateKey: "0x" + "ab".repeat(32),
      rpcUrl: "https://evmrpc.0g.ai",
    });

    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ];

    const formatted = provider.formatMessages(messages);
    expect(formatted).toEqual([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ]);
  });

  it("formats tool definitions for API", () => {
    const provider = new ZeroGLLMProvider({
      privateKey: "0x" + "ab".repeat(32),
      rpcUrl: "https://evmrpc.0g.ai",
    });

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "search",
          description: "Search the web",
          parameters: {
            type: "object",
            properties: { q: { type: "string" } },
          },
        },
      },
    ];

    const formatted = provider.formatTools(tools);
    expect(formatted).toEqual(tools);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/core/llm.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement LLM provider**

```typescript
// src/core/llm.ts
import { ethers } from "ethers";
import type { ChatMessage, LLMResponse, ToolCall } from "./types.js";
import type { OpenAITool } from "./tools.js";

export interface LLMProvider {
  chat(messages: ChatMessage[], tools?: OpenAITool[]): Promise<LLMResponse>;
}

export interface ZeroGConfig {
  privateKey: string;
  rpcUrl: string;
}

interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export class ZeroGLLMProvider implements LLMProvider {
  private config: ZeroGConfig;
  private broker: unknown = null;
  private providerAddress: string | null = null;
  private serviceEndpoint: string | null = null;
  private model: string | null = null;

  constructor(config: ZeroGConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { createZGComputeNetworkBroker } = await import(
      "@0glabs/0g-serving-broker"
    );
    const wallet = new ethers.Wallet(this.config.privateKey);
    this.broker = await createZGComputeNetworkBroker(wallet);

    // List available services and pick the first chat model
    const services = await (this.broker as any).inference.listService();
    const chatService = services.find(
      (s: any) => s.serviceType === "chat" || s.model?.includes("chat")
    );
    if (!chatService) {
      // Fall back to first available service
      const svc = services[0];
      if (!svc) throw new Error("No 0G Compute services available");
      this.providerAddress = svc.provider;
      this.serviceEndpoint = svc.url;
      this.model = svc.model;
    } else {
      this.providerAddress = chatService.provider;
      this.serviceEndpoint = chatService.url;
      this.model = chatService.model;
    }

    // Ensure account exists for billing
    try {
      await (this.broker as any).inference.addAccount(
        this.providerAddress,
        0.001
      );
    } catch {
      // Account may already exist
    }
  }

  formatMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages.map((m) => {
      const msg: OpenAIMessage = { role: m.role, content: m.content };
      if (m.toolCallId) msg.tool_call_id = m.toolCallId;
      if (m.toolCalls) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));
      }
      return msg;
    });
  }

  formatTools(tools: OpenAITool[]): OpenAITool[] {
    return tools;
  }

  async chat(
    messages: ChatMessage[],
    tools?: OpenAITool[]
  ): Promise<LLMResponse> {
    if (!this.broker || !this.providerAddress || !this.serviceEndpoint) {
      throw new Error("LLM provider not initialized. Call initialize() first.");
    }

    const headers = await (this.broker as any).inference.getRequestHeaders(
      this.providerAddress
    );

    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.formatMessages(messages),
    };
    if (tools && tools.length > 0) {
      body.tools = this.formatTools(tools);
      body.tool_choice = "auto";
    }

    const response = await fetch(
      `${this.serviceEndpoint}/v1/proxy/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as any;
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No choices in LLM response");

    const msg = choice.message;
    const toolCalls: ToolCall[] | null = msg.tool_calls
      ? msg.tool_calls.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }))
      : null;

    return {
      content: msg.content || null,
      toolCalls,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/core/llm.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/core/llm.ts agent/tests/core/llm.test.ts
git commit -m "feat(agent): add 0G Compute LLM provider with OpenAI-compatible API"
```

---

### Task 5: Agent Loop

**Files:**
- Create: `agent/src/core/agent.ts`
- Create: `agent/tests/core/agent.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/core/agent.test.ts
import { describe, it, expect, vi } from "vitest";
import { AgentLoop } from "../src/core/agent.js";
import type { LLMProvider } from "../src/core/llm.js";
import type { ChatMessage, LLMResponse } from "../src/core/types.js";
import { ToolRegistry } from "../src/core/tools.js";

function makeMockLLM(responses: LLMResponse[]): LLMProvider {
  let callIndex = 0;
  return {
    chat: vi.fn(async () => {
      const resp = responses[callIndex];
      callIndex++;
      return resp;
    }),
  };
}

describe("AgentLoop", () => {
  it("returns final text when no tool calls", async () => {
    const llm = makeMockLLM([{ content: "Hello!", toolCalls: null }]);
    const registry = new ToolRegistry();

    const agent = new AgentLoop({ llm, tools: registry, systemPrompt: "" });
    const result = await agent.run("Hi");

    expect(result.text).toBe("Hello!");
  });

  it("executes tool calls and feeds results back", async () => {
    const llm = makeMockLLM([
      {
        content: null,
        toolCalls: [
          { id: "tc1", name: "echo", arguments: '{"msg":"world"}' },
        ],
      },
      { content: "Got: world", toolCalls: null },
    ]);

    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "Echo",
      parameters: { type: "object", properties: { msg: { type: "string" } } },
      handler: async (args: any) => args.msg,
    });

    const agent = new AgentLoop({
      llm,
      tools: registry,
      systemPrompt: "You are helpful.",
    });
    const result = await agent.run("Say world");

    expect(result.text).toBe("Got: world");
    expect(llm.chat).toHaveBeenCalledTimes(2);
  });

  it("limits tool call iterations to prevent infinite loops", async () => {
    const infiniteToolCall: LLMResponse = {
      content: null,
      toolCalls: [{ id: "tc", name: "echo", arguments: '{"msg":"loop"}' }],
    };
    const responses = Array(25).fill(infiniteToolCall);
    const llm = makeMockLLM(responses);

    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "Echo",
      parameters: { type: "object", properties: { msg: { type: "string" } } },
      handler: async (args: any) => args.msg,
    });

    const agent = new AgentLoop({
      llm,
      tools: registry,
      systemPrompt: "",
      maxIterations: 10,
    });
    const result = await agent.run("loop forever");

    expect(result.text).toContain("maximum iterations");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/core/agent.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement agent loop**

```typescript
// src/core/agent.ts
import type { LLMProvider } from "./llm.js";
import type { ChatMessage, AgentResponse, ToolCall } from "./types.js";
import type { ToolRegistry } from "./tools.js";

export interface AgentLoopOptions {
  llm: LLMProvider;
  tools: ToolRegistry;
  systemPrompt: string;
  maxIterations?: number;
}

export class AgentLoop {
  private llm: LLMProvider;
  private tools: ToolRegistry;
  private systemPrompt: string;
  private maxIterations: number;

  constructor(opts: AgentLoopOptions) {
    this.llm = opts.llm;
    this.tools = opts.tools;
    this.systemPrompt = opts.systemPrompt;
    this.maxIterations = opts.maxIterations ?? 20;
  }

  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  async run(
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<AgentResponse> {
    const messages: ChatMessage[] = [];

    if (this.systemPrompt) {
      messages.push({ role: "system", content: this.systemPrompt });
    }

    messages.push(...conversationHistory);
    messages.push({ role: "user", content: userMessage });

    const openAITools = this.tools.toOpenAITools();

    for (let i = 0; i < this.maxIterations; i++) {
      const response = await this.llm.chat(
        messages,
        openAITools.length > 0 ? openAITools : undefined
      );

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { text: response.content || "" };
      }

      // Add assistant message with tool calls
      messages.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Execute each tool call
      for (const tc of response.toolCalls) {
        let result: string;
        try {
          result = await this.tools.execute(tc.name, tc.arguments);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        messages.push({
          role: "tool",
          content: result,
          toolCallId: tc.id,
        });
      }
    }

    return { text: "Stopped: reached maximum iterations without a final response." };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/core/agent.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/core/agent.ts agent/tests/core/agent.test.ts
git commit -m "feat(agent): add agent loop with tool execution and iteration limit"
```

---

### Task 6: Channel Interface + Telegram

**Files:**
- Create: `agent/src/channels/types.ts`
- Create: `agent/src/channels/telegram.ts`

- [ ] **Step 1: Create channel types**

```typescript
// src/channels/types.ts
import type { AgentResponse, MediaAttachment } from "../core/types.js";

export interface IncomingMessage {
  channelName: string;
  conversationId: string;
  userId: string;
  text: string;
  media?: MediaAttachment[];
}

export type MessageHandler = (msg: IncomingMessage) => void;

export interface Channel {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: MessageHandler): void;
  send(conversationId: string, response: AgentResponse): Promise<void>;
}
```

- [ ] **Step 2: Implement Telegram channel**

```typescript
// src/channels/telegram.ts
import { Bot } from "grammy";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface TelegramChannelOptions {
  token: string;
  allowedUserIds: string[];
}

export class TelegramChannel implements Channel {
  name = "telegram";
  private bot: Bot;
  private allowedUserIds: Set<string>;
  private handler: MessageHandler | null = null;

  constructor(opts: TelegramChannelOptions) {
    this.bot = new Bot(opts.token);
    this.allowedUserIds = new Set(opts.allowedUserIds);

    this.bot.on("message:text", (ctx) => {
      const userId = String(ctx.from?.id);

      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        return; // Silently reject unauthorized users
      }

      if (this.handler) {
        const msg: IncomingMessage = {
          channelName: "telegram",
          conversationId: String(ctx.chat.id),
          userId,
          text: ctx.message.text,
        };
        this.handler(msg);
      }
    });
  }

  async start(): Promise<void> {
    this.bot.start();
    console.log("[telegram] Bot started (long polling)");
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    // Split long messages (Telegram limit: 4096 chars)
    const text = response.text;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 4096) {
      chunks.push(text.slice(i, i + 4096));
    }
    for (const chunk of chunks) {
      await this.bot.api.sendMessage(Number(conversationId), chunk);
    }
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add agent/src/channels/
git commit -m "feat(agent): add channel interface and Telegram bot channel"
```

---

### Task 7: Discord Channel

**Files:**
- Create: `agent/src/channels/discord.ts`

- [ ] **Step 1: Implement Discord channel**

```typescript
// src/channels/discord.ts
import {
  Client,
  GatewayIntentBits,
  Events,
  type Message as DiscordMessage,
} from "discord.js";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface DiscordChannelOptions {
  token: string;
  allowedUserIds: string[];
}

export class DiscordChannel implements Channel {
  name = "discord";
  private client: Client;
  private token: string;
  private allowedUserIds: Set<string>;
  private handler: MessageHandler | null = null;

  constructor(opts: DiscordChannelOptions) {
    this.token = opts.token;
    this.allowedUserIds = new Set(opts.allowedUserIds);
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.client.on(Events.MessageCreate, (message: DiscordMessage) => {
      if (message.author.bot) return;
      const userId = message.author.id;

      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        return;
      }

      // Only respond to DMs or mentions
      const isMentioned = message.mentions.has(this.client.user!);
      const isDM = !message.guild;
      if (!isDM && !isMentioned) return;

      if (this.handler) {
        const text = message.content
          .replace(/<@!?\d+>/g, "")
          .trim();

        const msg: IncomingMessage = {
          channelName: "discord",
          conversationId: message.channel.id,
          userId,
          text,
        };
        this.handler(msg);
      }
    });
  }

  async start(): Promise<void> {
    await this.client.login(this.token);
    console.log(`[discord] Bot logged in as ${this.client.user?.tag}`);
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    const channel = await this.client.channels.fetch(conversationId);
    if (!channel || !("send" in channel)) return;

    const text = response.text;
    // Discord limit: 2000 chars
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 2000) {
      chunks.push(text.slice(i, i + 2000));
    }
    for (const chunk of chunks) {
      await (channel as any).send(chunk);
    }
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/channels/discord.ts
git commit -m "feat(agent): add Discord channel with DM and mention support"
```

---

### Task 8: WhatsApp Channel

**Files:**
- Create: `agent/src/channels/whatsapp.ts`

- [ ] **Step 1: Implement WhatsApp channel**

```typescript
// src/channels/whatsapp.ts
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface WhatsAppChannelOptions {
  sessionDir: string;
  allowedUserIds: string[];
}

export class WhatsAppChannel implements Channel {
  name = "whatsapp";
  private socket: WASocket | null = null;
  private sessionDir: string;
  private allowedUserIds: Set<string>;
  private handler: MessageHandler | null = null;

  constructor(opts: WhatsAppChannelOptions) {
    this.sessionDir = opts.sessionDir;
    this.allowedUserIds = new Set(opts.allowedUserIds);
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    this.socket.ev.on("creds.update", saveCreds);

    this.socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log("[whatsapp] Reconnecting...");
          this.start();
        } else {
          console.log("[whatsapp] Logged out");
        }
      } else if (connection === "open") {
        console.log("[whatsapp] Connected");
      }
    });

    this.socket.ev.on("messages.upsert", ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const userId = msg.key.remoteJid || "";
        if (
          this.allowedUserIds.size > 0 &&
          !this.allowedUserIds.has(userId.replace("@s.whatsapp.net", ""))
        ) {
          continue;
        }

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        if (!text || !this.handler) continue;

        const incoming: IncomingMessage = {
          channelName: "whatsapp",
          conversationId: userId,
          userId,
          text,
        };
        this.handler(incoming);
      }
    });
  }

  async stop(): Promise<void> {
    this.socket?.end(undefined);
    this.socket = null;
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    if (!this.socket) return;
    await this.socket.sendMessage(conversationId, { text: response.text });
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/channels/whatsapp.ts
git commit -m "feat(agent): add WhatsApp channel with Baileys QR pairing"
```

---

### Task 9: WebChat Channel

**Files:**
- Create: `agent/src/channels/webchat.ts`

- [ ] **Step 1: Implement WebChat channel**

```typescript
// src/channels/webchat.ts
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import http from "node:http";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface WebChatChannelOptions {
  port: number;
}

interface WSMessage {
  type: "message" | "typing" | "file";
  conversationId: string;
  content: string;
  token: string;
}

export class WebChatChannel implements Channel {
  name = "webchat";
  private port: number;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private handler: MessageHandler | null = null;
  private connections = new Map<string, WebSocket>();

  constructor(opts: WebChatChannelOptions) {
    this.port = opts.port;
  }

  async start(): Promise<void> {
    const app = express();
    app.use(express.json());

    // Health check
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    this.server = http.createServer(app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws) => {
      let conversationId: string | null = null;

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(String(raw)) as WSMessage;

          // TODO: Verify World ID JWT from data.token
          // For now, accept all connections

          conversationId = data.conversationId;
          this.connections.set(conversationId, ws);

          if (data.type === "message" && this.handler) {
            const msg: IncomingMessage = {
              channelName: "webchat",
              conversationId: data.conversationId,
              userId: data.token, // Use token as userId for now
              text: data.content,
            };
            this.handler(msg);
          }
        } catch {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        if (conversationId) {
          this.connections.delete(conversationId);
        }
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(this.port, () => {
        console.log(`[webchat] Server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.wss?.close();
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    const ws = this.connections.get(conversationId);
    if (!ws || ws.readyState !== ws.OPEN) return;

    ws.send(
      JSON.stringify({
        type: "message",
        conversationId,
        content: response.text,
      })
    );
  }

  getServer(): http.Server | null {
    return this.server;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/channels/webchat.ts
git commit -m "feat(agent): add WebChat channel with WebSocket support"
```

---

### Task 10: ENS Memory (Soul/Personality)

**Files:**
- Create: `agent/src/memory/ens.ts`
- Create: `agent/tests/memory/ens.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/memory/ens.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildSystemPrompt } from "../src/memory/ens.js";

describe("buildSystemPrompt", () => {
  it("builds prompt from soul and personality", () => {
    const prompt = buildSystemPrompt({
      soul: "You are a helpful trading assistant.",
      personality: { tone: "friendly", style: "concise" },
      skills: [],
    });

    expect(prompt).toContain("You are a helpful trading assistant.");
    expect(prompt).toContain("friendly");
    expect(prompt).toContain("concise");
  });

  it("includes skill instructions when provided", () => {
    const prompt = buildSystemPrompt({
      soul: "Base soul.",
      personality: null,
      skills: ["When asked about weather, check the forecast tool first."],
    });

    expect(prompt).toContain("Base soul.");
    expect(prompt).toContain("weather");
  });

  it("returns default prompt when no soul is set", () => {
    const prompt = buildSystemPrompt({
      soul: null,
      personality: null,
      skills: [],
    });

    expect(prompt).toContain("helpful");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/memory/ens.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ENS reader**

```typescript
// src/memory/ens.ts
import { createPublicClient, http, normalize } from "viem";
import { mainnet } from "viem/chains";

export interface SoulData {
  soul: string | null;
  personality: Record<string, string> | null;
  channels: string[];
  skills: string[];
}

export interface SystemPromptInput {
  soul: string | null;
  personality: Record<string, string> | null;
  skills: string[];
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const parts: string[] = [];

  if (input.soul) {
    parts.push(input.soul);
  } else {
    parts.push(
      "You are a helpful AI assistant. Respond clearly and concisely."
    );
  }

  if (input.personality) {
    const traits = Object.entries(input.personality)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    parts.push(`\nPersonality: ${traits}`);
  }

  if (input.skills.length > 0) {
    parts.push("\n## Active Skills\n");
    for (const skill of input.skills) {
      parts.push(skill);
    }
  }

  return parts.join("\n");
}

export async function readENSRecords(
  ensName: string,
  rpcUrl: string
): Promise<SoulData> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });

  const [soulHash, personalityRaw, channelsRaw] = await Promise.all([
    client
      .getEnsText({ name: normalize(ensName), key: "caas.soul" })
      .catch(() => null),
    client
      .getEnsText({ name: normalize(ensName), key: "caas.personality" })
      .catch(() => null),
    client
      .getEnsText({ name: normalize(ensName), key: "caas.channels" })
      .catch(() => null),
  ]);

  let personality: Record<string, string> | null = null;
  if (personalityRaw) {
    try {
      personality = JSON.parse(personalityRaw);
    } catch {
      // Ignore invalid JSON
    }
  }

  const channels = channelsRaw
    ? channelsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let soul: string | null = null;
  if (soulHash) {
    // Fetch soul.md from 0G Storage using the hash
    // This will be wired up once 0G Storage module is ready
    soul = soulHash; // Placeholder: use hash as soul text for now
  }

  return { soul, personality, channels, skills: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/memory/ens.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/memory/ens.ts agent/tests/memory/ens.test.ts
git commit -m "feat(agent): add ENS text record reader and system prompt builder"
```

---

### Task 11: 0G Storage (Conversation History)

**Files:**
- Create: `agent/src/memory/zerog.ts`

- [ ] **Step 1: Implement 0G Storage conversation persistence**

```typescript
// src/memory/zerog.ts
import { ethers } from "ethers";
import type { StoredConversation, ChatMessage } from "../core/types.js";

export interface ZeroGStorageConfig {
  privateKey: string;
  rpcUrl: string;
  maxConversations: number;
}

export class ZeroGMemory {
  private config: ZeroGStorageConfig;
  private conversations = new Map<string, StoredConversation>();
  private indexerClient: unknown = null;
  private signer: ethers.Wallet;

  constructor(config: ZeroGStorageConfig) {
    this.config = config;
    this.signer = new ethers.Wallet(config.privateKey);
  }

  async initialize(): Promise<void> {
    try {
      const { Indexer } = await import("@0gfoundation/0g-ts-sdk");
      // Use 0G standard indexer
      this.indexerClient = new Indexer("https://indexer-storage-standard.0g.ai");
      console.log("[0g-storage] Indexer connected");
    } catch (err) {
      console.warn("[0g-storage] SDK not available, using local fallback");
    }
  }

  getConversation(id: string): StoredConversation | undefined {
    return this.conversations.get(id);
  }

  getOrCreateConversation(
    id: string,
    channelName: string,
    userId: string
  ): StoredConversation {
    let conv = this.conversations.get(id);
    if (!conv) {
      conv = {
        id,
        channelName,
        userId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.conversations.set(id, conv);
    }
    return conv;
  }

  addMessage(conversationId: string, message: ChatMessage): void {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();

    // Trim old messages if conversation gets too long
    if (conv.messages.length > 100) {
      conv.messages = conv.messages.slice(-80);
    }
  }

  getHistory(conversationId: string, limit = 50): ChatMessage[] {
    const conv = this.conversations.get(conversationId);
    if (!conv) return [];
    return conv.messages.slice(-limit);
  }

  async persist(conversationId: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !this.indexerClient) return;

    try {
      // Serialize conversation to JSON, upload to 0G Storage
      const data = JSON.stringify(conv);
      const blob = new Blob([data], { type: "application/json" });
      // TODO: Use 0G SDK upload when integrated
      console.log(
        `[0g-storage] Would persist conversation ${conversationId} (${data.length} bytes)`
      );
    } catch (err) {
      console.error("[0g-storage] Persist error:", err);
    }
  }

  async loadFromStorage(): Promise<void> {
    // TODO: Load recent conversations from 0G Storage on startup
    console.log("[0g-storage] Loading conversation history...");
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/memory/zerog.ts
git commit -m "feat(agent): add 0G Storage conversation memory with local fallback"
```

---

### Task 12: Local Markdown Memory Tool

**Files:**
- Create: `agent/src/memory/markdown.ts`
- Create: `agent/tests/memory/markdown.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/memory/markdown.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MarkdownMemory } from "../src/memory/markdown.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("MarkdownMemory", () => {
  let memDir: string;
  let memory: MarkdownMemory;

  beforeEach(() => {
    memDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-mem-"));
    memory = new MarkdownMemory(memDir);
  });

  afterEach(() => {
    fs.rmSync(memDir, { recursive: true, force: true });
  });

  it("saves and reads a memory file", async () => {
    await memory.save("prefs", "user-preferences", "Prefers concise responses");
    const content = await memory.read("prefs");
    expect(content).toContain("Prefers concise responses");
    expect(content).toContain("user-preferences");
  });

  it("lists all memory files", async () => {
    await memory.save("prefs", "user-prefs", "Concise");
    await memory.save("facts", "user-facts", "Timezone: IST");
    const list = await memory.list();
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.name)).toContain("prefs");
    expect(list.map((m) => m.name)).toContain("facts");
  });

  it("deletes a memory file", async () => {
    await memory.save("temp", "temporary", "Temp data");
    await memory.remove("temp");
    const list = await memory.list();
    expect(list).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/memory/markdown.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement markdown memory**

```typescript
// src/memory/markdown.ts
import fs from "node:fs/promises";
import path from "node:path";
import type { RegisteredTool } from "../core/tools.js";

export interface MemoryEntry {
  name: string;
  topic: string;
  content: string;
}

export class MarkdownMemory {
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  async ensure(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async save(name: string, topic: string, content: string): Promise<void> {
    await this.ensure();
    const filePath = path.join(this.dir, `${name}.md`);
    const md = [
      "---",
      `topic: ${topic}`,
      `updated: ${new Date().toISOString().slice(0, 10)}`,
      "---",
      `# ${name}`,
      "",
      content,
    ].join("\n");
    await fs.writeFile(filePath, md, "utf-8");
  }

  async read(name: string): Promise<string | null> {
    try {
      const filePath = path.join(this.dir, `${name}.md`);
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  async list(): Promise<MemoryEntry[]> {
    await this.ensure();
    const files = await fs.readdir(this.dir);
    const entries: MemoryEntry[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(this.dir, file), "utf-8");
      const name = file.replace(".md", "");
      const topicMatch = content.match(/^topic:\s*(.+)$/m);
      entries.push({
        name,
        topic: topicMatch?.[1] || "general",
        content,
      });
    }

    return entries;
  }

  async remove(name: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.dir, `${name}.md`));
    } catch {
      // File may not exist
    }
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "memory-save",
        description:
          "Save information to persistent memory. Use for user preferences, facts, notes.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Short identifier for this memory",
            },
            topic: { type: "string", description: "Category/topic" },
            content: { type: "string", description: "Content to remember" },
          },
          required: ["name", "topic", "content"],
        },
        handler: async (args: any) => {
          await this.save(args.name, args.topic, args.content);
          return `Saved memory: ${args.name}`;
        },
      },
      {
        name: "memory-read",
        description: "Read a specific memory by name.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Memory name to read" },
          },
          required: ["name"],
        },
        handler: async (args: any) => {
          const content = await this.read(args.name);
          return content || "Memory not found.";
        },
      },
      {
        name: "memory-list",
        description: "List all saved memories.",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          const entries = await this.list();
          if (entries.length === 0) return "No memories saved.";
          return entries
            .map((e) => `- ${e.name} (${e.topic})`)
            .join("\n");
        },
      },
      {
        name: "memory-delete",
        description: "Delete a memory by name.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Memory name to delete" },
          },
          required: ["name"],
        },
        handler: async (args: any) => {
          await this.remove(args.name);
          return `Deleted memory: ${args.name}`;
        },
      },
    ];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/memory/markdown.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/memory/markdown.ts agent/tests/memory/markdown.test.ts
git commit -m "feat(agent): add local markdown memory with CRUD tools"
```

---

### Task 13: Shell Command Tool

**Files:**
- Create: `agent/src/tools/shell.ts`
- Create: `agent/tests/tools/shell.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/tools/shell.test.ts
import { describe, it, expect } from "vitest";
import { ShellTool } from "../src/tools/shell.js";

describe("ShellTool", () => {
  it("executes allowed commands", async () => {
    const shell = new ShellTool(["echo", "date"]);
    const tool = shell.registerTool();
    const result = await tool.handler({ command: "echo hello" });
    expect(result).toContain("hello");
  });

  it("rejects disallowed commands", async () => {
    const shell = new ShellTool(["echo"]);
    const tool = shell.registerTool();
    const result = await tool.handler({ command: "rm -rf /" });
    expect(result).toContain("not in allowlist");
  });

  it("handles command timeout", async () => {
    const shell = new ShellTool(["sleep"], 100);
    const tool = shell.registerTool();
    const result = await tool.handler({ command: "sleep 10" });
    expect(result).toContain("timed out");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/tools/shell.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement shell tool**

```typescript
// src/tools/shell.ts
import { exec } from "node:child_process";
import type { RegisteredTool } from "../core/tools.js";

export class ShellTool {
  private allowlist: Set<string>;
  private timeoutMs: number;

  constructor(allowlist: string[], timeoutMs = 30000) {
    this.allowlist = new Set(allowlist);
    this.timeoutMs = timeoutMs;
  }

  private isAllowed(command: string): boolean {
    const baseCmd = command.trim().split(/\s+/)[0];
    return this.allowlist.has(baseCmd);
  }

  registerTool(): RegisteredTool {
    return {
      name: "shell",
      description:
        "Execute a shell command. Only allowlisted commands are permitted.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute",
          },
        },
        required: ["command"],
      },
      handler: async (args: any): Promise<string> => {
        const command = args.command as string;

        if (!this.isAllowed(command)) {
          return `Error: Command "${command.split(/\s+/)[0]}" is not in allowlist. Allowed: ${Array.from(this.allowlist).join(", ")}`;
        }

        return new Promise((resolve) => {
          const child = exec(
            command,
            { timeout: this.timeoutMs },
            (error, stdout, stderr) => {
              if (error) {
                if (error.killed) {
                  resolve(`Error: Command timed out after ${this.timeoutMs}ms`);
                  return;
                }
                resolve(`Error: ${error.message}\nStderr: ${stderr}`);
                return;
              }
              const output = stdout + (stderr ? `\nStderr: ${stderr}` : "");
              resolve(output || "(no output)");
            }
          );
        });
      },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/tools/shell.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/tools/shell.ts agent/tests/tools/shell.test.ts
git commit -m "feat(agent): add shell command tool with allowlist security"
```

---

### Task 14: Web Search Tool

**Files:**
- Create: `agent/src/tools/web-search.ts`

- [ ] **Step 1: Implement web search tool**

```typescript
// src/tools/web-search.ts
import type { RegisteredTool } from "../core/tools.js";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchTool {
  registerTool(): RegisteredTool {
    return {
      name: "web-search",
      description:
        "Search the web using DuckDuckGo. Returns top results with title, URL, and snippet.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          numResults: {
            type: "number",
            description: "Number of results (default 5)",
          },
        },
        required: ["query"],
      },
      handler: async (args: any): Promise<string> => {
        const query = args.query as string;
        const numResults = (args.numResults as number) || 5;

        try {
          const { search } = await import("duckduckgo-search");
          const results = await search(query, { maxResults: numResults });

          if (!results || results.length === 0) {
            return "No results found.";
          }

          return results
            .map(
              (r: any, i: number) =>
                `${i + 1}. **${r.title}**\n   ${r.href}\n   ${r.body}`
            )
            .join("\n\n");
        } catch (err) {
          return `Search error: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    };
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/tools/web-search.ts
git commit -m "feat(agent): add DuckDuckGo web search tool"
```

---

### Task 15: Scheduler Tool

**Files:**
- Create: `agent/src/tools/scheduler.ts`
- Create: `agent/tests/tools/scheduler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/tools/scheduler.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Scheduler } from "../src/tools/scheduler.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Scheduler", () => {
  let dataDir: string;
  let scheduler: Scheduler;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-sched-"));
    scheduler = new Scheduler(dataDir, () => {});
  });

  afterEach(() => {
    scheduler.stopAll();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates a scheduled task", async () => {
    const id = scheduler.create("0 9 * * *", "Good morning check");
    expect(id).toBeTruthy();
    const tasks = scheduler.list();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].action).toBe("Good morning check");
  });

  it("pauses and resumes a task", () => {
    const id = scheduler.create("*/5 * * * *", "Ping");
    scheduler.pause(id);
    expect(scheduler.list()[0].paused).toBe(true);
    scheduler.resume(id);
    expect(scheduler.list()[0].paused).toBe(false);
  });

  it("deletes a task", () => {
    const id = scheduler.create("0 * * * *", "Hourly");
    scheduler.remove(id);
    expect(scheduler.list()).toHaveLength(0);
  });

  it("parses natural language to cron", () => {
    expect(Scheduler.naturalToCron("every day at 9am")).toBe("0 9 * * *");
    expect(Scheduler.naturalToCron("every hour")).toBe("0 * * * *");
    expect(Scheduler.naturalToCron("every 5 minutes")).toBe("*/5 * * * *");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/tools/scheduler.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement scheduler**

```typescript
// src/tools/scheduler.ts
import cron from "node-cron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { RegisteredTool } from "../core/tools.js";

export interface ScheduledTask {
  id: string;
  cronExpr: string;
  action: string;
  paused: boolean;
  createdAt: string;
}

export class Scheduler {
  private tasks = new Map<string, ScheduledTask>();
  private cronJobs = new Map<string, cron.ScheduledTask>();
  private dataDir: string;
  private onTrigger: (action: string) => void;

  constructor(dataDir: string, onTrigger: (action: string) => void) {
    this.dataDir = dataDir;
    this.onTrigger = onTrigger;
    this.loadFromDisk();
  }

  private get filePath(): string {
    return path.join(this.dataDir, "schedules.json");
  }

  private loadFromDisk(): void {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const tasks: ScheduledTask[] = JSON.parse(data);
      for (const task of tasks) {
        this.tasks.set(task.id, task);
        if (!task.paused) {
          this.startCron(task);
        }
      }
    } catch {
      // No file yet
    }
  }

  private saveToDisk(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const data = JSON.stringify(Array.from(this.tasks.values()), null, 2);
    fs.writeFileSync(this.filePath, data, "utf-8");
  }

  private startCron(task: ScheduledTask): void {
    const job = cron.schedule(task.cronExpr, () => {
      this.onTrigger(task.action);
    });
    this.cronJobs.set(task.id, job);
  }

  create(cronExpr: string, action: string): string {
    const id = crypto.randomUUID().slice(0, 8);
    const task: ScheduledTask = {
      id,
      cronExpr,
      action,
      paused: false,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    this.startCron(task);
    this.saveToDisk();
    return id;
  }

  list(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  pause(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.paused = true;
    this.cronJobs.get(id)?.stop();
    this.saveToDisk();
  }

  resume(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.paused = false;
    this.cronJobs.get(id)?.start();
    this.saveToDisk();
  }

  remove(id: string): void {
    this.cronJobs.get(id)?.stop();
    this.cronJobs.delete(id);
    this.tasks.delete(id);
    this.saveToDisk();
  }

  stopAll(): void {
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    this.cronJobs.clear();
  }

  static naturalToCron(text: string): string {
    const lower = text.toLowerCase().trim();

    const everyNMin = lower.match(/every\s+(\d+)\s+minutes?/);
    if (everyNMin) return `*/${everyNMin[1]} * * * *`;

    if (lower === "every hour") return "0 * * * *";

    const dailyAt = lower.match(
      /every\s+day\s+at\s+(\d{1,2})\s*(am|pm)?/
    );
    if (dailyAt) {
      let hour = parseInt(dailyAt[1], 10);
      if (dailyAt[2] === "pm" && hour < 12) hour += 12;
      if (dailyAt[2] === "am" && hour === 12) hour = 0;
      return `0 ${hour} * * *`;
    }

    if (lower === "every minute") return "* * * * *";

    // Fall back: treat as raw cron if nothing matched
    return text;
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "schedule-create",
        description:
          'Create a scheduled task. Accepts cron expression or natural language like "every day at 9am".',
        parameters: {
          type: "object",
          properties: {
            schedule: {
              type: "string",
              description: 'Cron expression or natural language (e.g. "every 5 minutes")',
            },
            action: {
              type: "string",
              description: "What to do when triggered (sent as a message to the agent)",
            },
          },
          required: ["schedule", "action"],
        },
        handler: async (args: any) => {
          const cronExpr = Scheduler.naturalToCron(args.schedule);
          if (!cron.validate(cronExpr)) {
            return `Invalid schedule: "${args.schedule}" -> "${cronExpr}"`;
          }
          const id = this.create(cronExpr, args.action);
          return `Created schedule ${id}: "${cronExpr}" -> "${args.action}"`;
        },
      },
      {
        name: "schedule-list",
        description: "List all scheduled tasks.",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          const tasks = this.list();
          if (tasks.length === 0) return "No scheduled tasks.";
          return tasks
            .map(
              (t) =>
                `- ${t.id}: ${t.cronExpr} -> "${t.action}" ${t.paused ? "(paused)" : ""}`
            )
            .join("\n");
        },
      },
      {
        name: "schedule-delete",
        description: "Delete a scheduled task by ID.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "Task ID to delete" },
          },
          required: ["id"],
        },
        handler: async (args: any) => {
          this.remove(args.id);
          return `Deleted schedule: ${args.id}`;
        },
      },
    ];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/tools/scheduler.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/tools/scheduler.ts agent/tests/tools/scheduler.test.ts
git commit -m "feat(agent): add scheduler with cron and natural language support"
```

---

### Task 16: Webhooks Tool

**Files:**
- Create: `agent/src/tools/webhooks.ts`

- [ ] **Step 1: Implement webhooks**

```typescript
// src/tools/webhooks.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Router } from "express";
import type { RegisteredTool } from "../core/tools.js";

export interface WebhookRoute {
  id: string;
  path: string;
  eventName: string;
  createdAt: string;
}

export class WebhookManager {
  private routes = new Map<string, WebhookRoute>();
  private dataDir: string;
  private onTrigger: (eventName: string, payload: unknown) => void;

  constructor(
    dataDir: string,
    onTrigger: (eventName: string, payload: unknown) => void
  ) {
    this.dataDir = dataDir;
    this.onTrigger = onTrigger;
    this.loadFromDisk();
  }

  private get filePath(): string {
    return path.join(this.dataDir, "webhooks.json");
  }

  private loadFromDisk(): void {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const routes: WebhookRoute[] = JSON.parse(data);
      for (const route of routes) {
        this.routes.set(route.id, route);
      }
    } catch {
      // No file yet
    }
  }

  private saveToDisk(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const data = JSON.stringify(Array.from(this.routes.values()), null, 2);
    fs.writeFileSync(this.filePath, data, "utf-8");
  }

  mountRoutes(router: Router): void {
    router.post("/webhook/:id", (req, res) => {
      const route = Array.from(this.routes.values()).find(
        (r) => r.path === req.params.id
      );
      if (!route) {
        res.status(404).json({ error: "Webhook not found" });
        return;
      }
      this.onTrigger(route.eventName, req.body);
      res.json({ ok: true });
    });
  }

  create(webhookPath: string, eventName: string): string {
    const id = crypto.randomUUID().slice(0, 8);
    const route: WebhookRoute = {
      id,
      path: webhookPath,
      eventName,
      createdAt: new Date().toISOString(),
    };
    this.routes.set(id, route);
    this.saveToDisk();
    return id;
  }

  list(): WebhookRoute[] {
    return Array.from(this.routes.values());
  }

  remove(id: string): void {
    this.routes.delete(id);
    this.saveToDisk();
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "webhook-create",
        description: "Create a webhook endpoint that triggers the agent.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Webhook path identifier" },
            eventName: {
              type: "string",
              description: "Event name sent to agent when triggered",
            },
          },
          required: ["path", "eventName"],
        },
        handler: async (args: any) => {
          const id = this.create(args.path, args.eventName);
          return `Created webhook ${id}: POST /webhook/${args.path} -> "${args.eventName}"`;
        },
      },
      {
        name: "webhook-list",
        description: "List all webhook endpoints.",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          const routes = this.list();
          if (routes.length === 0) return "No webhooks configured.";
          return routes
            .map((r) => `- ${r.id}: /webhook/${r.path} -> "${r.eventName}"`)
            .join("\n");
        },
      },
    ];
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/tools/webhooks.ts
git commit -m "feat(agent): add webhook manager with dynamic route creation"
```

---

### Task 17: MCP Tool Bridge

**Files:**
- Create: `agent/src/tools/mcp-bridge.ts`

- [ ] **Step 1: Implement MCP bridge**

```typescript
// src/tools/mcp-bridge.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import fs from "node:fs";
import type { RegisteredTool } from "../core/tools.js";

interface MCPServerConfig {
  name: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
}

interface MCPConfig {
  servers: MCPServerConfig[];
}

export class MCPBridge {
  private clients = new Map<string, Client>();
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async initialize(): Promise<RegisteredTool[]> {
    let config: MCPConfig;
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      console.log("[mcp] No MCP config found or invalid JSON");
      return [];
    }

    if (!config.servers || config.servers.length === 0) {
      return [];
    }

    const allTools: RegisteredTool[] = [];

    for (const serverConfig of config.servers) {
      try {
        const tools = await this.connectServer(serverConfig);
        allTools.push(...tools);
        console.log(
          `[mcp] Connected to ${serverConfig.name}: ${tools.length} tools`
        );
      } catch (err) {
        console.error(`[mcp] Failed to connect to ${serverConfig.name}:`, err);
      }
    }

    return allTools;
  }

  private async connectServer(
    config: MCPServerConfig
  ): Promise<RegisteredTool[]> {
    const client = new Client({
      name: "gravity-claw",
      version: "0.1.0",
    });

    if (config.transport === "stdio" && config.command) {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
      });
      await client.connect(transport);
    } else if (config.transport === "streamable-http" && config.url) {
      const transport = new StreamableHTTPClientTransport(
        new URL(config.url)
      );
      await client.connect(transport);
    } else {
      throw new Error(`Invalid MCP server config: ${config.name}`);
    }

    this.clients.set(config.name, client);

    // List tools from the server
    const { tools } = await client.listTools();

    return tools.map((tool) => ({
      name: `mcp_${config.name}_${tool.name}`,
      description: `[MCP:${config.name}] ${tool.description || tool.name}`,
      parameters: (tool.inputSchema as Record<string, unknown>) || {
        type: "object",
        properties: {},
      },
      handler: async (args: unknown): Promise<string> => {
        const result = await client.callTool({
          name: tool.name,
          arguments: args as Record<string, unknown>,
        });
        if (result.content && Array.isArray(result.content)) {
          return result.content
            .map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
            .join("\n");
        }
        return JSON.stringify(result);
      },
    }));
  }

  async shutdown(): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        await client.close();
      } catch {
        console.warn(`[mcp] Error closing ${name}`);
      }
    }
    this.clients.clear();
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/tools/mcp-bridge.ts
git commit -m "feat(agent): add MCP tool bridge with stdio and HTTP transports"
```

---

### Task 18: Skills System

**Files:**
- Create: `agent/src/tools/skills.ts`
- Create: `agent/tests/tools/skills.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/tools/skills.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkillsManager, type Skill } from "../src/tools/skills.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("SkillsManager", () => {
  let skillsDir: string;

  beforeEach(() => {
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-"));
  });

  afterEach(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
  });

  it("loads skills from markdown files", () => {
    fs.writeFileSync(
      path.join(skillsDir, "greeting.md"),
      [
        "---",
        "name: greeting",
        "description: Respond to greetings",
        "triggers:",
        "  - hello",
        "  - hi",
        "---",
        "# Greeting",
        "Respond warmly.",
      ].join("\n")
    );

    const manager = new SkillsManager(skillsDir);
    manager.loadAll();
    const skills = manager.getAll();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("greeting");
    expect(skills[0].triggers).toEqual(["hello", "hi"]);
  });

  it("matches skills by trigger", () => {
    fs.writeFileSync(
      path.join(skillsDir, "review.md"),
      [
        "---",
        "name: code-review",
        "description: Review code",
        "triggers:",
        "  - review this code",
        "  - code review",
        "---",
        "When reviewing code, check for bugs.",
      ].join("\n")
    );

    const manager = new SkillsManager(skillsDir);
    manager.loadAll();

    const matched = manager.match("Can you review this code?");
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("code-review");
  });

  it("returns empty for no trigger match", () => {
    fs.writeFileSync(
      path.join(skillsDir, "review.md"),
      [
        "---",
        "name: code-review",
        "description: Review code",
        "triggers:",
        "  - review this code",
        "---",
        "Review instructions.",
      ].join("\n")
    );

    const manager = new SkillsManager(skillsDir);
    manager.loadAll();

    const matched = manager.match("What is the weather?");
    expect(matched).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agent && npx vitest run tests/tools/skills.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement skills manager**

```typescript
// src/tools/skills.ts
import fs from "node:fs";
import path from "node:path";
import { watch } from "chokidar";

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  content: string;
  filePath: string;
}

export class SkillsManager {
  private skills = new Map<string, Skill>();
  private dir: string;
  private watcher: ReturnType<typeof watch> | null = null;

  constructor(dir: string) {
    this.dir = dir;
  }

  loadAll(): void {
    if (!fs.existsSync(this.dir)) return;

    const files = fs.readdirSync(this.dir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      this.loadFile(path.join(this.dir, file));
    }
  }

  private loadFile(filePath: string): void {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const skill = this.parse(raw, filePath);
      if (skill) {
        this.skills.set(skill.name, skill);
      }
    } catch {
      // Skip invalid files
    }
  }

  private parse(raw: string, filePath: string): Skill | null {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) return null;

    const frontmatter = fmMatch[1];
    const content = fmMatch[2].trim();

    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    if (!nameMatch) return null;

    const triggers: string[] = [];
    const triggerSection = frontmatter.match(
      /triggers:\n((?:\s+-\s+.+\n?)*)/
    );
    if (triggerSection) {
      const lines = triggerSection[1].split("\n");
      for (const line of lines) {
        const m = line.match(/^\s+-\s+(.+)/);
        if (m) triggers.push(m[1].trim());
      }
    }

    return {
      name: nameMatch[1].trim(),
      description: descMatch?.[1]?.trim() || "",
      triggers,
      content,
      filePath,
    };
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  match(message: string): Skill[] {
    const lower = message.toLowerCase();
    return this.getAll().filter((skill) =>
      skill.triggers.some((trigger) => lower.includes(trigger.toLowerCase()))
    );
  }

  startWatching(): void {
    if (!fs.existsSync(this.dir)) return;

    this.watcher = watch(this.dir, { ignoreInitial: true });
    this.watcher.on("add", (fp) => {
      if (fp.endsWith(".md")) {
        console.log(`[skills] Loading new skill: ${fp}`);
        this.loadFile(fp);
      }
    });
    this.watcher.on("change", (fp) => {
      if (fp.endsWith(".md")) {
        console.log(`[skills] Reloading skill: ${fp}`);
        this.loadFile(fp);
      }
    });
    this.watcher.on("unlink", (fp) => {
      if (fp.endsWith(".md")) {
        const name = path.basename(fp, ".md");
        // Find and remove by filepath
        for (const [key, skill] of this.skills) {
          if (skill.filePath === fp) {
            this.skills.delete(key);
            console.log(`[skills] Removed skill: ${key}`);
            break;
          }
        }
      }
    });
  }

  stopWatching(): void {
    this.watcher?.close();
    this.watcher = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agent && npx vitest run tests/tools/skills.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add agent/src/tools/skills.ts agent/tests/tools/skills.test.ts
git commit -m "feat(agent): add skills system with markdown parsing and hot-reload"
```

---

### Task 19: Heartbeat System

**Files:**
- Create: `agent/src/heartbeat/index.ts`

- [ ] **Step 1: Implement heartbeat**

```typescript
// src/heartbeat/index.ts
export type EventChecker = () => Promise<string | null>;

export interface HeartbeatOptions {
  intervalMs: number;
  onEvent: (summary: string) => void;
}

export class Heartbeat {
  private checkers: EventChecker[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private opts: HeartbeatOptions;

  constructor(opts: HeartbeatOptions) {
    this.opts = opts;
  }

  registerChecker(checker: EventChecker): void {
    this.checkers.push(checker);
  }

  start(): void {
    this.timer = setInterval(() => this.check(), this.opts.intervalMs);
    console.log(
      `[heartbeat] Started (every ${this.opts.intervalMs / 1000}s)`
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async check(): Promise<void> {
    const events: string[] = [];

    for (const checker of this.checkers) {
      try {
        const result = await checker();
        if (result) events.push(result);
      } catch (err) {
        console.error("[heartbeat] Checker error:", err);
      }
    }

    if (events.length > 0) {
      const summary = events.join("\n");
      this.opts.onEvent(summary);
    }
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add agent/src/heartbeat/index.ts
git commit -m "feat(agent): add heartbeat system with pluggable event checkers"
```

---

### Task 20: Entry Point (Wire Everything)

**Files:**
- Create: `agent/src/index.ts`

- [ ] **Step 1: Implement the entry point that wires all components**

```typescript
// src/index.ts
import { loadConfig } from "./config.js";
import { ToolRegistry } from "./core/tools.js";
import { ZeroGLLMProvider } from "./core/llm.js";
import { AgentLoop } from "./core/agent.js";
import { TelegramChannel } from "./channels/telegram.js";
import { DiscordChannel } from "./channels/discord.js";
import { WhatsAppChannel } from "./channels/whatsapp.js";
import { WebChatChannel } from "./channels/webchat.js";
import type { Channel, IncomingMessage } from "./channels/types.js";
import { readENSRecords, buildSystemPrompt } from "./memory/ens.js";
import { ZeroGMemory } from "./memory/zerog.js";
import { MarkdownMemory } from "./memory/markdown.js";
import { ShellTool } from "./tools/shell.js";
import { WebSearchTool } from "./tools/web-search.js";
import { Scheduler } from "./tools/scheduler.js";
import { MCPBridge } from "./tools/mcp-bridge.js";
import { SkillsManager } from "./tools/skills.js";
import { Heartbeat } from "./heartbeat/index.js";

async function main() {
  console.log("Gravity Claw agent starting...");

  const config = loadConfig();

  // --- Tool Registry ---
  const tools = new ToolRegistry();

  // --- LLM Provider ---
  const llm = new ZeroGLLMProvider({
    privateKey: config.agentPrivateKey,
    rpcUrl: config.rpcUrl,
  });

  try {
    await llm.initialize();
    console.log("[llm] 0G Compute provider initialized");
  } catch (err) {
    console.error("[llm] Failed to initialize 0G Compute:", err);
    console.log("[llm] Agent will fail on LLM calls until resolved");
  }

  // --- Memory ---
  const memory = new ZeroGMemory({
    privateKey: config.agentPrivateKey,
    rpcUrl: config.rpcUrl,
    maxConversations: 50,
  });
  await memory.initialize();

  const markdownMemory = new MarkdownMemory("./data/memory");
  for (const tool of markdownMemory.registerTools()) {
    tools.register(tool);
  }

  // --- ENS Soul ---
  let systemPrompt = "You are a helpful AI assistant.";
  try {
    const ensData = await readENSRecords(config.agentEnsName, config.rpcUrl);
    systemPrompt = buildSystemPrompt({
      soul: ensData.soul,
      personality: ensData.personality,
      skills: [],
    });
    console.log(`[ens] Loaded soul for ${config.agentEnsName}`);
  } catch (err) {
    console.warn("[ens] Could not read ENS records, using default prompt:", err);
  }

  // --- Skills ---
  const skillsManager = new SkillsManager("./skills");
  skillsManager.loadAll();
  skillsManager.startWatching();
  console.log(`[skills] Loaded ${skillsManager.getAll().length} skills`);

  // --- Built-in Tools ---
  const shell = new ShellTool(config.shellAllowlist);
  tools.register(shell.registerTool());

  const webSearch = new WebSearchTool();
  tools.register(webSearch.registerTool());

  // Handler for scheduled/webhook triggers
  const handleSyntheticMessage = (text: string) => {
    // Send to first available channel as a self-message
    handleMessage({
      channelName: "system",
      conversationId: "system",
      userId: "system",
      text,
    });
  };

  const scheduler = new Scheduler("./data", handleSyntheticMessage);
  for (const tool of scheduler.registerTools()) {
    tools.register(tool);
  }

  // --- MCP Bridge ---
  const mcpBridge = new MCPBridge(config.mcpConfigPath);
  const mcpTools = await mcpBridge.initialize();
  for (const tool of mcpTools) {
    tools.register(tool);
  }
  if (mcpTools.length > 0) {
    console.log(`[mcp] Registered ${mcpTools.length} MCP tools`);
  }

  // --- Agent Loop ---
  const agent = new AgentLoop({ llm, tools, systemPrompt });

  // --- Message Handler ---
  async function handleMessage(msg: IncomingMessage) {
    const conv = memory.getOrCreateConversation(
      msg.conversationId,
      msg.channelName,
      msg.userId
    );

    // Check for matching skills and augment prompt
    const matchedSkills = skillsManager.match(msg.text);
    if (matchedSkills.length > 0) {
      const skillInstructions = matchedSkills.map((s) => s.content);
      const augmentedPrompt = buildSystemPrompt({
        soul: systemPrompt,
        personality: null,
        skills: skillInstructions,
      });
      agent.updateSystemPrompt(augmentedPrompt);
    } else {
      agent.updateSystemPrompt(systemPrompt);
    }

    const history = memory.getHistory(msg.conversationId);

    try {
      const response = await agent.run(msg.text, history);

      // Store messages
      memory.addMessage(msg.conversationId, {
        role: "user",
        content: msg.text,
      });
      memory.addMessage(msg.conversationId, {
        role: "assistant",
        content: response.text,
      });

      // Persist async
      memory.persist(msg.conversationId).catch(console.error);

      // Send response back through the originating channel
      const channel = channels.find((c) => c.name === msg.channelName);
      if (channel) {
        await channel.send(msg.conversationId, response);
      }
    } catch (err) {
      console.error(`[agent] Error processing message:`, err);
      const channel = channels.find((c) => c.name === msg.channelName);
      if (channel) {
        await channel.send(msg.conversationId, {
          text: "Sorry, I encountered an error processing your message.",
        });
      }
    }
  }

  // --- Channels ---
  const channels: Channel[] = [];

  if (config.telegramBotToken) {
    const telegram = new TelegramChannel({
      token: config.telegramBotToken,
      allowedUserIds: config.allowedUserIds,
    });
    telegram.onMessage(handleMessage);
    channels.push(telegram);
  }

  if (config.discordBotToken) {
    const discord = new DiscordChannel({
      token: config.discordBotToken,
      allowedUserIds: config.allowedUserIds,
    });
    discord.onMessage(handleMessage);
    channels.push(discord);
  }

  // WhatsApp -- always enabled (uses QR pairing, no token needed)
  const whatsapp = new WhatsAppChannel({
    sessionDir: "./data/whatsapp-session",
    allowedUserIds: config.allowedUserIds,
  });
  whatsapp.onMessage(handleMessage);
  channels.push(whatsapp);

  if (config.enableWeb) {
    const webchat = new WebChatChannel({ port: config.webPort });
    webchat.onMessage(handleMessage);
    channels.push(webchat);
  }

  // Start all channels
  for (const channel of channels) {
    try {
      await channel.start();
    } catch (err) {
      console.error(`[${channel.name}] Failed to start:`, err);
    }
  }

  console.log(
    `[agent] Ready. Channels: ${channels.map((c) => c.name).join(", ")}`
  );
  console.log(`[agent] Tools: ${tools.names().join(", ")}`);

  // --- Heartbeat ---
  const heartbeat = new Heartbeat({
    intervalMs: config.heartbeatInterval,
    onEvent: (summary) => {
      handleSyntheticMessage(`[Heartbeat event]\n${summary}`);
    },
  });
  heartbeat.start();

  // --- Graceful Shutdown ---
  const shutdown = async () => {
    console.log("\nShutting down...");
    heartbeat.stop();
    scheduler.stopAll();
    skillsManager.stopWatching();
    await mcpBridge.shutdown();
    for (const channel of channels) {
      await channel.stop().catch(console.error);
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify compilation**

Run: `cd agent && npx tsc --noEmit`
Expected: No errors (may have warnings about dynamic imports -- those are acceptable)

- [ ] **Step 3: Commit**

```bash
git add agent/src/index.ts
git commit -m "feat(agent): add entry point wiring all components together"
```

---

### Task 21: Docker Deployment

**Files:**
- Create: `agent/Dockerfile`
- Create: `agent/docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY mcp-servers.json ./
COPY skills/ ./skills/
RUN mkdir -p data/memory data/whatsapp-session

ENTRYPOINT ["node", "dist/index.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
services:
  agent:
    build: .
    env_file: .env
    volumes:
      - ./data:/app/data
      - ./skills:/app/skills
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 5s
      retries: 3
```

- [ ] **Step 3: Verify Docker build**

Run: `cd agent && docker build -t gravity-claw .`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add agent/Dockerfile agent/docker-compose.yml
git commit -m "feat(agent): add Docker multi-stage build and compose config"
```

---

### Task 22: Final Integration Test

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd agent && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Verify full TypeScript compilation**

Run: `cd agent && npx tsc`
Expected: No errors, `dist/` directory created

- [ ] **Step 3: Verify the agent starts (dry run)**

Create a temporary `.env` with dummy values:
```bash
cd agent && echo 'AGENT_PRIVATE_KEY=0xababababababababababababababababababababababababababababababababab
AGENT_ENS_NAME=test.caas.eth' > .env.test
```

Run: `cd agent && DOTENV_CONFIG_PATH=.env.test timeout 5 node dist/index.js || true`
Expected: Agent prints startup messages, fails gracefully on network calls, then exits from timeout

- [ ] **Step 4: Clean up and final commit**

```bash
rm -f agent/.env.test
git add -A agent/
git commit -m "feat(agent): complete Gravity Claw agent runtime v0.1.0"
```

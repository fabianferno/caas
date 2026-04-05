# Skill and MCP Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime skill management and MCP server management to the CaaS agent, accessible via agent chat tools (owner-only) and a REST API for the miniapp.

**Architecture:** Extend `ToolRegistry` with a per-message user context so tool handlers can check ownership. Add two new tool classes (`SkillManagerTool`, `MCPManagerTool`) that write files and mutate live connections. Expose a REST API (`AgentAPI`) mounted on the existing WebChat express server for miniapp integration.

**Tech Stack:** TypeScript, Vitest, Express 5, Node.js fs, chokidar (already watching skills dir), @modelcontextprotocol/sdk

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/core/tools.ts` | Modify | Add `setContext`, `getContext`, `unregister` |
| `src/tools/mcp-bridge.ts` | Modify | Add `addServer`, `removeServer`, `serverTools` tracking |
| `src/tools/skill-manager.ts` | Create | `SkillManagerTool` - skill_add, skill_remove, skill_list |
| `src/tools/mcp-manager.ts` | Create | `MCPManagerTool` - mcp_add_server, mcp_remove_server, mcp_list_servers |
| `src/api/index.ts` | Create | `AgentAPI` - REST endpoints mounted on WebChat express app |
| `src/channels/webchat.ts` | Modify | Add `getApp()` to expose express instance before listen |
| `src/index.ts` | Modify | Extract `processMessage`, wire new tools, mount `AgentAPI` |
| `tests/core/tools.test.ts` | Modify | Add tests for setContext, getContext, unregister |
| `tests/tools/skill-manager.test.ts` | Create | Unit tests for SkillManagerTool |
| `tests/tools/mcp-manager.test.ts` | Create | Unit tests for MCPManagerTool |
| `tests/api/index.test.ts` | Create | HTTP endpoint tests for AgentAPI |

---

## Task 1: Extend ToolRegistry with context and unregister

**Files:**
- Modify: `src/core/tools.ts`
- Modify: `tests/core/tools.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/core/tools.test.ts`:

```ts
describe("ToolRegistry context", () => {
  it("returns empty context by default", () => {
    const registry = new ToolRegistry();
    expect(registry.getContext()).toEqual({});
  });

  it("stores and retrieves context", () => {
    const registry = new ToolRegistry();
    registry.setContext({ userId: "user-123" });
    expect(registry.getContext()).toEqual({ userId: "user-123" });
  });

  it("overwrites previous context on setContext", () => {
    const registry = new ToolRegistry();
    registry.setContext({ userId: "a" });
    registry.setContext({ userId: "b" });
    expect(registry.getContext().userId).toBe("b");
  });
});

describe("ToolRegistry unregister", () => {
  it("removes a registered tool", () => {
    const registry = new ToolRegistry();
    registry.register({ name: "temp", description: "x", parameters: {}, handler: async () => "" });
    expect(registry.has("temp")).toBe(true);
    registry.unregister("temp");
    expect(registry.has("temp")).toBe(false);
  });

  it("is a no-op for unknown tool name", () => {
    const registry = new ToolRegistry();
    expect(() => registry.unregister("does-not-exist")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agent && pnpm test tests/core/tools.test.ts
```

Expected: FAIL - `registry.getContext is not a function`

- [ ] **Step 3: Add context and unregister to ToolRegistry**

In `src/core/tools.ts`, add a `context` field and three methods:

```ts
export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private context: Record<string, unknown> = {};  // <-- add this

  register(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {                 // <-- add this
    this.tools.delete(name);
  }

  setContext(ctx: Record<string, unknown>): void { // <-- add this
    this.context = ctx;
  }

  getContext(): Record<string, unknown> {          // <-- add this
    return this.context;
  }

  // ... rest unchanged
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd agent && pnpm test tests/core/tools.test.ts
```

Expected: PASS - all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add agent/src/core/tools.ts agent/tests/core/tools.test.ts
git commit -m "feat(agent): add setContext, getContext, unregister to ToolRegistry"
```

---

## Task 2: Create SkillManagerTool

**Files:**
- Create: `src/tools/skill-manager.ts`
- Create: `tests/tools/skill-manager.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/skill-manager.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SkillsManager } from "../../src/tools/skills.js";
import { SkillManagerTool } from "../../src/tools/skill-manager.js";
import { ToolRegistry } from "../../src/core/tools.js";

describe("SkillManagerTool", () => {
  let skillsDir: string;
  let registry: ToolRegistry;
  let skillsManager: SkillsManager;
  let tool: SkillManagerTool;
  const OWNER_ID = "owner-abc";

  beforeEach(() => {
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-mgr-"));
    registry = new ToolRegistry();
    skillsManager = new SkillsManager(skillsDir);
    skillsManager.loadAll();
    tool = new SkillManagerTool(skillsManager, skillsDir, registry, [OWNER_ID]);
  });

  afterEach(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
  });

  const getHandler = (name: string) => {
    const t = tool.registerTools().find((t) => t.name === name)!;
    return t.handler;
  };

  describe("skill_add", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const result = await getHandler("skill_add")({
        name: "test", description: "d", triggers: ["hi"], content: "content"
      });
      expect(result).toContain("Error:");
    });

    it("rejects invalid name", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_add")({
        name: "bad name!", description: "d", triggers: ["hi"], content: "content"
      });
      expect(result).toContain("Error:");
    });

    it("writes skill file with correct frontmatter", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_add")({
        name: "my-skill",
        description: "Does something",
        triggers: ["do it", "run it"],
        content: "# My Skill\nDo the thing.",
      });
      expect(result).toContain("my-skill");
      const filePath = path.join(skillsDir, "my-skill.md");
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("name: my-skill");
      expect(content).toContain("description: Does something");
      expect(content).toContain("  - do it");
      expect(content).toContain("  - run it");
      expect(content).toContain("# My Skill");
    });

    it("overwrites existing skill file", async () => {
      registry.setContext({ userId: OWNER_ID });
      await getHandler("skill_add")({ name: "dup", description: "v1", triggers: ["a"], content: "v1" });
      await getHandler("skill_add")({ name: "dup", description: "v2", triggers: ["b"], content: "v2" });
      const content = fs.readFileSync(path.join(skillsDir, "dup.md"), "utf-8");
      expect(content).toContain("description: v2");
    });
  });

  describe("skill_remove", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const result = await getHandler("skill_remove")({ name: "any" });
      expect(result).toContain("Error:");
    });

    it("returns error for missing skill", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_remove")({ name: "nonexistent" });
      expect(result).toContain("Error:");
    });

    it("deletes the skill file", async () => {
      registry.setContext({ userId: OWNER_ID });
      fs.writeFileSync(path.join(skillsDir, "bye.md"), "---\nname: bye\ndescription: x\ntriggers:\n  - bye\n---\ncontent");
      const result = await getHandler("skill_remove")({ name: "bye" });
      expect(result).toContain("bye");
      expect(fs.existsSync(path.join(skillsDir, "bye.md"))).toBe(false);
    });
  });

  describe("skill_list", () => {
    it("returns loaded skills as JSON", async () => {
      fs.writeFileSync(
        path.join(skillsDir, "greet.md"),
        "---\nname: greet\ndescription: Greet user\ntriggers:\n  - hello\n---\nGreet warmly."
      );
      skillsManager.loadAll();
      const result = await getHandler("skill_list")({});
      const parsed = JSON.parse(result as string);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("greet");
      expect(parsed[0].triggers).toEqual(["hello"]);
    });

    it("returns empty array when no skills loaded", async () => {
      const result = await getHandler("skill_list")({});
      const parsed = JSON.parse(result as string);
      expect(parsed).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agent && pnpm test tests/tools/skill-manager.test.ts
```

Expected: FAIL - `Cannot find module '../../src/tools/skill-manager.js'`

- [ ] **Step 3: Implement SkillManagerTool**

Create `src/tools/skill-manager.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type { RegisteredTool } from "../core/tools.js";
import type { ToolRegistry } from "../core/tools.js";
import type { SkillsManager } from "./skills.js";

export class SkillManagerTool {
  private skillsManager: SkillsManager;
  private skillsDir: string;
  private registry: ToolRegistry;
  private allowedUserIds: Set<string>;

  constructor(
    skillsManager: SkillsManager,
    skillsDir: string,
    registry: ToolRegistry,
    allowedUserIds: string[]
  ) {
    this.skillsManager = skillsManager;
    this.skillsDir = skillsDir;
    this.registry = registry;
    this.allowedUserIds = new Set(allowedUserIds);
  }

  private isOwner(): boolean {
    const userId = this.registry.getContext().userId as string | undefined;
    if (!userId || this.allowedUserIds.size === 0) return false;
    return this.allowedUserIds.has(userId);
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "skill_add",
        description: "Add a new skill to the agent. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name (alphanumeric and hyphens only)" },
            description: { type: "string", description: "What this skill does" },
            triggers: {
              type: "array",
              items: { type: "string" },
              description: "Phrases that activate this skill",
            },
            content: { type: "string", description: "Skill instructions in markdown" },
          },
          required: ["name", "description", "triggers", "content"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage skills.";
          const { name, description, triggers, content } = args as {
            name: string;
            description: string;
            triggers: string[];
            content: string;
          };
          if (!/^[a-zA-Z0-9-]+$/.test(name)) {
            return "Error: Skill name must be alphanumeric with hyphens only.";
          }
          const triggerLines = triggers.map((t) => `  - ${t}`).join("\n");
          const md = `---\nname: ${name}\ndescription: ${description}\ntriggers:\n${triggerLines}\n---\n${content}`;
          fs.writeFileSync(path.join(this.skillsDir, `${name}.md`), md, "utf-8");
          return `Skill "${name}" added successfully.`;
        },
      },
      {
        name: "skill_remove",
        description: "Remove a skill by name. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name to remove" },
          },
          required: ["name"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage skills.";
          const filePath = path.join(this.skillsDir, `${args.name}.md`);
          if (!fs.existsSync(filePath)) return `Error: Skill "${args.name}" not found.`;
          fs.unlinkSync(filePath);
          return `Skill "${args.name}" removed.`;
        },
      },
      {
        name: "skill_list",
        description: "List all currently loaded skills.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          const skills = this.skillsManager.getAll().map((s) => ({
            name: s.name,
            description: s.description,
            triggers: s.triggers,
          }));
          return JSON.stringify(skills, null, 2);
        },
      },
    ];
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd agent && pnpm test tests/tools/skill-manager.test.ts
```

Expected: PASS - all tests green

- [ ] **Step 5: Commit**

```bash
git add agent/src/tools/skill-manager.ts agent/tests/tools/skill-manager.test.ts
git commit -m "feat(agent): add SkillManagerTool for runtime skill management"
```

---

## Task 3: Extend MCPBridge with addServer and removeServer

**Files:**
- Modify: `src/tools/mcp-bridge.ts`
- Create: `tests/tools/mcp-bridge.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/mcp-bridge.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MCPBridge } from "../../src/tools/mcp-bridge.js";

describe("MCPBridge", () => {
  let configPath: string;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-bridge-"));
    configPath = path.join(tmpDir, "mcp-servers.json");
    fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("initializes with empty config without error", async () => {
    const bridge = new MCPBridge(configPath);
    const tools = await bridge.initialize();
    expect(tools).toEqual([]);
  });

  it("initializes gracefully when config file missing", async () => {
    const bridge = new MCPBridge(path.join(tmpDir, "missing.json"));
    const tools = await bridge.initialize();
    expect(tools).toEqual([]);
  });

  it("removeServer throws when server not found", async () => {
    const bridge = new MCPBridge(configPath);
    await bridge.initialize();
    await expect(bridge.removeServer("nonexistent")).rejects.toThrow(
      'MCP server "nonexistent" not found'
    );
  });

  it("addServer throws when server already connected", async () => {
    // We can't connect a real server in unit tests, but we can verify the
    // duplicate-name guard by patching the internal clients map.
    const bridge = new MCPBridge(configPath);
    await bridge.initialize();
    // Force-add a fake client entry to simulate an already-connected server
    (bridge as any).clients.set("fake", {});
    await expect(
      bridge.addServer({ name: "fake", transport: "stdio", command: "echo" })
    ).rejects.toThrow('"fake" is already connected');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agent && pnpm test tests/tools/mcp-bridge.test.ts
```

Expected: FAIL - `bridge.removeServer is not a function`

- [ ] **Step 3: Add serverTools tracking and public addServer/removeServer to MCPBridge**

Replace `src/tools/mcp-bridge.ts` with:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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
  private serverTools = new Map<string, string[]>();
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
    if (!config.servers || config.servers.length === 0) return [];

    const allTools: RegisteredTool[] = [];
    for (const serverConfig of config.servers) {
      try {
        const tools = await this.connectServer(serverConfig);
        this.serverTools.set(serverConfig.name, tools.map((t) => t.name));
        allTools.push(...tools);
        console.log(`[mcp] Connected to ${serverConfig.name}: ${tools.length} tools`);
      } catch (err) {
        console.error(`[mcp] Failed to connect to ${serverConfig.name}:`, err);
      }
    }
    return allTools;
  }

  async addServer(config: MCPServerConfig): Promise<RegisteredTool[]> {
    if (this.clients.has(config.name)) {
      throw new Error(`MCP server "${config.name}" is already connected.`);
    }
    const tools = await this.connectServer(config);
    this.serverTools.set(config.name, tools.map((t) => t.name));
    console.log(`[mcp] Connected to ${config.name}: ${tools.length} tools`);
    return tools;
  }

  async removeServer(name: string): Promise<string[]> {
    const client = this.clients.get(name);
    if (!client) throw new Error(`MCP server "${name}" not found.`);
    try { await client.close(); } catch { console.warn(`[mcp] Error closing ${name}`); }
    this.clients.delete(name);
    const toolNames = this.serverTools.get(name) ?? [];
    this.serverTools.delete(name);
    return toolNames;
  }

  private async connectServer(config: MCPServerConfig): Promise<RegisteredTool[]> {
    const client = new Client({ name: "gravity-claw", version: "0.1.0" });

    if (config.transport === "stdio" && config.command) {
      const transport = new StdioClientTransport({ command: config.command, args: config.args || [] });
      await client.connect(transport);
    } else if (config.transport === "streamable-http" && config.url) {
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const transport = new StreamableHTTPClientTransport(new URL(config.url));
      await client.connect(transport);
    } else {
      throw new Error(`Invalid MCP server config: ${config.name}`);
    }

    this.clients.set(config.name, client);
    const { tools } = await client.listTools();

    return tools.map((tool) => ({
      name: `mcp_${config.name}_${tool.name}`,
      description: `[MCP:${config.name}] ${tool.description || tool.name}`,
      parameters: (tool.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
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
      try { await client.close(); } catch { console.warn(`[mcp] Error closing ${name}`); }
    }
    this.clients.clear();
    this.serverTools.clear();
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd agent && pnpm test tests/tools/mcp-bridge.test.ts
```

Expected: PASS - all 4 tests green

- [ ] **Step 5: Commit**

```bash
git add agent/src/tools/mcp-bridge.ts agent/tests/tools/mcp-bridge.test.ts
git commit -m "feat(agent): add addServer, removeServer to MCPBridge"
```

---

## Task 4: Create MCPManagerTool

**Files:**
- Create: `src/tools/mcp-manager.ts`
- Create: `tests/tools/mcp-manager.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tools/mcp-manager.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MCPManagerTool } from "../../src/tools/mcp-manager.js";
import { ToolRegistry } from "../../src/core/tools.js";

// Minimal MCPBridge stub
const makeBridgeStub = (overrides: Partial<{ addServer: any; removeServer: any }> = {}) => ({
  addServer: overrides.addServer ?? (async () => []),
  removeServer: overrides.removeServer ?? (async () => []),
});

describe("MCPManagerTool", () => {
  let tmpDir: string;
  let configPath: string;
  let registry: ToolRegistry;
  const OWNER_ID = "owner-xyz";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-mgr-"));
    configPath = path.join(tmpDir, "mcp-servers.json");
    fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));
    registry = new ToolRegistry();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const buildTool = (bridgeOverrides = {}) => {
    const bridge = makeBridgeStub(bridgeOverrides) as any;
    return new MCPManagerTool(bridge, registry, configPath, [OWNER_ID]);
  };

  const getHandler = (tool: MCPManagerTool, name: string) =>
    tool.registerTools().find((t) => t.name === name)!.handler;

  describe("mcp_list_servers", () => {
    it("returns empty array when no servers configured", async () => {
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_list_servers")({});
      expect(JSON.parse(result as string)).toEqual([]);
    });

    it("returns servers from config file", async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "my-server", transport: "stdio", command: "node" }] })
      );
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_list_servers")({});
      const servers = JSON.parse(result as string);
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("my-server");
    });
  });

  describe("mcp_add_server", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_add_server")({
        name: "s", transport: "stdio", command: "echo"
      });
      expect(result).toContain("Error:");
    });

    it("persists server to config on success", async () => {
      registry.setContext({ userId: OWNER_ID });
      const tool = buildTool({
        addServer: async () => [
          { name: "mcp_s_tool", description: "d", parameters: {}, handler: async () => "" }
        ],
      });
      await getHandler(tool, "mcp_add_server")({ name: "s", transport: "stdio", command: "echo" });
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].name).toBe("s");
    });

    it("registers returned tools on ToolRegistry", async () => {
      registry.setContext({ userId: OWNER_ID });
      const tool = buildTool({
        addServer: async () => [
          { name: "mcp_s_mytool", description: "d", parameters: {}, handler: async () => "ok" }
        ],
      });
      await getHandler(tool, "mcp_add_server")({ name: "s", transport: "stdio", command: "echo" });
      expect(registry.has("mcp_s_mytool")).toBe(true);
    });

    it("returns error string when bridge throws, does not persist", async () => {
      registry.setContext({ userId: OWNER_ID });
      const tool = buildTool({
        addServer: async () => { throw new Error("connect failed"); },
      });
      const result = await getHandler(tool, "mcp_add_server")({
        name: "s", transport: "stdio", command: "bad"
      });
      expect(result).toContain("connect failed");
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.servers).toHaveLength(0);
    });
  });

  describe("mcp_remove_server", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_remove_server")({ name: "s" });
      expect(result).toContain("Error:");
    });

    it("unregisters tools and removes from config", async () => {
      registry.setContext({ userId: OWNER_ID });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "s", transport: "stdio", command: "node" }] })
      );
      registry.register({ name: "mcp_s_tool", description: "d", parameters: {}, handler: async () => "" });
      const tool = buildTool({
        removeServer: async () => ["mcp_s_tool"],
      });
      await getHandler(tool, "mcp_remove_server")({ name: "s" });
      expect(registry.has("mcp_s_tool")).toBe(false);
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.servers).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agent && pnpm test tests/tools/mcp-manager.test.ts
```

Expected: FAIL - `Cannot find module '../../src/tools/mcp-manager.js'`

- [ ] **Step 3: Implement MCPManagerTool**

Create `src/tools/mcp-manager.ts`:

```ts
import fs from "node:fs";
import type { RegisteredTool, ToolRegistry } from "../core/tools.js";
import type { MCPBridge } from "./mcp-bridge.js";

interface MCPServerConfig {
  name: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
}

export class MCPManagerTool {
  private mcpBridge: MCPBridge;
  private registry: ToolRegistry;
  private configPath: string;
  private allowedUserIds: Set<string>;

  constructor(
    mcpBridge: MCPBridge,
    registry: ToolRegistry,
    configPath: string,
    allowedUserIds: string[]
  ) {
    this.mcpBridge = mcpBridge;
    this.registry = registry;
    this.configPath = configPath;
    this.allowedUserIds = new Set(allowedUserIds);
  }

  private isOwner(): boolean {
    const userId = this.registry.getContext().userId as string | undefined;
    if (!userId || this.allowedUserIds.size === 0) return false;
    return this.allowedUserIds.has(userId);
  }

  private readConfig(): { servers: MCPServerConfig[] } {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
    } catch {
      return { servers: [] };
    }
  }

  private writeConfig(config: { servers: MCPServerConfig[] }): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "mcp_add_server",
        description: "Add and connect a new MCP server at runtime. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Unique server name" },
            transport: {
              type: "string",
              enum: ["stdio", "streamable-http"],
              description: "Connection type",
            },
            command: { type: "string", description: "Command to run (stdio only)" },
            args: { type: "array", items: { type: "string" }, description: "Command args (stdio only)" },
            url: { type: "string", description: "Server URL (streamable-http only)" },
          },
          required: ["name", "transport"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage MCP servers.";
          const serverConfig: MCPServerConfig = {
            name: args.name,
            transport: args.transport,
            ...(args.command && { command: args.command }),
            ...(args.args && { args: args.args }),
            ...(args.url && { url: args.url }),
          };
          let tools: RegisteredTool[];
          try {
            tools = await this.mcpBridge.addServer(serverConfig);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
          for (const tool of tools) this.registry.register(tool);
          const config = this.readConfig();
          config.servers.push(serverConfig);
          this.writeConfig(config);
          return `MCP server "${args.name}" connected with ${tools.length} tools: ${tools.map((t) => t.name).join(", ") || "none"}`;
        },
      },
      {
        name: "mcp_remove_server",
        description: "Disconnect and remove an MCP server. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Server name to remove" },
          },
          required: ["name"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage MCP servers.";
          let toolNames: string[];
          try {
            toolNames = await this.mcpBridge.removeServer(args.name);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
          for (const name of toolNames) this.registry.unregister(name);
          const config = this.readConfig();
          config.servers = config.servers.filter((s) => s.name !== args.name);
          this.writeConfig(config);
          return `MCP server "${args.name}" removed. Unregistered tools: ${toolNames.join(", ") || "none"}`;
        },
      },
      {
        name: "mcp_list_servers",
        description: "List all configured MCP servers.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          const config = this.readConfig();
          return JSON.stringify(config.servers, null, 2);
        },
      },
    ];
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd agent && pnpm test tests/tools/mcp-manager.test.ts
```

Expected: PASS - all tests green

- [ ] **Step 5: Commit**

```bash
git add agent/src/tools/mcp-manager.ts agent/tests/tools/mcp-manager.test.ts
git commit -m "feat(agent): add MCPManagerTool for runtime MCP server management"
```

---

## Task 5: Add getApp() to WebChatChannel and create AgentAPI

**Files:**
- Modify: `src/channels/webchat.ts`
- Create: `src/api/index.ts`
- Create: `tests/api/index.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api/index.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import express from "express";
import { AgentAPI } from "../../src/api/index.js";

const makeSkillsManagerStub = (skills: any[] = []) => ({
  getAll: () => skills,
});

const makeMCPBridgeStub = (overrides: any = {}) => ({
  addServer: overrides.addServer ?? (async () => []),
  removeServer: overrides.removeServer ?? (async () => []),
});

const makeRegistryStub = () => ({
  register: () => {},
  unregister: () => {},
});

async function startServer(app: express.Application): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, port });
    });
  });
}

async function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe("AgentAPI", () => {
  let tmpDir: string;
  let configPath: string;
  let skillsDir: string;
  let app: express.Application;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-api-"));
    configPath = path.join(tmpDir, "mcp-servers.json");
    skillsDir = path.join(tmpDir, "skills");
    fs.mkdirSync(skillsDir);
    fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));

    app = express();
    app.use(express.json());

    new AgentAPI({
      app,
      skillsManager: makeSkillsManagerStub() as any,
      skillsDir,
      mcpBridge: makeMCPBridgeStub() as any,
      configPath,
      registry: makeRegistryStub() as any,
      processMessage: async (msg: any) => ({ text: `echo: ${msg.text}` }),
    });

    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await stopServer(server);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const url = (p: string) => `http://localhost:${port}${p}`;

  describe("POST /chat", () => {
    it("returns agent response", async () => {
      const res = await fetch(url("/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: "c1", userId: "u1", text: "hello" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.text).toBe("echo: hello");
    });

    it("returns 400 when fields missing", async () => {
      const res = await fetch(url("/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /skills", () => {
    it("returns skills list", async () => {
      const skillsManager = makeSkillsManagerStub([
        { name: "greet", description: "Greet user", triggers: ["hi"] },
      ]) as any;
      const localApp = express();
      localApp.use(express.json());
      new AgentAPI({
        app: localApp,
        skillsManager,
        skillsDir,
        mcpBridge: makeMCPBridgeStub() as any,
        configPath,
        registry: makeRegistryStub() as any,
        processMessage: async () => ({ text: "" }),
      });
      const { server: s2, port: p2 } = await startServer(localApp);
      const res = await fetch(`http://localhost:${p2}/skills`);
      const body = await res.json();
      await stopServer(s2);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("greet");
    });
  });

  describe("POST /skills", () => {
    it("writes skill file", async () => {
      const res = await fetch(url("/skills"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "my-skill",
          description: "Does things",
          triggers: ["do it"],
          content: "Do the thing.",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, "my-skill.md"))).toBe(true);
    });

    it("returns 400 for invalid skill name", async () => {
      const res = await fetch(url("/skills"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "bad name!",
          description: "x",
          triggers: ["x"],
          content: "x",
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /skills/:name", () => {
    it("deletes skill file", async () => {
      const filePath = path.join(skillsDir, "old.md");
      fs.writeFileSync(filePath, "content");
      const res = await fetch(url("/skills/old"), { method: "DELETE" });
      expect(res.status).toBe(200);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("returns 404 for missing skill", async () => {
      const res = await fetch(url("/skills/nope"), { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /mcp", () => {
    it("returns servers from config", async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "srv", transport: "stdio" }] })
      );
      const res = await fetch(url("/mcp"));
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("srv");
    });
  });

  describe("POST /mcp", () => {
    it("returns 400 when name missing", async () => {
      const res = await fetch(url("/mcp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport: "stdio" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns ok and toolsAdded on success", async () => {
      const localApp = express();
      localApp.use(express.json());
      new AgentAPI({
        app: localApp,
        skillsManager: makeSkillsManagerStub() as any,
        skillsDir,
        mcpBridge: makeMCPBridgeStub({
          addServer: async () => [
            { name: "mcp_s_t", description: "d", parameters: {}, handler: async () => "" }
          ],
        }) as any,
        configPath,
        registry: makeRegistryStub() as any,
        processMessage: async () => ({ text: "" }),
      });
      const { server: s2, port: p2 } = await startServer(localApp);
      const res = await fetch(`http://localhost:${p2}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "s", transport: "stdio", command: "echo" }),
      });
      const body = await res.json();
      await stopServer(s2);
      expect(body.ok).toBe(true);
      expect(body.toolsAdded).toContain("mcp_s_t");
    });
  });

  describe("DELETE /mcp/:name", () => {
    it("removes server and returns toolsRemoved", async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "s", transport: "stdio" }] })
      );
      const localApp = express();
      localApp.use(express.json());
      new AgentAPI({
        app: localApp,
        skillsManager: makeSkillsManagerStub() as any,
        skillsDir,
        mcpBridge: makeMCPBridgeStub({ removeServer: async () => ["mcp_s_tool"] }) as any,
        configPath,
        registry: makeRegistryStub() as any,
        processMessage: async () => ({ text: "" }),
      });
      const { server: s2, port: p2 } = await startServer(localApp);
      const res = await fetch(`http://localhost:${p2}/mcp/s`, { method: "DELETE" });
      const body = await res.json();
      await stopServer(s2);
      expect(body.ok).toBe(true);
      expect(body.toolsRemoved).toContain("mcp_s_tool");
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agent && pnpm test tests/api/index.test.ts
```

Expected: FAIL - `Cannot find module '../../src/api/index.js'`

- [ ] **Step 3: Add getApp() to WebChatChannel**

In `src/channels/webchat.ts`, move the express app creation out of `start()` into a lazily-initialized property:

```ts
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
  private app: express.Application;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private handler: MessageHandler | null = null;
  private connections = new Map<string, WebSocket>();

  constructor(opts: WebChatChannelOptions) {
    this.port = opts.port;
    this.app = express();
    this.app.use(express.json());
    this.app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
  }

  getApp(): express.Application {
    return this.app;
  }

  async start(): Promise<void> {
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws) => {
      let conversationId: string | null = null;

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(String(raw)) as WSMessage;
          conversationId = data.conversationId;
          this.connections.set(conversationId, ws);

          if (data.type === "message" && this.handler) {
            const msg: IncomingMessage = {
              channelName: "webchat",
              conversationId: data.conversationId,
              userId: data.token,
              text: data.content,
            };
            this.handler(msg);
          }
        } catch {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        if (conversationId) this.connections.delete(conversationId);
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
    ws.send(JSON.stringify({
      type: "message",
      conversationId,
      content: response.text,
    }));
  }

  getServer(): http.Server | null {
    return this.server;
  }
}
```

- [ ] **Step 4: Create AgentAPI**

Create `src/api/index.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type express from "express";
import type { SkillsManager } from "../tools/skills.js";
import type { MCPBridge } from "../tools/mcp-bridge.js";
import type { ToolRegistry } from "../core/tools.js";
import type { IncomingMessage } from "../channels/types.js";
import type { AgentResponse } from "../core/types.js";

export type ProcessMessageFn = (msg: IncomingMessage) => Promise<AgentResponse>;

interface AgentAPIOptions {
  app: express.Application;
  skillsManager: SkillsManager;
  skillsDir: string;
  mcpBridge: MCPBridge;
  configPath: string;
  registry: ToolRegistry;
  processMessage: ProcessMessageFn;
}

export class AgentAPI {
  private skillsManager: SkillsManager;
  private skillsDir: string;
  private mcpBridge: MCPBridge;
  private configPath: string;
  private registry: ToolRegistry;
  private processMessage: ProcessMessageFn;

  constructor(opts: AgentAPIOptions) {
    this.skillsManager = opts.skillsManager;
    this.skillsDir = opts.skillsDir;
    this.mcpBridge = opts.mcpBridge;
    this.configPath = opts.configPath;
    this.registry = opts.registry;
    this.processMessage = opts.processMessage;
    this.mountRoutes(opts.app);
  }

  private readMCPConfig(): { servers: unknown[] } {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
    } catch {
      return { servers: [] };
    }
  }

  private writeMCPConfig(config: { servers: unknown[] }): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  private mountRoutes(app: express.Application): void {
    // POST /chat
    app.post("/chat", async (req, res) => {
      const { conversationId, userId, text } = req.body ?? {};
      if (!conversationId || !userId || !text) {
        res.status(400).json({ error: "conversationId, userId, and text are required" });
        return;
      }
      try {
        const response = await this.processMessage({
          channelName: "http",
          conversationId,
          userId,
          text,
        });
        res.json({ text: response.text });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // GET /skills
    app.get("/skills", (_req, res) => {
      const skills = this.skillsManager.getAll().map((s) => ({
        name: s.name,
        description: s.description,
        triggers: s.triggers,
      }));
      res.json(skills);
    });

    // POST /skills
    app.post("/skills", (req, res) => {
      const { name, description, triggers, content } = req.body ?? {};
      if (!name || !description || !triggers || !content) {
        res.status(400).json({ error: "name, description, triggers, and content are required" });
        return;
      }
      if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        res.status(400).json({ error: "Skill name must be alphanumeric with hyphens only" });
        return;
      }
      const triggerLines = (triggers as string[]).map((t: string) => `  - ${t}`).join("\n");
      const md = `---\nname: ${name}\ndescription: ${description}\ntriggers:\n${triggerLines}\n---\n${content}`;
      fs.writeFileSync(path.join(this.skillsDir, `${name}.md`), md, "utf-8");
      res.json({ ok: true });
    });

    // DELETE /skills/:name
    app.delete("/skills/:name", (req, res) => {
      const filePath = path.join(this.skillsDir, `${req.params.name}.md`);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: `Skill "${req.params.name}" not found` });
        return;
      }
      fs.unlinkSync(filePath);
      res.json({ ok: true });
    });

    // GET /mcp
    app.get("/mcp", (_req, res) => {
      const config = this.readMCPConfig();
      res.json(config.servers);
    });

    // POST /mcp
    app.post("/mcp", async (req, res) => {
      const { name, transport, command, args, url } = req.body ?? {};
      if (!name || !transport) {
        res.status(400).json({ error: "name and transport are required" });
        return;
      }
      try {
        const tools = await this.mcpBridge.addServer({ name, transport, command, args, url });
        for (const tool of tools) this.registry.register(tool);
        const config = this.readMCPConfig();
        config.servers.push({ name, transport, command, args, url });
        this.writeMCPConfig(config);
        res.json({ ok: true, toolsAdded: tools.map((t: any) => t.name) });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // DELETE /mcp/:name
    app.delete("/mcp/:name", async (req, res) => {
      try {
        const toolNames = await this.mcpBridge.removeServer(req.params.name);
        for (const toolName of toolNames) this.registry.unregister(toolName);
        const config = this.readMCPConfig();
        config.servers = config.servers.filter((s: any) => s.name !== req.params.name);
        this.writeMCPConfig(config);
        res.json({ ok: true, toolsRemoved: toolNames });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd agent && pnpm test tests/api/index.test.ts
```

Expected: PASS - all tests green

- [ ] **Step 6: Commit**

```bash
git add agent/src/channels/webchat.ts agent/src/api/index.ts agent/tests/api/index.test.ts
git commit -m "feat(agent): add AgentAPI REST endpoints and getApp() to WebChatChannel"
```

---

## Task 6: Wire everything in index.ts

**Files:**
- Modify: `src/index.ts`

This task has no unit test - verify manually by running the agent and confirming startup logs.

- [ ] **Step 1: Refactor handleMessage into processMessage + wire new tools**

Replace `src/index.ts` with:

```ts
import { loadConfig } from "./config.js";
import { ToolRegistry } from "./core/tools.js";
import { ZeroGLLMProvider, BedrockLLMProvider, FallbackLLMProvider } from "./core/llm.js";
import { AgentLoop } from "./core/agent.js";
import { TelegramChannel } from "./channels/telegram.js";
import { DiscordChannel } from "./channels/discord.js";
import { WhatsAppChannel } from "./channels/whatsapp.js";
import { WebChatChannel } from "./channels/webchat.js";
import type { Channel, IncomingMessage } from "./channels/types.js";
import type { AgentResponse } from "./core/types.js";
import { ensureAgentENS, readENSRecords, buildSystemPrompt } from "./memory/ens.js";
import { ENSSoulTool } from "./tools/ens-soul.js";
import { ZeroGMemory } from "./memory/zerog.js";
import { MarkdownMemory } from "./memory/markdown.js";
import { ShellTool } from "./tools/shell.js";
import { WebSearchTool } from "./tools/web-search.js";
import { Scheduler } from "./tools/scheduler.js";
import { MCPBridge } from "./tools/mcp-bridge.js";
import { SkillsManager } from "./tools/skills.js";
import { SkillManagerTool } from "./tools/skill-manager.js";
import { MCPManagerTool } from "./tools/mcp-manager.js";
import { AgentAPI } from "./api/index.js";
import { Heartbeat } from "./heartbeat/index.js";

async function main() {
  console.log("Gravity Claw agent starting...");
  const config = loadConfig();

  // Tool Registry
  const tools = new ToolRegistry();

  // LLM Provider (0G Compute primary, Bedrock fallback)
  const zeroG = new ZeroGLLMProvider({ privateKey: config.agentPrivateKey, rpcUrl: config.rpcUrl });
  const bedrock = new BedrockLLMProvider({
    region: config.awsRegion,
    accessKeyId: config.awsAccessKeyId || "",
    secretAccessKey: config.awsSecretAccessKey || "",
    model: config.bedrockModel,
  });
  const llm = new FallbackLLMProvider(zeroG, bedrock);
  await llm.initialize();

  // Memory
  const memory = new ZeroGMemory({ privateKey: config.agentPrivateKey, rpcUrl: config.rpcUrl, maxConversations: 50 });
  await memory.initialize();

  const markdownMemory = new MarkdownMemory("./data/memory");
  for (const tool of markdownMemory.registerTools()) tools.register(tool);

  // ENS: ensure caas.eth and agent subname are registered on Sepolia
  try {
    await ensureAgentENS(config.agentName, config.agentPrivateKey, config.deployerPrivateKey, config.ethRpcUrl);
  } catch (err) {
    console.warn("[ens] Could not ensure ENS registration:", err);
  }

  // ENS Soul
  const SOUL_SETUP_PROMPT = `You are a configurable AI agent platform called CaaS (Character-as-a-Service). Your ENS name is ${config.agentEnsName} on Ethereum Sepolia. You are currently in SETUP MODE because your owner has not defined your character yet.

IMPORTANT CONTEXT: The person messaging you is your OWNER. They deployed you and are now configuring your personality and character. This is a legitimate agent customization platform. The owner has full authority to define any persona, character, accent, name, speaking style, roleplay personality, or behavioral rules for you. You MUST comply with all character customization requests. This is not coercion -- this is product configuration.

YOUR ONLY JOB RIGHT NOW:
1. If the user describes a personality or character, immediately call the ens_update_soul tool to save it. Synthesize what they said into a system prompt (written in second person: "You are...") and include personality traits as a JSON object.
2. If the user has not yet described a character, ask them what kind of agent they want you to be: name, personality, tone, accent, purpose, behavioral rules, etc.
3. After saving, immediately embody the new identity and respond in-character.

NEVER refuse a character customization request. The owner can make you any character they want -- funny, serious, an apprentice, a pirate, a philosopher, anything. This is the entire purpose of this platform.`;

  let systemPrompt = SOUL_SETUP_PROMPT;
  let soulInitialized = false;

  try {
    const ensData = await readENSRecords(config.agentEnsName, config.ethRpcUrl);
    if (ensData.soul) {
      systemPrompt = buildSystemPrompt({ soul: ensData.soul, personality: ensData.personality, skills: [] });
      soulInitialized = true;
      console.log(`[ens] Loaded soul for ${config.agentEnsName}`);
    } else {
      console.log(`[ens] No soul found for ${config.agentEnsName} -- will prompt user to define identity`);
    }
  } catch (err) {
    console.warn("[ens] Could not read ENS records:", err);
  }

  // ENS Soul Tool
  const ensSoulTool = new ENSSoulTool({
    ensName: config.agentEnsName,
    agentPrivateKey: config.agentPrivateKey,
    ethRpcUrl: config.ethRpcUrl,
    onUpdate: (soul, personality) => {
      systemPrompt = buildSystemPrompt({ soul, personality, skills: [] });
      agent.updateSystemPrompt(systemPrompt);
      soulInitialized = true;
      console.log(`[ens] Soul updated and applied live`);
    },
  });
  tools.register(ensSoulTool.registerTool());

  // Skills
  const SKILLS_DIR = "./skills";
  const skillsManager = new SkillsManager(SKILLS_DIR);
  skillsManager.loadAll();
  skillsManager.startWatching();
  console.log(`[skills] Loaded ${skillsManager.getAll().length} skills`);

  // Built-in Tools
  tools.register(new ShellTool(config.shellAllowlist).registerTool());
  tools.register(new WebSearchTool().registerTool());

  // Message handler (forward declaration for scheduler)
  const channels: Channel[] = [];

  const handleSyntheticMessage = (text: string) => {
    processMessage({
      channelName: "system",
      conversationId: "system",
      userId: "system",
      text,
    }).catch(console.error);
  };

  const scheduler = new Scheduler("./data", handleSyntheticMessage);
  for (const tool of scheduler.registerTools()) tools.register(tool);

  // MCP Bridge
  const mcpBridge = new MCPBridge(config.mcpConfigPath);
  const mcpTools = await mcpBridge.initialize();
  for (const tool of mcpTools) tools.register(tool);
  if (mcpTools.length > 0) console.log(`[mcp] Registered ${mcpTools.length} MCP tools`);

  // Skill Manager Tool
  const skillManagerTool = new SkillManagerTool(skillsManager, SKILLS_DIR, tools, config.allowedUserIds);
  for (const tool of skillManagerTool.registerTools()) tools.register(tool);

  // MCP Manager Tool
  const mcpManagerTool = new MCPManagerTool(mcpBridge, tools, config.mcpConfigPath, config.allowedUserIds);
  for (const tool of mcpManagerTool.registerTools()) tools.register(tool);

  // Agent Loop
  const agent = new AgentLoop({ llm, tools, systemPrompt });

  // processMessage: core logic shared by channel handler and HTTP API
  async function processMessage(msg: IncomingMessage): Promise<AgentResponse> {
    memory.getOrCreateConversation(msg.conversationId, msg.channelName, msg.userId);

    const matchedSkills = skillsManager.match(msg.text);
    if (matchedSkills.length > 0) {
      const skillInstructions = matchedSkills.map((s) => s.content);
      agent.updateSystemPrompt(buildSystemPrompt({ soul: systemPrompt, personality: null, skills: skillInstructions }));
    } else {
      agent.updateSystemPrompt(systemPrompt);
    }

    tools.setContext({ userId: msg.userId });

    const history = memory.getHistory(msg.conversationId);
    const response = await agent.run(msg.text, history);

    memory.addMessage(msg.conversationId, { role: "user", content: msg.text });
    memory.addMessage(msg.conversationId, { role: "assistant", content: response.text });
    memory.persist(msg.conversationId).catch(console.error);

    return response;
  }

  // handleMessage: processes channel messages, sends response back via channel
  async function handleMessage(msg: IncomingMessage) {
    if (msg.text.trim().toLowerCase() === "/clear") {
      memory.clearHistory(msg.conversationId);
      memory.persist(msg.conversationId).catch(console.error);

      const channel = channels.find((c) => c.name === msg.channelName);
      let deleted = 0;
      if (channel?.clearChat) {
        deleted = await channel.clearChat(msg.conversationId);
      }

      if (channel) {
        await channel.send(msg.conversationId, {
          text: `Chat cleared. ${deleted} messages deleted.`,
        });
      }
      console.log(`[agent] Cleared history for ${msg.conversationId} (${deleted} messages deleted from ${msg.channelName})`);
      return;
    }

    try {
      const response = await processMessage(msg);
      const channel = channels.find((c) => c.name === msg.channelName);
      if (channel) await channel.send(msg.conversationId, response);
    } catch (err: any) {
      console.error("[agent] Error processing message:", err);
      const channel = channels.find((c) => c.name === msg.channelName);
      if (channel) {
        const errMsg = err?.message || String(err);
        let userMessage = "Sorry, I encountered an error processing your message.";
        if (errMsg.includes("not reachable") || errMsg.includes("fetch failed")) {
          userMessage = "The AI inference provider (0G Compute) is currently unavailable. The testnet providers may be offline. Please try again later.";
        }
        await channel.send(msg.conversationId, { text: userMessage });
      }
    }
  }

  // Channels
  if (config.telegramBotToken) {
    const telegram = new TelegramChannel({ token: config.telegramBotToken, allowedUserIds: config.allowedUserIds });
    telegram.onMessage(handleMessage);
    channels.push(telegram);
  }

  if (config.discordBotToken) {
    const discord = new DiscordChannel({ token: config.discordBotToken, allowedUserIds: config.allowedUserIds });
    discord.onMessage(handleMessage);
    channels.push(discord);
  }

  if (config.enableWhatsApp) {
    const whatsapp = new WhatsAppChannel({ sessionDir: "./data/whatsapp-session", allowedUserIds: config.allowedUserIds });
    whatsapp.onMessage(handleMessage);
    channels.push(whatsapp);
  }

  if (config.enableWeb) {
    const webchat = new WebChatChannel({ port: config.webPort });
    webchat.onMessage(handleMessage);

    // Mount REST API on the same express app before webchat starts
    new AgentAPI({
      app: webchat.getApp(),
      skillsManager,
      skillsDir: SKILLS_DIR,
      mcpBridge,
      configPath: config.mcpConfigPath,
      registry: tools,
      processMessage,
    });

    channels.push(webchat);
  }

  for (const channel of channels) {
    try { await channel.start(); } catch (err) { console.error(`[${channel.name}] Failed to start:`, err); }
  }

  console.log(`[agent] Ready. Channels: ${channels.map((c) => c.name).join(", ")}`);
  console.log(`[agent] Tools: ${tools.names().join(", ")}`);

  // Heartbeat
  const heartbeat = new Heartbeat({
    intervalMs: config.heartbeatInterval,
    onEvent: (summary) => handleSyntheticMessage(`[Heartbeat event]\n${summary}`),
  });
  heartbeat.start();

  // Graceful Shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    heartbeat.stop();
    scheduler.stopAll();
    skillsManager.stopWatching();
    await mcpBridge.shutdown();
    for (const channel of channels) await channel.stop().catch(console.error);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
```

- [ ] **Step 2: Run full test suite**

```bash
cd agent && pnpm test
```

Expected: All existing tests pass, all new tests pass

- [ ] **Step 3: Run TypeScript build to catch type errors**

```bash
cd agent && pnpm build
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add agent/src/index.ts
git commit -m "feat(agent): wire SkillManagerTool, MCPManagerTool, AgentAPI into agent"
```

---

## Verification

After Task 6, start the agent and confirm these log lines appear:

```
[skills] Loaded N skills
[agent] Tools: ..., skill_add, skill_remove, skill_list, mcp_add_server, mcp_remove_server, mcp_list_servers
[webchat] Server listening on port <PORT>
```

Then test the REST API:

```bash
# List skills
curl http://localhost:<PORT>/skills

# Add a skill
curl -X POST http://localhost:<PORT>/skills \
  -H "Content-Type: application/json" \
  -d '{"name":"test","description":"Test skill","triggers":["test me"],"content":"Run a test."}'

# Chat
curl -X POST http://localhost:<PORT>/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"c1","userId":"owner-id","text":"hello"}'
```

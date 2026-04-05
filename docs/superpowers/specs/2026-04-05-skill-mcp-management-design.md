# Skill and MCP Management Design

**Date:** 2026-04-05
**Status:** Approved

## Summary

Add runtime skill management and MCP server management to the CaaS agent, accessible both via agent chat tools (owner-only) and a REST API (no auth, network-isolated) for the miniapp UI.

---

## Components

### 1. ToolRegistry Context (`src/core/tools.ts`)

Add two methods to `ToolRegistry`:

```ts
setContext(ctx: Record<string, unknown>): void
getContext(): Record<string, unknown>
unregister(name: string): void
```

- `setContext` / `getContext`: per-message user context for owner checks in tools
- `unregister`: removes a tool by name, used when an MCP server is removed

In `handleMessage` (in `index.ts`), before `agent.run()`:

```ts
tools.setContext({ userId: msg.userId });
```

---

### 2. SkillManagerTool (`src/tools/skill-manager.ts`)

Constructor: `(skillsManager: SkillsManager, skillsDir: string, registry: ToolRegistry, allowedUserIds: string[])`

Exposes `registerTools(): RegisteredTool[]` with three tools:

| Tool | Parameters | Behavior |
|------|-----------|----------|
| `skill_add` | `name`, `description`, `triggers[]`, `content` | Validates name (alphanumeric + hyphens). Writes `./skills/{name}.md` with YAML frontmatter. Chokidar hot-reloads automatically. |
| `skill_remove` | `name` | Deletes `./skills/{name}.md`. Chokidar fires unlink handler. |
| `skill_list` | none | Returns all loaded skills (name, description, triggers) as JSON via `skillsManager.getAll()`. |

All three check `registry.getContext().userId` against `allowedUserIds` before acting. Returns an error string if unauthorized.

---

### 3. MCPBridge changes (`src/tools/mcp-bridge.ts`)

Add:
- `private serverTools = new Map<string, string[]>()` - tracks tool names per server
- `addServer(config: MCPServerConfig): Promise<RegisteredTool[]>` - public wrapper around existing `connectServer()`, populates `serverTools`
- `removeServer(name: string): Promise<string[]>` - closes client, returns list of tool names that were registered for it

Update `initialize()` to populate `serverTools` as servers are connected.

---

### 4. MCPManagerTool (`src/tools/mcp-manager.ts`)

Constructor: `(mcpBridge: MCPBridge, registry: ToolRegistry, configPath: string, allowedUserIds: string[])`

Exposes `registerTools(): RegisteredTool[]` with three tools:

| Tool | Parameters | Behavior |
|------|-----------|----------|
| `mcp_add_server` | `name`, `transport`, `command?`, `args?`, `url?` | Calls `mcpBridge.addServer()`, registers returned tools on `ToolRegistry`, persists updated config to `mcp-servers.json`. |
| `mcp_remove_server` | `name` | Calls `mcpBridge.removeServer()`, unregisters its tools via `registry.unregister()`, persists config. |
| `mcp_list_servers` | none | Reads `mcp-servers.json`, returns server names and tool counts. |

All three check `registry.getContext().userId` against `allowedUserIds`.

---

### 5. AgentAPI (`src/api/index.ts`)

A class that mounts REST routes onto the existing `WebChatChannel` express app (requires adding `getApp()` to `WebChatChannel`). Routes are registered before `server.listen()`.

**WebChatChannel change:** expose `getApp(): express.Application` returning the internal express instance.

**REST endpoints:**

```
POST   /chat              { conversationId, userId, text }  ->  { text }
GET    /skills            ->  [{ name, description, triggers }]
POST   /skills            { name, description, triggers[], content }  ->  { ok }
DELETE /skills/:name      ->  { ok }
GET    /mcp               ->  [{ name, transport, ... }]
POST   /mcp               { name, transport, command?, args?, url? }  ->  { ok, toolsAdded }
DELETE /mcp/:name         ->  { ok, toolsRemoved }
```

No auth. Relies on network isolation (agent only reachable internally).

**`POST /chat` refactor:** Extract core logic from `handleMessage` into `processMessage(msg): Promise<AgentResponse>` that handles agent.run + memory read/write. `handleMessage` calls `processMessage` then sends via channel. The HTTP handler calls `processMessage` directly and returns the result.

---

## Data Flow

```
Owner via chat:
  handleMessage -> tools.setContext({ userId }) -> agent.run() -> skill_add/mcp_add_server tool -> writes file / connects server

Miniapp via HTTP:
  POST /skills -> AgentAPI -> SkillsManager.write() -> chokidar hot-reload
  POST /mcp    -> AgentAPI -> MCPBridge.addServer() -> ToolRegistry.register()
  POST /chat   -> AgentAPI -> processMessage() -> AgentLoop.run() -> response
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/core/tools.ts` | Add `setContext`, `getContext`, `unregister` |
| `src/core/agent.ts` | No change |
| `src/tools/mcp-bridge.ts` | Add `addServer`, `removeServer`, `serverTools` tracking |
| `src/tools/skill-manager.ts` | New file |
| `src/tools/mcp-manager.ts` | New file |
| `src/api/index.ts` | New file |
| `src/channels/webchat.ts` | Add `getApp()` |
| `src/index.ts` | Wire context, register new tools, mount AgentAPI |

---

## Error Handling

- Unauthorized tool call: return `"Error: Only the agent owner can manage skills/MCP servers."`
- Duplicate skill name: overwrite (skill_add) - chokidar fires change event
- Duplicate MCP server name: return error, do not reconnect
- MCP server connect failure: return error string, do not persist config
- Invalid skill name (non alphanumeric/hyphen): return validation error before writing

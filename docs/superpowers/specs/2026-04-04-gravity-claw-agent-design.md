# Gravity Claw Agent Runtime — Design Spec

**Date:** 2026-04-04
**Location:** `agent/` (standalone TypeScript package at repo root)
**Architecture:** Agentic tool loop, 0G Compute LLM, MCP bridge, 0G Storage memory, hot-swappable LLM providers.

---

## 1. Core Agent Loop & LLM Provider

### Agent Loop

A persistent `while(true)` loop that:

1. Receives a message from any enabled channel
2. Builds prompt: system context (soul from ENS text records, conversation history from 0G Storage, available tools) + user message
3. Calls the LLM via 0G Compute
4. If response contains tool calls → execute them → feed results back → repeat from step 3
5. If response is final text → send back through the originating channel

The loop is per-conversation — each incoming message spawns or continues a conversation context.

### LLM Provider — 0G Compute (Primary)

- **SDK:** `@0glabs/0g-serving-broker` for service discovery and auth header generation
- **Endpoint:** OpenAI-compatible `/v1/proxy/chat/completions`
- **Models:** Available on 0G mainnet (deepseek-chat-v3-0324, gpt-oss-120b, qwen3-vl-30b-a3b-instruct, etc.)
- **Auth:** Wallet-based — broker generates bearer tokens from agent's private key
- **Interface:** Abstract `LLMProvider` interface (`chat(messages, tools?) → response`) for future swappability

```typescript
interface LLMProvider {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
}
```

### Tool Registry

- Tools register with: `name`, `description`, `parameters` (JSON Schema), `handler` function
- Registry formats tools as OpenAI function-calling definitions for the LLM
- Agent loop dispatches tool calls by name to registered handlers
- Built-in tools + MCP-discovered tools share the same registry

### Configuration (env vars)

| Variable | Purpose |
|----------|---------|
| `AGENT_PRIVATE_KEY` | Wallet key for 0G broker auth |
| `AGENT_ENS_NAME` | ENS name for personality lookup (e.g. `my-agent.caas.eth`) |
| `ALLOWED_USER_IDS` | Comma-separated whitelist for Telegram/Discord |
| `RPC_URL` | EVM RPC (default: `https://evmrpc.0g.ai`) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `ENABLE_WEB` | Enable WebChat/webhooks (default: `false`) |
| `WEB_PORT` | WebChat/webhook port (default: `3001`) |
| `HEARTBEAT_INTERVAL` | Heartbeat check interval in ms (default: `300000`) |
| `SHELL_ALLOWLIST` | Comma-separated allowed shell commands |
| `MCP_CONFIG_PATH` | Path to MCP servers JSON config |

---

## 2. Messaging Channels

### Channel Interface

```typescript
interface Channel {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: 'message', handler: (msg: IncomingMessage) => void): void;
  send(conversationId: string, response: AgentResponse): Promise<void>;
}

interface IncomingMessage {
  channelName: string;
  conversationId: string;
  userId: string;
  text: string;
  media?: MediaAttachment[];
}
```

All channels are opt-in — only start if their token/config is present in env.

### Telegram Bot (grammY)

- **Transport:** Long-polling (no exposed server)
- **Features:** Text, voice messages (transcribe via 0G whisper-large-v3), inline keyboards, group chats, rich media
- **Auth:** User ID whitelisting from `ALLOWED_USER_IDS`
- **Library:** `grammy`

### WhatsApp (Baileys)

- **Transport:** WebSocket to WhatsApp servers (no exposed server)
- **Pairing:** QR code printed to terminal on first run
- **Session:** Credentials persisted in `data/whatsapp-session/`
- **Features:** Text, media, group messages
- **Library:** `@whiskeysockets/baileys`

### Discord (discord.js)

- **Transport:** Gateway WebSocket (no exposed server)
- **Features:** Slash commands (auto-registered on startup), reactions, threads, embeds, voice channel presence
- **Auth:** Guild/user ID whitelisting
- **Library:** `discord.js`

### WebChat (WebSocket)

- **Transport:** Express + ws server on `WEB_PORT`
- **Auth:** World ID JWT verification on WebSocket connection
- **Protocol:** JSON messages over WebSocket
- **Features:** Text, file upload (base64), typing indicators
- **Default:** Disabled unless `ENABLE_WEB=true`

```typescript
// WebSocket message format
interface WSMessage {
  type: 'message' | 'typing' | 'file';
  conversationId: string;
  content: string;
  token: string; // World ID JWT
}
```

---

## 3. Memory & Context

### ENS Text Records (Soul/Personality)

- Read on startup using viem: `caas.soul`, `caas.personality`, `caas.channels`, `caas.skills`
- `caas.soul` points to 0G Storage hash → fetch full soul.md
- `caas.personality` contains inline JSON (tone, style, guardrails)
- Cached in memory, refreshable via `refresh-soul` command
- Used to build the system prompt for every LLM call

### 0G Storage (Conversation History)

- Last N conversations (configurable, default 50) stored as JSON on 0G Storage
- Uses 0G SDK for upload/download
- On startup: load recent history to seed context
- After each conversation turn: persist updated history async
- Conversation format:

```typescript
interface StoredConversation {
  id: string;
  channelName: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

### Markdown Memory (Local)

- Files in `data/memory/` directory
- Agent can create/read/update/delete memory files as a registered tool
- Use cases: user preferences, facts, notes, reminders
- Format: plain markdown with frontmatter metadata

```markdown
---
topic: user-preferences
updated: 2026-04-04
---
# User Preferences
- Prefers concise responses
- Timezone: IST
```

---

## 4. Tools & Automation

### Shell Commands

- **Execution:** `child_process.exec` with configurable timeout (default 30s)
- **Security:** Allowlist of permitted commands in `SHELL_ALLOWLIST`
- **Confirmation:** Commands not in allowlist require user confirmation via channel
- **Output:** Captured stdout/stderr returned to LLM

### Web Search

- **Default:** DuckDuckGo (no API key required) via `duckduckgo-search` package
- **Optional:** Google Custom Search, Bing — configured via env vars
- **Output:** Top N results (default 5) with title, snippet, URL

### Scheduled Tasks (node-cron)

- **Library:** `node-cron`
- **Storage:** `data/schedules.json` for persistence across restarts
- **Operations:** Create (cron expression + action), list, pause, resume, delete
- **Actions:** Scheduled tasks trigger agent loop with a synthetic message
- **Natural language:** Simple parser maps "every day at 9am" → `0 9 * * *`

### Webhook Triggers

- **Server:** Shares Express instance with WebChat (if enabled)
- **Config:** Routes defined in `data/webhooks.json` — path → event name mapping
- **Parsing:** JSON and form-urlencoded body parsing
- **Routing:** Incoming webhook → parsed payload → synthetic message to agent loop
- **Default:** Disabled unless `ENABLE_WEB=true`

### MCP Tool Bridge

- **Config:** `mcp-servers.json` — array of server definitions
- **Transports:** stdio, SSE, Streamable HTTP (full MCP spec)
- **Startup:** Connect to all configured servers, list available tools
- **Integration:** Discovered MCP tools registered in the agent's tool registry with their schemas
- **Library:** `@modelcontextprotocol/sdk`

```json
{
  "servers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"]
    },
    {
      "name": "remote-api",
      "transport": "streamable-http",
      "url": "https://api.example.com/mcp"
    }
  ]
}
```

### Skills System

- **Location:** `skills/` directory at agent root
- **Format:** Markdown files with frontmatter

```markdown
---
name: code-review
description: Review code for bugs and improvements
triggers:
  - review this code
  - code review
---
# Code Review Skill

When asked to review code:
1. Check for bugs and logic errors
2. Suggest improvements
3. Note security concerns
```

- **Loading:** All `.md` files in `skills/` loaded on startup
- **Matching:** When user message matches a trigger pattern, skill instructions injected into system prompt
- **Hot-reload:** File watcher on `skills/` directory — new/changed files picked up without restart

---

## 5. Proactive Behavior

### Heartbeat System

- **Loop:** `setInterval` at `HEARTBEAT_INTERVAL` (default 5 min)
- **Sources:** Registered event checkers — each returns noteworthy events or null
- **Built-in checkers:** Scheduled task results, MCP tool notifications
- **Custom checkers:** Plugins can register additional event sources
- **Action:** If events found, compose a summary and proactively message user on their primary channel (first enabled channel)

---

## 6. Deployment

### Docker

**Dockerfile** — multi-stage:
1. `node:20-alpine` base
2. Install dependencies
3. Compile TypeScript
4. Copy compiled JS + node_modules to slim runtime image

**docker-compose.yml:**
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

### "Not On The Internet" Mode (Default)

- Default config: only Telegram enabled
- No HTTP server started unless `ENABLE_WEB=true`
- No ports exposed in default docker-compose
- `ALLOWED_USER_IDS` required — messages from unknown users silently rejected
- WebChat requires World ID JWT — even when web is enabled, unauthenticated connections rejected

---

## 7. Project Structure

```
agent/
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── mcp-servers.json
├── skills/
│   └── example.md
├── data/                    # Runtime data (gitignored)
│   ├── memory/
│   ├── whatsapp-session/
│   ├── schedules.json
│   └── webhooks.json
└── src/
    ├── index.ts             # Entry point — load config, wire channels, start loop
    ├── core/
    │   ├── agent.ts         # Agent loop
    │   ├── llm.ts           # LLM provider interface + 0G implementation
    │   └── tools.ts         # Tool registry
    ├── channels/
    │   ├── types.ts         # Channel interface
    │   ├── telegram.ts
    │   ├── whatsapp.ts
    │   ├── discord.ts
    │   └── webchat.ts
    ├── memory/
    │   ├── ens.ts           # ENS text record reader
    │   ├── zerog.ts         # 0G Storage conversation history
    │   └── markdown.ts      # Local markdown memory tool
    ├── tools/
    │   ├── shell.ts
    │   ├── web-search.ts
    │   ├── scheduler.ts
    │   ├── webhooks.ts
    │   ├── mcp-bridge.ts
    │   └── skills.ts
    └── heartbeat/
        └── index.ts         # Heartbeat loop + event checkers

```

---

## 8. Dependencies

| Package | Purpose |
|---------|---------|
| `@0glabs/0g-serving-broker` | 0G Compute service discovery & auth |
| `ethers` | Wallet for 0G broker |
| `viem` | ENS text record reads |
| `grammy` | Telegram bot |
| `@whiskeysockets/baileys` | WhatsApp |
| `discord.js` | Discord bot |
| `express` + `ws` | WebChat + webhooks HTTP server |
| `@modelcontextprotocol/sdk` | MCP client (stdio, SSE, streamable HTTP) |
| `node-cron` | Scheduled tasks |
| `duckduckgo-search` | Web search (default, no API key) |
| `chokidar` | File watching for skills hot-reload |
| `dotenv` | Env var loading |
| `typescript` | Build |

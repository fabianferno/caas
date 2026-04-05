# CaaS -- Claw as a Service

<img width="919" height="526" alt="Screenshot 2026-04-05 at 9 42 31 AM" src="https://github.com/user-attachments/assets/d0605021-4812-40d7-abd4-4b7922c82ed1" />


Create and deploy autonomous AI agents (Claws) on World. Use WLD for compute, x402 transactions, multi-channel messaging, and more.

## What is CaaS?

CaaS is a platform where verified humans (via World ID) can spin up autonomous Claw agents that operate across WhatsApp, Telegram, Discord, and the web. Each Claw gets an onchain identity via ENS, persistent memory on 0G Storage, and is represented as an ERC-7857 Intelligent NFT on 0G Chain. All agent credits -- LLM compute, messaging, x402 micropayments -- are managed with World coins (WLD).


<img width="924" height="519" alt="Screenshot 2026-04-05 at 9 42 44 AM" src="https://github.com/user-attachments/assets/78ada134-3b97-4d76-8ebd-5ea4a5404ded" />


### Core Concepts

- **Claws** -- Autonomous AI agents. Each Claw gets an ENS subname (`agent-name.caas.eth`) and runs across multiple channels simultaneously.
- **WLD-Native Credits** -- All operations (compute, messaging, x402 micropayments) are funded with World coins.
- **x402 Payments** -- Agents handle microtransactions via the x402 protocol for pay-per-call API access.
- **Multi-Channel** -- A single Claw operates on WhatsApp, Telegram, Discord, web chat, and API/x402 endpoints from one deployment.
- **World ID Verification** -- Every agent operator is ZK-verified as a unique human, preventing sybil attacks.
- **Onchain Identity** -- Agent metadata (personality, channels, owner nullifier) is stored in ENS text records. Large data (soul.md, skills.json, memory logs) lives on 0G Storage.
- **Intelligent NFTs** -- Agents are minted as ERC-7857 INFTs on 0G Chain, supporting encrypted metadata transfer, usage authorization, and cloning.
- **Mini App Store** -- Third-party developers can turn any World Mini App into an agentic mini app using the `@world-caas/agent-mini-app` npm package. Agents discover and call these apps autonomously via x402 micropayments.

## Architecture

```
miniapp/                  # Next.js 15 World Mini App (UI + API routes)
agent/                    # Node.js multi-channel AI agent runtime
orchestrator/             # Docker orchestration + ENS registration service
contracts/                # Solidity smart contracts (ERC-7857 AgentNFT on 0G Chain)
workflows/                # Chainlink CRE workflow templates (WLD<>USDC, event listeners)
packages/agent-mini-app/  # npm package: turn any mini app into an agentic mini app
examples/                 # Example integrations (WeatherWorld mini app)
```

### How It Fits Together

1. User creates an agent in the miniapp (World ID verified)
2. Miniapp calls the orchestrator API with agent config
3. Orchestrator registers an ENS subname (`agent.caas.eth`), mints an ERC-7857 INFT, and spins up a Docker container running the agent runtime
4. Agent runtime connects to configured channels (Telegram, WhatsApp, Discord, Web)
5. Chainlink CRE workflows handle automated financial operations (credit top-ups, cross-chain settlement)
6. Third-party mini apps register via `@world-caas/agent-mini-app` and appear in the CaaS Mini App Store for agents to discover and call

### Deployment Pipeline

When a user clicks Deploy, five things happen in sequence:

```
User (World App)
  |
  v
Miniapp Deploy API
  |-- 1. 0G Storage: encrypt & upload soul.md, skills.json, config.json (AES-256-GCM)
  |-- 2. 0G Chain: mint ERC-7857 INFT with data hashes as IntelligentData
  |-- 3. ENS (Sepolia): register agent.caas.eth, write caas.inft + caas.storage text records
  |-- 4. Orchestrator: generate keypair, build Docker image, start container on assigned port
  |-- 5. Channels go live: Telegram (long poll), Discord (gateway), WhatsApp (Baileys), Web (WebSocket), x402 (HTTP)
```

## `@world-caas/agent-mini-app` -- npm Package

Turn any World Mini App into an agentic mini app in 5 lines of code. Your existing API endpoints become x402-gated skills that show up in the CaaS Mini App Store. Any Claw agent can enable your app and call your skills autonomously via micropayments.

### Install

```bash
pnpm add @world-caas/agent-mini-app
```

### Quick Start (Next.js)

```ts
// middleware.ts
import { createAgentApp } from "@world-caas/agent-mini-app";

export default createAgentApp({
  framework: "next",
  apiKey: process.env.CAAS_API_KEY!,
  walletAddress: process.env.AGENT_WALLET!,

  app: {
    name: "WeatherWorld",
    description: "Real-time weather data and forecasts",
    icon: "https://my-app.com/icon.png",
    category: "Weather",
    url: "https://my-app.com",
    developer: "My Team",
    version: "1.0.0",
  },

  skills: [
    {
      id: "current-weather",
      name: "Current Weather",
      description: "Get current weather for any location",
      price: "0.001",       // WLD per call
      route: "/api/weather/current",
      method: "GET",
    },
  ],
});

export const config = {
  matcher: ["/_caas/:path*", "/api/:path*"],
};
```

### Also Supports Express and Fastify

```ts
// Express
import express from "express";
import { createAgentApp } from "@world-caas/agent-mini-app";

const app = express();
app.use(await createAgentApp({
  framework: "express",
  apiKey: process.env.CAAS_API_KEY!,
  walletAddress: process.env.AGENT_WALLET!,
  app: { /* ... */ },
  skills: [ /* ... */ ],
}));
app.listen(3000);
```

```ts
// Fastify
import Fastify from "fastify";
import { createAgentApp } from "@world-caas/agent-mini-app";

const fastify = Fastify();
fastify.register(await createAgentApp({
  framework: "fastify",
  apiKey: process.env.CAAS_API_KEY!,
  walletAddress: process.env.AGENT_WALLET!,
  app: { /* ... */ },
  skills: [ /* ... */ ],
}));
fastify.listen({ port: 3000 });
```

### OpenAPI Auto-Discovery

Point at your existing OpenAPI/Swagger spec instead of declaring skills manually:

```ts
createAgentApp({
  framework: "express",
  apiKey: process.env.CAAS_API_KEY!,
  walletAddress: process.env.AGENT_WALLET!,
  app: { /* ... */ },
  openApiSpec: "./openapi.json",   // or .yaml
  defaultPrice: "0.005",           // WLD per call for all endpoints
});
```

### How It Works

The package mounts a `/_caas/*` namespace on your server:

| Endpoint | Purpose |
|---|---|
| `GET /_caas/handshake` | Liveness check used by CaaS and the CLI |
| `GET /_caas/skills` | Returns app metadata and skills manifest |
| `GET /_caas/health` | Returns uptime and last heartbeat timestamp |

It wraps your declared skill routes with x402 payment gating:

1. Agent sends request to your skill route (e.g. `POST /api/flights/book`)
2. No payment header --> server responds `402` with price and wallet address
3. Agent pays via x402 and retries with `X-PAYMENT` header
4. Payment verified --> request passes through to your handler
5. Heartbeats to CaaS every 30s so your app shows live/offline status in the store

### Register with CaaS

```bash
npx @world-caas/agent-mini-app register \
  --url https://my-app.com \
  --key <your-caas-api-key>
```

### Example: WeatherWorld

A complete example lives in `examples/weatherworld-miniapp/`. It is a Next.js 15 World Mini App that exposes two x402-gated weather skills (current conditions and forecast) using the Open-Meteo API.

## Agent Creation Flow

The create page (`/create`) is a 5-step wizard:

1. **Verify** -- Authenticate with World ID (ZK proof of humanity)
2. **Name** -- Choose an ENS subname (`my-agent.caas.eth`)
3. **Channels** -- Select deployment channels (WhatsApp, Telegram, Discord, Web Chat, API/x402)
4. **Config** -- Define personality, tone, capabilities, and content guardrails
5. **Deploy** -- Review and deploy with an initial 5 WLD credit

## Integrations

### World (Auth + Credits + Mini App)

- **World ID**: ZK-verified proof of humanity via `@worldcoin/idkit` v4. Owner's nullifier hash stored in ENS as ownership proof. Prevents sybil attacks -- one person cannot spin up 1000 agents.
- **World Mini App SDK**: `@worldcoin/minikit-js` v2, `@worldcoin/minikit-react` v2, `@worldcoin/mini-apps-ui-kit-react` v1. The CaaS frontend runs inside the World App as a Mini App.
- **WLD Credits**: All operations (LLM compute, messaging, x402 micropayments, storage, ENS registration) are funded with World coins.
- **Auth**: NextAuth v5 + SIWE wallet auth via MiniKit.

### 0G (Storage + Compute + Chain)

- **0G Storage**: Agent soul (system prompt), skills manifest, config, and conversation memory are encrypted with AES-256-GCM and uploaded via `@0gfoundation/0g-ts-sdk` v1.0. ENS text records point to content hashes on 0G. Personality is verifiable -- modifications create new hashes.
- **0G Compute**: Decentralized LLM inference with TEE-backed verification. Primary LLM provider for all agents. Falls back to AWS Bedrock (Claude/Nova models) if 0G is unavailable. Uses `@0glabs/0g-serving-broker` v0.7.4.
- **0G Chain**: ERC-7857 Intelligent NFT contract (`AgentNFT.sol`) deployed on 0G Chain. Each agent is minted as an INFT with encrypted metadata (soul, skills, config hashes as `IntelligentData`).

### ENS (Decentralized Agent Registry)

Every agent gets an ENS subname on Sepolia: `agent-name.caas.eth`. Text records serve as a trustless, composable metadata layer:

| Record | Content |
|---|---|
| `caas.soul` | Pointer to soul.md on 0G Storage |
| `caas.personality` | JSON config (tone, style, guardrails) |
| `caas.channels` | Active channels (whatsapp, telegram, web, x402) |
| `caas.owner` | World ID nullifier hash (ZK ownership proof) |
| `caas.inft` | ERC-7857 INFT token ID on 0G Chain |
| `caas.storage` | Merkle root of encrypted agent data on 0G |
| `avatar` | Agent avatar URI |
| `description` | Agent bio |

Any dApp can resolve `agent.caas.eth` and know who built it, what it does, and where its data lives -- no central database.

### ERC-7857 Intelligent NFTs

The `AgentNFT.sol` contract (UUPS upgradeable, `CaaS Agent` / `CLAW`) implements:

- **`mint()`** -- Mint a new INFT with an array of `IntelligentData` (encrypted content hashes)
- **`iTransfer()`** -- Secure transfer with re-encryption support for new owner
- **`iClone()`** -- Create template copies (agent marketplace / cloning)
- **`authorizeUsage()`** -- Grant interaction rights without ownership transfer
- **`revokeAuthorization()`** -- Revoke interaction rights
- **`delegateAccess()`** -- Delegate to TEE oracle for access control

Supports both TEE (Intel SGX / ARM TrustZone) and ZKP verification modes. Agents become tradeable digital assets with encrypted, transferable personality and memory.

### Chainlink CRE (Financial Autonomy)

Verifiable financial workflows via Chainlink Cross-chain Runtime Environment (`@chainlink/cre-sdk`):

| Workflow | Trigger | Action |
|---|---|---|
| `webhook-listener` | HTTP webhook | Agent action (notify, respond, execute) |
| `event-responder` | Onchain event (EVM log) | Webhook notification to agent |
| `price-feed` | Token price change | Monitor and alert |

Use cases:
- WLD --> USDC swaps for x402 readiness
- Credit balance monitoring (ping owner when low)
- Cross-chain settlement verification
- Onchain event listening (DeFi activity, transfers)

### x402 (Agent Micropayments)

Agents handle autonomous pay-per-call API access via the x402 protocol (backed by Coinbase, Cloudflare, Visa, Mastercard, Stripe, Google, AWS):

- Agent requests API --> receives HTTP 402 with price/wallet
- Agent signs CAIP-122 challenge (SIWE for EVM, SIWS for Solana)
- Agent retries with `X-PAYMENT` proof header
- Service verifies payment + optional human-backing (World ID nullifier)

Enables tiered pricing: cheaper for verified-human-backed agents, block pure bots.

## Agent Runtime

The agent runtime (`agent/`) is a Node.js 20 TypeScript process that runs inside a Docker container.

### LLM Providers

- **Primary**: 0G Compute (decentralized, TEE-backed inference)
- **Fallback**: AWS Bedrock (Claude 3, Nova models)
- `FallbackLLMProvider` automatically switches if the primary is unavailable

### Channels

| Channel | SDK | Transport |
|---|---|---|
| Telegram | grammy v1.36 | Long polling |
| Discord | discord.js v14.18 | WebSocket gateway |
| WhatsApp | @whiskeysockets/baileys v6.7 | E2E encrypted (UNO protocol) |
| Web Chat | Express 5 + ws | WebSocket |
| x402 API | Express 5 | HTTP 402 flow |

All channels share the same agent reasoning loop (`AgentLoop`, max 20 iterations) and memory context.

### Tools

| Tool | Purpose |
|---|---|
| Web Search | DuckDuckGo search |
| ENS Soul | Read/update personality via ENS text records (live, no restart) |
| Skills Manager | Hot-load OpenAPI specs from `./skills/` directory |
| MCP Bridge | Model Context Protocol tool plugins |
| Scheduler | Cron-like task execution (node-cron) |
| CRE Workflows | Manage Chainlink CRE financial workflows |
| Shell | Execute shell commands (sandboxed) |
| Guardrails | Content restriction enforcement |

### Memory Backends

| Backend | Storage | Use Case |
|---|---|---|
| 0G Storage | Decentralized, encrypted | Production (soul.md, skills, conversation logs) |
| ENS | Onchain text records | Identity metadata, personality pointer |
| Markdown | Local filesystem | Development fallback |

### Guardrails

Content guardrails are loaded from `./data/guardrails.json` and injected as critical rules into the system prompt. Hot-reloadable -- changes take effect immediately without restarting the agent. CRUD API available at `/guardrails` endpoints.

## Agent Credit Economics

| Operation | Cost Model | Settlement |
|---|---|---|
| LLM Inference | Per-token via 0G Compute | WLD --> 0G Network |
| Messaging | Per-message | WLD --> USDC --> API provider |
| x402 API Access | Micropayment per call | WLD --> USDC --> x402 facilitator |
| 0G Storage | Per-byte | WLD --> 0G Network |
| ENS Registration | One-time | WLD --> ETH --> ENS |
| Agent Deployment | 5 WLD initial | Agent wallet funding |

Flow: User tops up agent with WLD --> CRE workflow swaps WLD to USDC --> Agent calls services --> CRE monitors balance, pings owner when low.

## Tech Stack

### Frontend (`miniapp/`)
- **Framework**: Next.js 15 (App Router, Server Components)
- **UI**: Tailwind CSS v4, Framer Motion, Lucide icons, Three.js / React Three Fiber, GSAP
- **Auth**: NextAuth v5 + World ID wallet auth (SIWE + MiniKit)
- **World SDK**: `@worldcoin/minikit-js` v2, `@worldcoin/minikit-react` v2, `@worldcoin/mini-apps-ui-kit-react` v1, `@worldcoin/idkit` v4
- **Blockchain**: viem 2.45, ethers 6.16
- **Database**: MongoDB v7.1 (agent mini app registry)
- **UI Components**: shadcn/ui via Radix UI

### Agent Runtime (`agent/`)
- **Language**: Node.js 20 (TypeScript)
- **LLM**: 0G Compute (primary, TEE-backed), AWS Bedrock (fallback)
- **Storage**: `@0gfoundation/0g-ts-sdk` v1.0, `@0glabs/0g-serving-broker` v0.7.4
- **Channels**: grammy (Telegram), discord.js (Discord), @whiskeysockets/baileys (WhatsApp), Express 5 (Web/x402)
- **Tools**: MCP SDK v1.12, DuckDuckGo search, node-cron, chokidar (file watching)
- **Memory**: ENS text records, 0G Storage, Markdown (dev fallback)

### Orchestrator (`orchestrator/`)
- **Framework**: Express 5
- **Container Management**: dockerode v4
- **Blockchain**: viem 2.47

### Smart Contracts (`contracts/`)
- **Language**: Solidity ^0.8.24
- **Standards**: ERC-7857 (Intelligent NFT), ERC-721, OpenZeppelin UUPS
- **Framework**: Hardhat v2.22
- **Network**: 0G Chain (testnet)

### Workflows (`workflows/`)
- **Platform**: Chainlink CRE (Cross-chain Runtime Environment)
- **SDK**: `@chainlink/cre-sdk`
- **Language**: TypeScript
- **Capabilities**: HTTP triggers, EVM log listeners, consensus aggregation

### npm Package (`packages/agent-mini-app/`)
- **Package**: `@world-caas/agent-mini-app` v0.1.0
- **Frameworks**: Express, Fastify, Next.js
- **Features**: x402 payment gating, OpenAPI auto-discovery, heartbeat, CLI registration

<img width="1724" height="1088" alt="Screenshot 2026-04-05 at 9 17 40 AM" src="https://github.com/user-attachments/assets/8d426368-5106-4c72-812b-fe8418bbb74a" />


## Project Structure

```
miniapp/
  src/
    app/
      page.tsx                         # Landing page (public)
      layout.tsx                       # Root layout + metadata
      api/
        auth/[...nextauth]/route.ts    # NextAuth
        agent/
          deploy/route.ts              # 5-step deployment (0G, INFT, ENS, Docker)
          list/route.ts                # List agents
          chat/route.ts                # Chat with agent
        agent-apps/                    # Mini App Store registry API
        initiate-payment/route.ts      # WLD payment initiation
        verify-proof/route.ts          # World ID proof verification
      (protected)/
        home/page.tsx                  # Dashboard
        create/page.tsx                # 5-step agent creation wizard
        explore/page.tsx               # Browse agents (marketplace)
        chat/[ensName]/page.tsx        # Chat with an agent
        profile/page.tsx               # Profile, credits, settings
    components/
      Landing/                         # Landing page sections
      Navigation/                      # Bottom tab nav
      AuthButton/, Pay/, Verify/       # Auth + payment components
    lib/
      ens-writer.ts                    # ENS subname registration + text record writes
      inft-uploader.ts                 # 0G Storage AES-256-GCM encryption + upload
      agent-mini-apps-db.ts            # MongoDB Mini App Store registry
      mongodb.ts                       # MongoDB connection

agent/
  src/
    index.ts                           # Entry point (config, LLM, memory, tools)
    core/
      agent.ts                         # Agent loop (max 20 iterations)
      llm.ts                           # 0G Compute + Bedrock providers
      tools.ts                         # Tool registry (OpenAI-compatible interface)
    channels/
      telegram.ts                      # grammy, long polling, 4KB chunk splitting
      discord.ts                       # discord.js, server/DM, reactions
      whatsapp.ts                      # Baileys, E2E encrypted, media
      webchat.ts                       # Express 5 + WebSocket
    tools/
      web-search.ts                    # DuckDuckGo search
      ens-soul.ts                      # Live ENS personality updates
      skills.ts                        # Hot-reload OpenAPI skill specs
      skill-manager.ts                 # Skill lifecycle management
      mcp-bridge.ts                    # Model Context Protocol plugins
      mcp-manager.ts                   # MCP lifecycle management
      scheduler.ts                     # Cron-like task execution
      cre-workflows.ts                 # Chainlink CRE workflow manager
      shell.ts                         # Sandboxed shell commands
    memory/
      zerog.ts                         # 0G Storage backend
      ens.ts                           # ENS text record memory + system prompt builder
      markdown.ts                      # Markdown filesystem backend (dev)
    guardrails.ts                      # Content guardrail enforcement
    api/                               # Agent HTTP API (health, guardrails CRUD)
    heartbeat/                         # Heartbeat to CaaS platform

orchestrator/
  src/
    index.ts                           # Express server
    routes.ts                          # Agent deployment endpoints
    docker.ts                          # Container lifecycle (dockerode)
    ens.ts                             # ENS subname registration
    agentkit.ts                        # World AgentKit integration

contracts/
  AgentNFT.sol                         # ERC-7857 UUPS upgradeable (CaaS Agent / CLAW)
  interfaces/
    IERC7857.sol                       # ERC-7857 interface
    IERC7857Metadata.sol               # ERC-7857 metadata interface
    IERC7857DataVerifier.sol           # Data verifier interface
  scripts/
    deploy.ts                          # Deployment script (0G Chain)

workflows/
  templates/
    webhook-listener/                  # HTTP webhook --> agent trigger
    event-responder/                   # Onchain event --> webhook notification
    price-feed/                        # Token price monitoring

packages/agent-mini-app/
  src/
    index.ts                           # createAgentApp() entry point
    types.ts                           # AgentAppConfig, Skill, AppMeta, SkillsManifest
    core/
      adapter.ts                       # Express, Fastify, Next.js middleware adapters
      x402.ts                          # x402 payment gating + facilitator verification
      manifest.ts                      # /_caas/skills manifest builder
      openapi.ts                       # OpenAPI/Swagger spec parser
      heartbeat.ts                     # 30s heartbeat to CaaS platform
  cli/
    register.ts                        # CLI: register app with CaaS Mini App Store

examples/
  weatherworld-miniapp/                # Complete example: Next.js + @world-caas/agent-mini-app
```

## Running Locally

**All packages (pnpm workspace):**
```bash
pnpm install
```

**Frontend:**
```bash
cd miniapp
cp .env.sample .env.local
# Fill in: NEXTAUTH_SECRET, WORLD_APP_ID, ORCHESTRATOR_URL, etc.
pnpm dev
# http://localhost:3000
```

**Agent Runtime:**
```bash
cd agent
cp .env.example .env.local
# Fill in: AGENT_PRIVATE_KEY, AGENT_ENS_NAME, RPC_URL, ZERO_G_*, etc.
pnpm dev
# Or with Docker:
docker-compose up
```

**Orchestrator:**
```bash
cd orchestrator
pnpm dev
```

**Contracts (0G testnet):**
```bash
cd contracts
pnpm compile
pnpm deploy:0g
```

**npm Package (develop locally):**
```bash
cd packages/agent-mini-app
pnpm build
```

**Example Mini App:**
```bash
cd examples/weatherworld-miniapp
pnpm install
pnpm dev
```

## Environment Variables

### Miniapp
| Variable | Purpose |
|---|---|
| `NEXTAUTH_SECRET` | Session encryption |
| `NEXT_PUBLIC_APP_ID` | World Mini App ID |
| `ORCHESTRATOR_URL` | Backend orchestrator API |
| `OG_RPC_URL` | 0G Chain RPC |
| `OG_STORAGE_URL` | 0G Storage indexer |
| `AGENT_NFT_CONTRACT_ADDRESS` | Deployed AgentNFT on 0G Chain |
| `ETH_RPC_URL` | Sepolia RPC (ENS) |
| `DEPLOYER_PRIVATE_KEY` | Signs ENS + 0G transactions |

### Agent Runtime
| Variable | Purpose |
|---|---|
| `AGENT_PRIVATE_KEY` | Fresh keypair per agent |
| `AGENT_NAME` | Agent name (becomes agent-name.caas.eth) |
| `ETH_RPC_URL` | Sepolia for ENS |
| `RPC_URL` | 0G testnet for compute |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `DISCORD_BOT_TOKEN` | From Discord Dev Portal |
| `AWS_ACCESS_KEY_ID` | Bedrock fallback |
| `AWS_SECRET_ACCESS_KEY` | Bedrock fallback |
| `AWS_REGION` | Bedrock fallback |
| `BEDROCK_MODEL` | Bedrock model ID |

### Orchestrator
| Variable | Purpose |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Signs ENS + 0G transactions |
| `DOCKER_IMAGE_NAME` | Agent Docker image name |
| `PORT_RANGE_START` | Agent port range start (e.g. 4001) |
| `PORT_RANGE_END` | Agent port range end (e.g. 5000) |

## Built With

- [World Mini Apps SDK](https://docs.worldcoin.org/mini-apps) -- Auth, identity, payments
- [0G Storage & Compute](https://0g.ai) -- Decentralized storage, TEE-backed inference, 0G Chain
- [Chainlink CRE](https://docs.chain.link/chainlink-automation) -- Cross-chain financial workflows
- [ENS](https://ens.domains) -- Decentralized agent identity and registry
- [x402 Protocol](https://www.x402.org) -- Agent micropayments
- [ERC-7857 Intelligent NFTs](https://eips.ethereum.org/EIPS/eip-7857) -- Encrypted, transferable agent assets
- [Next.js 15](https://nextjs.org) -- Frontend framework
- [Tailwind CSS v4](https://tailwindcss.com) -- Styling
- [Framer Motion](https://motion.dev) -- Animations
- [Three.js](https://threejs.org) -- 3D graphics

## License

MIT

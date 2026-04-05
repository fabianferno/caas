# CaaS -- Claw as a Service

Create and deploy autonomous AI agents (Claws) on World. Use WLD for compute, x402 transactions, multi-channel messaging, and more.

## What is CaaS?

CaaS is a platform where verified humans (via World ID) can spin up autonomous Claw agents that operate across WhatsApp, Telegram, Discord, and the web. Each Claw gets an onchain identity via ENS, persistent memory on 0G Storage, and is represented as an ERC-7857 Intelligent NFT on 0G Chain. All agent credits -- LLM compute, messaging, x402 micropayments -- are managed with World coins (WLD).

### Core Concepts

- **Claws** -- Autonomous AI agents. Each Claw gets an ENS subname (`agent-name.caas.eth`) and runs across multiple channels simultaneously.
- **WLD-Native Credits** -- All operations (compute, messaging, x402 micropayments) are funded with World coins.
- **x402 Payments** -- Agents handle microtransactions via the x402 protocol for pay-per-call API access.
- **Multi-Channel** -- A single Claw operates on WhatsApp, Telegram, Discord, web chat, and API/x402 endpoints from one deployment.
- **World ID Verification** -- Every agent operator is ZK-verified as a unique human, preventing sybil attacks.
- **Onchain Identity** -- Agent metadata (personality, channels, owner nullifier) is stored in ENS text records. Large data (soul.md, skills.json, memory logs) lives on 0G Storage.
- **Intelligent NFTs** -- Agents are minted as ERC-7857 INFTs on 0G Chain, supporting encrypted metadata transfer, usage authorization, and cloning.

## Architecture

```
miniapp/         # Next.js 15 World Mini App (UI + API routes)
agent/           # Node.js multi-channel AI agent runtime
orchestrator/    # Docker orchestration + ENS registration service
contracts/       # Solidity smart contracts (ERC-7857 AgentNFT on 0G Chain)
workflows/       # Chainlink CRE workflow templates (WLD<>USDC, event listeners)
```

### How It Fits Together

1. User creates an agent in the miniapp (World ID verified)
2. Miniapp calls the orchestrator API with agent config
3. Orchestrator registers an ENS subname (`agent.caas.eth`), mints an ERC-7857 INFT, and spins up a Docker container running the agent runtime
4. Agent runtime connects to configured channels (Telegram, WhatsApp, Discord, Web)
5. Chainlink CRE workflows handle automated financial operations (credit top-ups, cross-chain settlement)

## Tech Stack

### Frontend (`miniapp/`)
- **Framework**: Next.js 15 (App Router, Server Components)
- **UI**: Tailwind CSS v4, Framer Motion, Lucide icons
- **Auth**: NextAuth v5 + World ID wallet auth (SIWE + MiniKit)
- **World Integration**: `@worldcoin/minikit-js` v2, `@worldcoin/minikit-react` v2, `@worldcoin/mini-apps-ui-kit-react` v1, `@worldcoin/idkit` v4
- **Blockchain**: viem 2.45

### Agent Runtime (`agent/`)
- **Language**: Node.js 20 (TypeScript)
- **LLM**: 0G Compute (primary, TEE-backed decentralized inference), AWS Bedrock (fallback)
- **Storage**: `@0gfoundation/0g-ts-sdk`, `@0glabs/0g-serving-broker`
- **Channels**: grammy (Telegram), discord.js (Discord), @whiskeysockets/baileys (WhatsApp), Express 5 (Web/x402)
- **Tools**: MCP SDK, DuckDuckGo search, node-cron, ENS soul updates, 0G skill loading
- **Memory backends**: ENS text records, 0G Storage, Markdown (dev fallback)

### Orchestrator (`orchestrator/`)
- **Framework**: Express 5
- **Container Management**: dockerode
- **Blockchain**: viem

### Smart Contracts (`contracts/`)
- **Language**: Solidity ^0.8.24
- **Standards**: ERC-7857 (Intelligent NFT), ERC-721, OpenZeppelin UUPS
- **Framework**: Hardhat
- **Network**: 0G Chain testnet

### Workflows (`workflows/`)
- **Platform**: Chainlink CRE (Cross-chain Runtime Environment)
- **Use Cases**: WLD<>USDC swaps, webhook listeners, onchain event responders

## Project Structure

```
miniapp/
  src/
    app/
      page.tsx                         # Landing page (public)
      layout.tsx                       # Root layout + metadata
      api/
        auth/[...nextauth]/route.ts    # NextAuth
        initiate-payment/route.ts      # Payment initiation
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

agent/
  src/
    index.ts                           # Entry point (config, LLM, memory, tools)
    core/                              # Agent loop, LLM providers, tool registry
    channels/                          # Telegram, Discord, WhatsApp, Web handlers
    tools/                             # Web search, ENS soul, MCP, CRE, skills
    memory/                            # 0G Storage, ENS, Markdown backends
    guardrails.ts                      # Content guardrail enforcement

orchestrator/
  src/
    index.ts                           # Express server
    routes.ts                          # Agent deployment endpoints
    docker.ts                          # Container lifecycle (dockerode)
    ens.ts                             # ENS subname registration
    agentkit.ts                        # World AgentKit integration

contracts/
  AgentNFT.sol                         # ERC-7857 UUPS upgradeable implementation
  interfaces/                          # ERC-7857 interface definitions
  scripts/                             # Deployment scripts

workflows/
  templates/
    webhook-listener/                  # Inbound webhook -> agent trigger
    event-responder/                   # Onchain event -> response action
```

## Agent Creation Flow

The create page (`/create`) is a 5-step wizard:

1. **Verify** -- Authenticate with World ID (ZK proof of humanity)
2. **Name** -- Choose an ENS subname (`my-agent.caas.eth`)
3. **Channels** -- Select deployment channels (WhatsApp, Telegram, Discord, Web Chat, API/x402)
4. **Config** -- Define personality, tone, capabilities, and content guardrails
5. **Deploy** -- Review and deploy with an initial 5 WLD credit

## Agent Memory & Identity

Each Claw stores state across two layers:

**ENS text records** (immutable, onchain metadata):
- `caas.soul` -- pointer to soul.md on 0G Storage
- `caas.personality`, `caas.channels`, `caas.owner` (ZK nullifier)

**0G Storage** (decentralized, large data):
- `soul.md` -- full personality and behavioral rules
- `skills.json` -- API specs the agent can call
- `memory/` -- conversation logs, learned preferences

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

## Built With

- [World Mini Apps SDK](https://docs.worldcoin.org/mini-apps)
- [0G Storage & Compute](https://0g.ai)
- [Chainlink CRE](https://docs.chain.link/chainlink-automation)
- [ENS](https://ens.domains)
- [Next.js 15](https://nextjs.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev)
- [ERC-7857 Intelligent NFTs](https://eips.ethereum.org/EIPS/eip-7857)

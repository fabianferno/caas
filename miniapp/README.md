## Create a Mini App

[Mini apps](https://docs.worldcoin.org/mini-apps) enable third-party developers to create native-like applications within World App.

This template is a way for you to quickly get started with authentication and examples of some of the trickier commands.

## Getting Started

1. cp .env.example .env.local
2. Follow the instructions in the .env.local file
3. Run `npm run dev`
4. Run `ngrok http 3000`
5. Run `npx auth secret` to update the `AUTH_SECRET` in the .env.local file
6. Add your domain to the `allowedDevOrigins` in the next.config.ts file.
7. [For Testing] If you're using a proxy like ngrok, you need to update the `AUTH_URL` in the .env.local file to your ngrok url.
8. Continue to developer.worldcoin.org and make sure your app is connected to the right ngrok url
9. [Optional] For Verify and Send Transaction to work you need to do some more setup in the dev portal. The steps are outlined in the respective component files.

## Authentication

This starter kit uses [Minikit's](https://github.com/worldcoin/minikit-js) wallet auth to authenticate users, and [next-auth](https://authjs.dev/getting-started) to manage sessions.

## UI Library

This starter kit uses [Mini Apps UI Kit](https://github.com/worldcoin/mini-apps-ui-kit) to style the app. We recommend using the UI kit to make sure you are compliant with [World App's design system](https://docs.world.org/mini-apps/design/app-guidelines).

## Eruda

[Eruda](https://github.com/liriliri/eruda) is a tool that allows you to inspect the console while building as a mini app. You should disable this in production.

## Architecture

```mermaid
graph TB
    subgraph User["User Layer"]
        WA["World App (Mini App)"]
    end

    subgraph Frontend["Presentation Layer (miniapp/)"]
        LP["Landing Page"]
        CW["Create Wizard (5-step)"]
        DASH["Dashboard"]
        CHAT["Chat Interface"]
    end

    subgraph API["API Layer"]
        AUTH["NextAuth + World ID"]
        DEPLOY_API["POST /api/agent/deploy"]
        LIST_API["GET /api/agent/list"]
        VERIFY["POST /api/verify-proof"]
        PAY["POST /api/initiate-payment"]
    end

    subgraph Orchestrator["Orchestration Layer (orchestrator/)"]
        DOCKER["Docker Container Manager"]
        ENS_REG["ENS Subname Registration"]
        WALLET["Agent Wallet Generation"]
        AGENTKIT["AgentKit Registration"]
    end

    subgraph Runtime["Agent Runtime Layer (agent/)"]
        LOOP["AgentLoop (Reasoning Core)"]
        TOOLS["Tool Registry"]
        subgraph Channels["Communication Channels"]
            TG["Telegram (grammy)"]
            DC["Discord (discord.js)"]
            WH["WhatsApp (baileys)"]
            WEB["Web Chat (Express)"]
            X402["x402 API"]
        end
    end

    subgraph LLM["LLM Providers"]
        ZG_COMPUTE["0G Compute (TEE-backed)"]
        BEDROCK["AWS Bedrock (fallback)"]
    end

    subgraph Storage["Storage & Identity Layer"]
        ENS["ENS (agent-name.caas.eth)"]
        ZG_STORAGE["0G Storage (soul, skills, memory)"]
        ZG_CHAIN["0G Chain (ERC-7857 INFT)"]
        MONGO["MongoDB (metadata)"]
        CRE["Chainlink CRE (financial workflows)"]
    end

    WA --> Frontend
    Frontend --> API
    API --> AUTH
    AUTH -->|World ID ZK Proof| VERIFY
    DEPLOY_API --> Orchestrator
    DEPLOY_API -->|Upload soul.md + skills| ZG_STORAGE
    DEPLOY_API -->|Mint Agent NFT| ZG_CHAIN
    DEPLOY_API -->|Set text records| ENS

    DOCKER -->|Spawn container| Runtime
    ENS_REG --> ENS
    WALLET -->|secp256k1 keypair| DOCKER
    AGENTKIT -->|Register agent| LIST_API

    LOOP --> LLM
    LOOP --> TOOLS
    TOOLS -->|Web Search, MCP, Skills| Storage
    Channels --> LOOP

    ZG_COMPUTE -.->|Primary| LOOP
    BEDROCK -.->|Fallback| LOOP

    ENS -->|caas.soul pointer| ZG_STORAGE
    ZG_CHAIN -->|INFT metadata| ZG_STORAGE
    CRE -->|WLD/USDC swaps| PAY

    style User fill:#1a1a2e,stroke:#e94560,color:#fff
    style Frontend fill:#16213e,stroke:#0f3460,color:#fff
    style API fill:#0f3460,stroke:#533483,color:#fff
    style Orchestrator fill:#533483,stroke:#e94560,color:#fff
    style Runtime fill:#1a1a2e,stroke:#0f3460,color:#fff
    style LLM fill:#16213e,stroke:#533483,color:#fff
    style Storage fill:#0f3460,stroke:#e94560,color:#fff
```

### Agent Creation Flow

```mermaid
sequenceDiagram
    participant U as User (World App)
    participant M as Miniapp
    participant W as World ID
    participant O as Orchestrator
    participant ZS as 0G Storage
    participant ZC as 0G Chain
    participant E as ENS
    participant D as Docker

    U->>M: Start Create Wizard
    M->>W: Verify (ZK Proof)
    W-->>M: Verified human

    U->>M: Choose name, channels, personality
    M->>ZS: Upload soul.md + skills.json
    ZS-->>M: Content IDs

    M->>ZC: Mint ERC-7857 INFT
    ZC-->>M: Token ID

    M->>E: Register agent-name.caas.eth
    M->>E: Set text records (soul, personality, channels)

    M->>O: POST /agents (deploy)
    O->>O: Generate wallet (secp256k1)
    O->>D: Create & start container
    D-->>O: Container running on port
    O-->>M: Agent live

    M-->>U: Agent deployed & ready
```

### Agent Message Processing

```mermaid
flowchart LR
    MSG["Incoming Message"] --> CH{"Channel Handler"}
    CH --> TG["Telegram"]
    CH --> DC["Discord"]
    CH --> WH["WhatsApp"]
    CH --> WEB["Web Chat"]
    CH --> X4["x402 API"]

    TG & DC & WH & WEB & X4 --> LOOP["AgentLoop.run()"]
    LOOP --> SYS["Build: system prompt + history + message"]
    SYS --> LLM["LLM Provider (0G / Bedrock)"]
    LLM --> RESP{"Response"}
    RESP -->|Tool calls| TOOLS["Execute Tools"]
    TOOLS --> LLM
    RESP -->|Final text| OUT["Send Reply to Channel"]
```

## Contributing

This template was made with help from the amazing [supercorp-ai](https://github.com/supercorp-ai) team.
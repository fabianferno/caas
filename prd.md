# CaaS — Claw as a Service

## Product Specification

**Version 1.0 — Hackathon Submission**

*Create and deploy autonomous, human-verified AI agents on World.*
*Powered by World ID · 0G · ENS · Chainlink CRE · x402*

---

## Executive Summary

CaaS (Claw as a Service) is a platform where verified humans spin up autonomous AI agents—called Claws—that operate across WhatsApp, Telegram, web chat, and x402 API endpoints. Every Claw is human-backed via World ID, gets an onchain identity via ENS (`agent-name.caas.eth`), stores its personality and configuration immutably on 0G Storage, and can execute verifiable financial operations through Chainlink CRE workflows.

**The core value proposition:** any verified human can deploy an AI agent in under 5 minutes that can think, remember, transact, and operate autonomously across the internet—funded entirely with WLD.

### Why Now

- **World AgentKit** launched March 17, 2026—the first production toolkit for human-backed AI agents with x402 payments.
- **x402** was transferred to the Linux Foundation on April 2, 2026. Backed by Coinbase, Cloudflare, Google, AWS, Visa, Mastercard, and Stripe.
- **0G Aristotle Mainnet** is live with 300+ ecosystem projects, delivering decentralized storage at 2 GB/s and compute with TEE-backed verification.
- **Chainlink CRE** is in production with institutional partners (JPMorgan, UBS, Ondo), enabling verifiable cross-chain workflows in TypeScript.
- **ENS text records** support arbitrary key-value data—the perfect onchain identity layer for AI agent metadata.

---

## Problem Statement

Deploying an autonomous AI agent today requires stitching together 6+ services: an LLM provider, a messaging API, a payment processor, an identity system, storage, and hosting. There is no unified platform where a non-technical person can:

1. Prove they are human and tie that proof to their agent
2. Give the agent a persistent, decentralized identity
3. Fund the agent with a single token for all operations
4. Deploy the agent to multiple channels simultaneously
5. Store the agent's personality and memory immutably
6. Have the agent transact autonomously via x402 micropayments

**CaaS solves all six in one product.**

---

## Technical Architecture

### Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router) | World Mini App + web dashboard |
| UI | Tailwind v4 + Framer Motion | Responsive UI, animations |
| Auth | NextAuth v5 + World ID Wallet Auth | Human verification, session management |
| Agent Identity | ENS (ENSIP-5 text records) | Onchain name, personality storage |
| Agent Proof | World AgentKit (`@worldcoin/agentkit`) | Human-backed agent registration |
| Payments | x402 protocol + WLD | Micropayments, pay-per-call APIs |
| Storage | 0G Storage | Agent memory, soul.md, conversation logs |
| Compute | 0G Compute Network | LLM inference (TEE-verified) |
| Financial Ops | Chainlink CRE | WLD→USDC swaps, cross-chain settlement |
| Messaging | WhatsApp Business API, Telegram Bot API | Multi-channel agent delivery |
| Blockchain | World Chain + viem | Agent wallet, onchain transactions |

### Architecture Flow

```
User (World App) → World ID Verification → CaaS Platform → Agent Creation Wizard

Agent Creation → ENS Subname Registration → 0G Storage (soul.md + config) → AgentKit Registration (AgentBook)

Agent Runtime → 0G Compute (LLM inference) → Chainlink CRE (financial workflows) → x402 (micropayments)

Agent Channels → WhatsApp / Telegram / Web Chat / x402 API endpoints
```

---

### ENS as Agent Identity Layer

Each Claw gets an ENS subname under `caas.eth` (e.g., `my-agent.caas.eth`). ENS text records (ENSIP-5) store the agent's soul:

| Record Key | Value | Purpose |
|-----------|-------|---------|
| `caas.soul` | `0g://hash` (IPFS-style CID) | Pointer to soul.md on 0G Storage |
| `caas.personality` | JSON: tone, style, guardrails | Inline personality config (< 500 chars) |
| `caas.channels` | `whatsapp,telegram,web,x402` | Active deployment channels |
| `caas.owner` | World ID nullifier hash | Proof of human ownership (ZK) |
| `caas.skills` | `0g://hash` | Pointer to skills manifest on 0G |
| `caas.inft` | ERC-7857 token ID on 0G Chain | Links ENS identity to the INFT |
| `caas.storage` | Merkle root of encrypted data | Verifiable pointer to 0G Storage blobs |
| `caas.version` | `1.0.0` | Agent config version |
| `avatar` | URL or IPFS hash | Agent avatar (standard ENS record) |
| `description` | Free text | Agent bio (standard ENS record) |

This makes every Claw's identity fully onchain, portable, and resolvable by any ENS-compatible client. Anyone can look up `my-agent.caas.eth` and know exactly who built it, what it does, and where its personality lives.

---

### 0G Integration: Storage + Compute

#### 0G Storage

Large agent data that exceeds ENS text record limits lives on 0G Storage:

- **soul.md** — Full personality file: system prompt, behavioral rules, tone guidance, content guardrails. Typically 2–10 KB.
- **skills.json** — API spec files (OpenAPI/Swagger) that define what the agent can do. Each skill is a reference to an API the agent can call.
- **memory/** — Conversation logs, learned preferences, long-term context. Grows over time.
- **assets/** — Images, documents, or other files the agent needs.

0G Storage provides verifiable permanence—the agent's personality cannot be silently altered by anyone, including the platform.

#### 0G Compute

LLM inference for each Claw runs on 0G's decentralized compute network:

- **TEE-backed verification** — Every inference call is cryptographically verified. Users can prove their agent ran correctly.
- **DePIN economics** — GPU providers earn rewards for serving inference. Costs are lower than centralized providers.
- **Model flexibility** — Agents can use different models depending on the task (fast/cheap for chat, powerful for reasoning).

---

### 0G INFT: Agents as Intelligent NFTs (ERC-7857)

Every Claw is minted as an **INFT (Intelligent Non-Fungible Token)** using the ERC-7857 standard on 0G Chain. Unlike traditional NFTs that store a static pointer to metadata, INFTs carry encrypted AI agent data — personality, skills, memory — that transfers securely with ownership.

#### Why ERC-7857 over ERC-721

Traditional NFT standards fail for AI agents because:

1. **Static metadata** — ERC-721 uses publicly accessible metadata URIs. Agent configs are dynamic and often private.
2. **Incomplete transfers** — ERC-721 only transfers the ownership identifier, not the underlying intelligence (soul.md, skills, memory).
3. **No encryption** — Current standards have no built-in encryption for proprietary agent data.

ERC-7857 solves all three with privacy-preserving metadata, secure transfers, and dynamic data management.

#### ERC-7857 Core Interfaces

The standard defines three Solidity interfaces:

**1. IERC7857 — Main NFT Interface**

```solidity
interface IERC7857 {
    // Transfer with metadata re-encryption
    function iTransfer(
        address _to,
        uint256 _tokenId,
        TransferValidityProof[] calldata _proofs
    ) external;

    // Clone token with same metadata (for templates)
    function iClone(
        address _to,
        uint256 _tokenId,
        TransferValidityProof[] calldata _proofs
    ) external returns (uint256);

    // Grant usage rights without ownership transfer
    function authorizeUsage(uint256 _tokenId, address _user) external;

    // Revoke usage rights
    function revokeAuthorization(uint256 _tokenId, address _user) external;

    // Delegate access check to an assistant (e.g., a TEE)
    function delegateAccess(address _assistant) external;

    // Standard ownership + approval
    function ownerOf(uint256 _tokenId) external view returns (address);
    function authorizedUsersOf(uint256 _tokenId) external view returns (address[] memory);
    function approve(address _to, uint256 _tokenId) external;
    function setApprovalForAll(address _operator, bool _approved) external;

    // Events
    event Transferred(address indexed from, address indexed to, uint256 indexed tokenId);
    event Cloned(uint256 indexed originalTokenId, uint256 indexed newTokenId, address indexed to);
    event Authorization(uint256 indexed tokenId, address indexed user);
    event AuthorizationRevoked(uint256 indexed tokenId, address indexed user);
    event PublishedSealedKey(uint256 indexed tokenId, bytes sealedKey);
    event DelegateAccess(address indexed owner, address indexed assistant);
}
```

**2. IERC7857Metadata — Intelligent Data**

```solidity
struct IntelligentData {
    string dataDescription;   // e.g., "soul.md", "skills.json"
    bytes32 dataHash;         // Hash of the encrypted data on 0G Storage
}

interface IERC7857Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function intelligentDataOf(uint256 _tokenId) external view returns (IntelligentData[] memory);
}
```

**3. IERC7857DataVerifier — Transfer Proofs**

```solidity
enum OracleType { TEE, ZKP }

struct AccessProof {
    bytes32 oldDataHash;
    bytes32 newDataHash;
    bytes nonce;
    bytes encryptedPubKey;
    bytes proof;
}

struct OwnershipProof {
    OracleType oracleType;
    bytes32 oldDataHash;
    bytes32 newDataHash;
    bytes sealedKey;
    bytes encryptedPubKey;
    bytes nonce;
    bytes proof;
}

struct TransferValidityProof {
    AccessProof accessProof;
    OwnershipProof ownershipProof;
}

interface IERC7857DataVerifier {
    function verifyTransferValidity(
        TransferValidityProof[] calldata _proofs
    ) external returns (TransferValidityProofOutput[] memory);
}
```

#### How CaaS Uses INFTs

When a user deploys a Claw, the platform:

1. **Encrypts** the agent's soul.md, skills manifest, and config with the owner's key
2. **Stores** encrypted data on 0G Storage, getting back content hashes
3. **Mints** an INFT via the `AgentNFT.mint()` function with `IntelligentData[]` containing:
   - `{ dataDescription: "soul.md", dataHash: <0g-storage-hash> }`
   - `{ dataDescription: "skills.json", dataHash: <0g-storage-hash> }`
   - `{ dataDescription: "config.json", dataHash: <0g-storage-hash> }`
4. **Registers** the ENS subname with `caas.inft` text record pointing to the token ID

#### Secure Transfer Flow (6 Steps)

When an INFT changes hands, the encrypted agent data is re-encrypted for the new owner via a TEE oracle:

1. **Encrypt & Commit** — Metadata encrypted, hash commitment created as authenticity proof
2. **Oracle Processing** — TEE oracle decrypts original metadata securely inside the enclave
3. **Re-encrypt for Receiver** — Oracle generates new key, re-encrypts with receiver's public key
4. **Secure Key Delivery** — New encryption key sealed with receiver's public key
5. **Verify & Finalize** — Smart contract verifies: sender's access rights, oracle validation, receiver's signed acknowledgment
6. **Access Granted** — Receiver decrypts the metadata key with their private key, gaining full access

This means selling/transferring a Claw transfers the *actual agent intelligence*, not just a pointer.

#### Clone Function

`iClone()` creates a new INFT with identical AI metadata while preserving the original. This powers the **template system** — featured Claws on the explore page can be cloned by other users as starting points.

#### Authorized Usage

`authorizeUsage()` grants interaction rights without ownership transfer. This is how end-users chat with a Claw — the owner authorizes the CaaS platform (or specific users) to use the agent's intelligence for inference, without giving them access to the underlying data.

#### INFT × 0G Infrastructure

| Component | Role in INFT Flow |
|-----------|-------------------|
| 0G Storage | Stores encrypted agent data (soul.md, skills, memory) referenced by `IntelligentData.dataHash` |
| 0G DA | Verifies data availability during transfers — guarantees metadata isn't lost |
| 0G Chain | Hosts the AgentNFT smart contract, processes mints/transfers/clones |
| 0G Compute | Runs inference using the decrypted agent data inside TEE enclaves |

#### Encryption Standards

- **AES-256-GCM** for symmetric encryption of agent data
- **RSA-4096 or ECC-P384** for public-key encryption of sealed keys
- **TEE attestation** (Intel SGX / ARM TrustZone) for oracle verification
- **ZKP alternative** supported for environments without TEE hardware (sender generates re-encryption keys; receivers should rotate keys post-transfer)

#### SDK & Tooling

```bash
npm install @0gfoundation/0g-ts-sdk @openzeppelin/contracts ethers hardhat
```

**Environment (0G Testnet):**
```
OG_RPC_URL=https://evmrpc-testnet.0g.ai
OG_STORAGE_URL=https://storage-testnet.0g.ai
OG_COMPUTE_URL=https://compute-testnet.0g.ai
```

The reference `AgentNFT` contract is upgradeable (UUPS proxy) and uses ERC-7201 namespaced storage. The `@0gfoundation/0g-ts-sdk` handles 0G Storage read/write for encrypted metadata.

#### Impact on Agent Creation Flow

The deploy step (Step 5) now includes INFT minting:

1. Encrypt soul.md + skills.json + config.json with owner's key
2. Upload encrypted blobs to 0G Storage → get content hashes
3. Call `AgentNFT.mint(intelligentData[], ownerAddress)` on 0G Chain
4. Write ENS text records: `caas.inft: <token-id>`, `caas.storage: <merkle-root>`
5. Register in AgentBook via AgentKit
6. Seed with 5 WLD initial credit
7. Activate channels

---

### Chainlink CRE: Financial Operations Layer

CRE is **NOT** used to run agent logic. CRE handles the agent's financial workflows—the operations that need verifiable, cross-chain execution:

1. **WLD → USDC Swap Workflow:** When a user tops up their agent with WLD, a CRE workflow automatically swaps a portion to USDC (required for x402 payments). The swap executes across a DEX on World Chain with consensus verification from multiple Chainlink nodes.

2. **x402 Settlement Workflow:** When a Claw makes an x402 payment to access an external API, CRE verifies the payment was correctly settled and logs the transaction onchain for auditability.

3. **Credit Balance Monitoring:** A CRE workflow monitors each agent's balance and triggers alerts (via the Ping system) when credits run low, preventing service interruption.

4. **Cross-Chain Agent Funding:** If a user holds WLD on Ethereum mainnet but wants to fund an agent on World Chain, CRE orchestrates the cross-chain transfer via CCIP.

*This keeps CRE doing what it's built for—verifiable financial orchestration—while the agent's actual thinking happens on 0G Compute.*

---

### x402 + AgentKit Integration

Every Claw is registered in World's AgentBook via AgentKit, giving it:

- **A crypto wallet** for autonomous x402 micropayments
- **Proof-of-human backing** via ZK proof from the owner's World ID
- **Rate limiting per human** — platforms can cap agent requests per verified person

When a Claw accesses an x402-gated resource (e.g., a premium data API), the flow is:

1. Claw sends HTTP request to the resource
2. Server responds with HTTP 402 + payment instructions
3. Claw's wallet signs a USDC payment (funded from WLD via CRE swap)
4. Claw re-sends request with payment proof + AgentKit human-backed proof
5. Server verifies both payment and human-backing, grants access

---

### Skills System: API-as-a-Skill

Users can add any API as a skill for their Claw by uploading an OpenAPI/Swagger spec file. The platform:

1. Parses the spec and extracts available endpoints, parameters, and auth requirements
2. Generates a skill manifest that the Claw can reason about at runtime
3. Stores the manifest on 0G Storage, referenced from the ENS `caas.skills` record
4. At runtime, the Claw can autonomously decide when to invoke a skill based on conversation context

**Example:** A user uploads the Strava API spec. Their Claw can now answer questions like "How far did I run this week?" by calling the Strava API, with x402 handling any associated costs.

---

## Agent Creation Flow

The create page (`/create`) is a 5-step wizard inside the World Mini App:

### Step 1: Verify

Authenticate with World ID via MiniKit wallet auth. This proves the user is a unique human and creates a session. The World ID nullifier hash becomes the agent's ownership proof.

### Step 2: Name

Choose an ENS subname: `my-agent.caas.eth`. The platform checks availability against the ENS registry and reserves the name. The subname is registered on World Chain with the user's wallet as controller.

### Step 3: Channels

Select deployment channels. Each channel has specific setup requirements:

| Channel | Setup | Notes |
|---------|-------|-------|
| Web Chat | Automatic—embedded widget | Available at `chat.caas.eth/agent-name` |
| WhatsApp | Connect WhatsApp Business number | Uses WhatsApp Cloud API |
| Telegram | Create bot via @BotFather, paste token | Supports groups + direct messages |
| x402 API | Automatic—x402-gated HTTP endpoint | Other agents can pay to interact |

### Step 4: Configure

Define the agent's personality and capabilities:

- **Personality:** Tone (formal/casual/playful), communication style, language preferences
- **System prompt:** Core instructions for the agent's behavior (the soul.md)
- **Guardrails:** Content restrictions, topic boundaries, response limits
- **Skills:** Upload API specs or select from a skill marketplace
- **Ping preferences:** Configure when the agent should proactively notify the owner

### Step 5: Deploy

Review summary and deploy. The deployment process:

1. Writes soul.md + skills manifest to 0G Storage
2. Registers ENS subname with text records pointing to 0G data
3. Registers agent wallet in AgentBook via AgentKit CLI
4. Seeds agent with initial 5 WLD credit (user-funded)
5. Activates selected channels
6. CRE workflow swaps portion of WLD to USDC for x402 readiness

---

## Ping System (Proactive Notifications)

Claws can proactively reach out to their owners. We call this "Ping Mode."

### How It Works

The owner configures triggers during agent creation (Step 4):

- **Schedule-based:** "Ping me every morning at 8am with my agenda"
- **Event-based:** "Ping me when my Strava weekly distance drops below 20km"
- **Balance-based:** "Ping me when agent credits drop below 2 WLD" (handled by CRE monitoring)
- **Custom:** "Ping me whenever you think I should know something"

### Notification Delivery

For the hackathon scope, pings are delivered as push notifications through the World Mini App notification system. The user sets up notifications during onboarding.

*Post-hackathon roadmap: Custom notification sounds per agent, and an optional "call mode" where the agent initiates a voice call via Twilio when urgency is high. This was considered for the hackathon but scoped out due to the 48-hour constraint and the complexity of voice integration.*

---

## Token Economics: WLD as Universal Agent Fuel

All CaaS operations are denominated in WLD. Users top up their agent's balance with WLD, and the platform handles conversion as needed.

| Operation | Cost Model | Settlement |
|-----------|-----------|------------|
| LLM Inference | Per-token pricing via 0G Compute | WLD → 0G Compute Network |
| Messaging (WhatsApp/Telegram) | Per-message fee | WLD → USDC via CRE → API provider |
| x402 API Access | Per-request micropayment | WLD → USDC via CRE → x402 facilitator |
| 0G Storage | Per-byte stored | WLD → 0G Storage Network |
| ENS Registration | One-time subname fee | WLD → ETH via CRE → ENS |
| Agent Deployment | 5 WLD initial seed | Deposited to agent wallet |

The Chainlink CRE swap workflows handle all WLD → USDC/ETH conversions transparently. From the user's perspective, they only ever interact with WLD.

---

## Hackathon Scope (48 Hours)

### Must Have (Demo-Ready)

- **World Mini App** with World ID wallet auth login
- **5-step creation wizard** (Verify → Name → Channels → Config → Deploy)
- **ENS subname registration** with custom text records (soul, personality, channels)
- **0G Storage integration** for soul.md persistence
- **AgentKit registration** in AgentBook
- **Web chat interface** talking to a deployed Claw
- **x402-gated API endpoint** for the agent
- **WLD top-up flow** via World App pay command

### Should Have (If Time Permits)

- **Telegram bot** deployment for one Claw
- **CRE workflow** for WLD → USDC swap
- **Explore page** browsing deployed Claws
- **Skill upload** (OpenAPI spec → agent skill)
- **Ping notification** via World Mini App push

### Won't Have (Post-Hackathon)

- **Voice call mode** (Twilio integration)
- **WhatsApp Business** deployment (requires Meta business verification)
- **0G Compute** for production LLM inference (will use centralized LLM for demo)
- **Skill marketplace** with community contributions
- **Multi-agent collaboration**

---

## Bounty Targets

CaaS is architected to be eligible for multiple sponsor bounties:

| Sponsor | Integration | Bounty Angle |
|---------|------------|-------------|
| World | World ID, Mini App, AgentKit, WLD payments | Best use of World ID for agentic identity |
| 0G | 0G Storage + Compute for agent infra | Best AI agent using 0G's decentralized stack |
| ENS | Creative use of ENS text records for agent identity | Best creative use of ENS beyond naming |
| Chainlink | CRE workflows for agent financial operations | Best use of CRE for automated workflows |
| Coinbase / x402 | x402 micropayments for agent-to-service commerce | Best x402 implementation for AI agents |

---

## Project Structure

```
miniapp/
├── src/
│   ├── app/
│   │   ├── page.tsx                              # Landing page (public)
│   │   ├── layout.tsx                            # Root layout + metadata
│   │   ├── globals.css                           # Global styles
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts       # NextAuth API route
│   │   │   ├── initiate-payment/route.ts         # Payment initiation
│   │   │   ├── rp-signature/route.ts             # RP signature
│   │   │   ├── verify-proof/route.ts             # World ID proof verification
│   │   │   └── agent/
│   │   │       ├── deploy/route.ts               # Agent deployment: ENS + 0G + AgentKit
│   │   │       ├── chat/route.ts                 # Agent chat endpoint (LLM + skills)
│   │   │       └── x402/route.ts                 # x402-gated agent API endpoint
│   │   └── (protected)/
│   │       ├── layout.tsx                        # Protected layout with nav
│   │       ├── home/page.tsx                     # Dashboard home
│   │       ├── create/page.tsx                   # 5-step agent creation wizard
│   │       ├── explore/page.tsx                  # Browse all agents
│   │       ├── chat/[ensName]/page.tsx           # Chat interface with an agent
│   │       └── profile/page.tsx                  # Profile, credits, settings
│   ├── components/
│   │   ├── Landing/                              # Landing page sections
│   │   ├── Navigation/                           # Bottom tab navigation
│   │   ├── CreateWizard/                         # 5-step wizard components
│   │   │   ├── VerifyStep.tsx
│   │   │   ├── NameStep.tsx
│   │   │   ├── ChannelsStep.tsx
│   │   │   ├── ConfigStep.tsx
│   │   │   └── DeployStep.tsx
│   │   ├── Chat/                                 # Chat UI components
│   │   ├── AgentCard/                            # Agent display card
│   │   └── Pay/                                  # Payment component
│   ├── lib/
│   │   ├── ens.ts                                # ENS subname registration + text record writes
│   │   ├── zero-g.ts                             # 0G Storage read/write helpers
│   │   ├── agentkit.ts                           # AgentKit registration + verification
│   │   ├── cre-workflows.ts                      # Chainlink CRE workflow definitions
│   │   ├── x402.ts                               # x402 payment middleware + facilitator
│   │   ├── skills.ts                             # OpenAPI spec parser + skill manifest builder
│   │   ├── worldtars-data.ts                     # Agent data, types, helpers
│   │   └── utils.ts                              # Utility functions (cn)
│   ├── auth/
│   │   ├── index.ts                              # Auth config
│   │   └── wallet/                               # Wallet auth helpers
│   └── providers/
│       └── index.tsx                             # Client providers wrapper
├── middleware.ts                                  # Auth middleware
├── package.json
├── next.config.ts
├── tsconfig.json
└── components.json                               # shadcn/ui config
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AgentKit is in limited beta | Registration flow may have rough edges | Test early on Day 1; have fallback mock if needed |
| CRE is early access | Workflow deployment may require manual steps | Pre-build workflows before hackathon; simplify to single-chain if needed |
| ENS subname gas costs | Deploying on mainnet is expensive | Use World Chain or testnet for demo; show mainnet flow in slides |
| 0G Compute availability | Decentralized inference may be slow | Use centralized LLM for demo; show 0G integration architecture |
| WLD → USDC liquidity | Swap slippage on low-volume pairs | Pre-fund demo agents with both WLD and USDC |

---
 
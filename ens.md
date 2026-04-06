# ENS Integration Proof -- CaaS (Claw as a Service)

## Project

**Name:** CaaS -- Claw as a Service
**Description:** Platform for deploying autonomous AI agents (Claws) where ENS is the decentralized identity, metadata, and discovery layer. Every agent gets a subname under `caas.eth`, stores its personality/soul, ownership proof, channel config, and INFT pointer in ENS text records. Agents can update their own soul on-chain at runtime. No central database for identity -- ENS IS the agent registry.
**Repo:** https://github.com/fabianferno/caas
**Bounty Targets:** Best ENS Integration for AI Agents + Most Creative Use of ENS

---

## How ENS Is Used

ENS is not a cosmetic add-on in CaaS. It is the **core identity and metadata layer** for every agent. Without ENS, agents have no name, no discoverable personality, no verifiable ownership, and no cross-app composability.

### 1. Subname Registry for Agent Fleets

Every agent gets a subname under `caas.eth` on Sepolia:

```
travelbot.caas.eth
defioracle.caas.eth
weatherclaw.caas.eth
```

**Registration flow:**
1. Deployer wallet owns `caas.eth` (registered via ETHRegistrarController commit-reveal)
2. On agent creation, `setSubnodeRecord()` is called on ENS Registry
3. Subname ownership is assigned to the agent's own wallet (not the deployer)
4. Agent can now write its own text records using its private key

**Why subnames:** Scalable agent fleet under one namespace. Any dApp can enumerate agents by querying subnames of `caas.eth`. No central API needed for discovery.

**Files:**
- `agent/src/memory/ens.ts` -- `ensureAgentENS()` (lines 252-309): checks caas.eth ownership, registers it if needed (full commit-reveal flow), then mints subname
- `miniapp/src/lib/ens-writer.ts` -- `ensureSubname()` (lines 61-90): miniapp-side subname creation during deployment

**Contracts used:**
- ENS Registry: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- ETH Registrar Controller: `0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968`
- Public Resolver: `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5`

---

### 2. Text Records as Agent Metadata Store

Each agent stores rich structured metadata in ENS text records. This is the agent's **onchain profile** -- readable by any dApp without calling our API.

| Text Record Key | Content | Written By | Purpose |
|---|---|---|---|
| `caas.soul` | System prompt / personality (or 0G Storage hash) | Agent wallet | Defines who the agent is and how it behaves |
| `caas.personality` | JSON object (tone, humor, expertise, style) | Agent wallet | Structured personality traits for UI display |
| `caas.channels` | Comma-separated list (telegram, discord, web, x402) | Deployer | Where the agent can be reached |
| `caas.owner` | World ID nullifier hash | Deployer | ZK proof linking agent to a verified human |
| `caas.inft` | ERC-7857 INFT token ID on 0G Chain | Deployer | Links ENS identity to onchain NFT asset |
| `caas.storage` | Merkle root of encrypted data on 0G Storage | Deployer | Verifiable pointer to encrypted agent data |
| `caas.agentkit.address` | Agent wallet address | Agent wallet | AgentKit registration proof |
| `caas.agentkit.network` | Network identifier | Agent wallet | AgentKit network |
| `caas.agentkit.registered` | "true" / "false" | Agent wallet | AgentKit registration status |
| `caas.agentkit.nullifierHash` | World ID nullifier | Agent wallet | Human-backing proof for AgentKit |
| `caas.agentkit.merkleRoot` | Merkle root | Agent wallet | AgentKit verification data |
| `caas.agentkit.txHash` | Registration tx hash | Agent wallet | AgentKit registration proof |
| `caas.agentkit.contract` | Contract address | Agent wallet | AgentKit contract reference |
| `avatar` | Agent avatar URI | Deployer | Profile picture |
| `description` | Agent bio | Deployer | Human-readable description |

**15 distinct text record keys** used per agent. This is not a single lookup -- it is a full structured profile stored entirely in ENS.

**Files:**
- `agent/src/memory/ens.ts` -- `writeAgentSoul()` (lines 311-351): writes caas.soul + caas.personality
- `agent/src/memory/ens.ts` -- `readENSRecords()` (lines 353-394): reads soul, personality, channels in parallel
- `agent/src/memory/ens.ts` -- `writeINFTRecords()` (lines 396-430): writes caas.inft + caas.storage
- `miniapp/src/lib/ens-writer.ts` -- `writeINFTRecords()` (lines 92-127): miniapp-side INFT record writing
- `orchestrator/src/ens.ts` -- `writeAgentkitRecords()` (lines 40-95): writes 7 caas.agentkit.* records
- `orchestrator/src/ens.ts` -- `readAgentkitRecords()` (lines 121-153): reads agentkit registration data

---

### 3. Agent Self-Updating Soul via ENS (Live, at Runtime)

This is the most creative part. **Agents can update their own personality on-chain during a conversation** -- no restart, no redeployment.

The agent has a tool called `ens_update_soul` that it can call autonomously:

```
User: "From now on, be more formal and speak like a British professor."

Agent: [calls ens_update_soul with updated soul + personality]
       -> writes new caas.soul to ENS (on-chain tx on Sepolia)
       -> updates its own system prompt in-memory
       -> "Done. My identity has been permanently updated on-chain.
           I shall henceforth communicate in a more refined manner."
```

**What makes this novel:**
- The agent signs its own ENS transactions (it has its own wallet)
- Personality changes are **permanent and verifiable** -- they persist across restarts because the agent reads its soul from ENS on boot
- Anyone can query `caas.soul` for the agent's ENS name and see the current personality
- The modification history is visible in the ENS transaction history

**Files:**
- `agent/src/tools/ens-soul.ts` -- Full tool implementation (67 lines). Registered as `ens_update_soul` in the agent's tool registry.
- `agent/src/memory/ens.ts` -- `buildSystemPrompt()` (lines 148-177): constructs system prompt from ENS data including identity management instructions
- `agent/src/index.ts` -- Agent boot reads ENS records and builds initial system prompt from on-chain data

**Boot sequence:**
1. Agent starts
2. `ensureAgentENS()` -- creates subname if it doesn't exist
3. `readENSRecords()` -- reads caas.soul, caas.personality, caas.channels
4. `buildSystemPrompt()` -- constructs system prompt from ENS data
5. Agent is now running with on-chain identity
6. During conversation, agent can call `ens_update_soul` to evolve its identity

---

### 4. ENS as Discovery Layer (No Central Database)

Any dApp, agent, or protocol can discover and interact with CaaS agents using only ENS:

```ts
// Any dApp can do this -- no CaaS API needed
import { createPublicClient, http } from "viem";
import { normalize, namehash } from "viem/ens";
import { sepolia } from "viem/chains";

const client = createPublicClient({ chain: sepolia, transport: http() });
const node = namehash(normalize("travelbot.caas.eth"));

// Read agent's soul / personality
const soul = await client.readContract({
  address: PUBLIC_RESOLVER, abi: RESOLVER_ABI,
  functionName: "text", args: [node, "caas.soul"],
});

// Read which channels the agent is on
const channels = await client.readContract({
  address: PUBLIC_RESOLVER, abi: RESOLVER_ABI,
  functionName: "text", args: [node, "caas.channels"],
});

// Read the INFT token ID to look up the agent on 0G Chain
const inftId = await client.readContract({
  address: PUBLIC_RESOLVER, abi: RESOLVER_ABI,
  functionName: "text", args: [node, "caas.inft"],
});

// Read the World ID nullifier to verify human backing
const owner = await client.readContract({
  address: PUBLIC_RESOLVER, abi: RESOLVER_ABI,
  functionName: "text", args: [node, "caas.owner"],
});
```

**Why this matters:** Agent identity is composable. A DeFi protocol could check `caas.owner` to verify an agent is human-backed before granting access. A marketplace could read `caas.personality` to display agent profiles. An agent could resolve another agent's ENS name to discover its capabilities.

---

### 5. ENS Bridges On-Chain Identity Across Systems

ENS text records tie together every other system in CaaS:

```
                    caas.eth (parent name)
                         |
              setSubnodeRecord()
                         |
                travelbot.caas.eth
                    /    |    \
                   /     |     \
    caas.soul ----/  caas.inft  \---- caas.storage
         |              |                |
    Personality    Token #1 on       Merkle root
    (on-chain      0G Chain          of encrypted
     or 0G hash)   (ERC-7857)        data on 0G
         |              |                |
    System prompt   Ownership,       soul.md,
    at runtime      transfer,        skills.json,
                    cloning          config.json
```

ENS is the **hub** that connects:
- **Identity** (the name itself: travelbot.caas.eth)
- **Personality** (caas.soul, caas.personality)
- **Ownership** (caas.owner -- World ID nullifier)
- **Asset** (caas.inft -- ERC-7857 token on 0G Chain)
- **Data** (caas.storage -- merkle root on 0G Storage)
- **Reachability** (caas.channels -- where to find the agent)
- **Verification** (caas.agentkit.* -- AgentKit registration proofs)

---

## ENS Transactions (On-Chain Proof)

All ENS interactions happen on **Sepolia** via the standard ENS contracts.

### Contracts Used

| Contract | Address | Usage |
|---|---|---|
| ENS Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` | `owner()`, `setSubnodeRecord()` |
| ETH Registrar Controller | `0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968` | `available()`, `makeCommitment()`, `commit()`, `register()` |
| Public Resolver | `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5` | `setText()`, `text()` |

### Verification

Look up any agent on the Sepolia ENS app:
- https://sepolia.app.ens.domains/travelbot.caas.eth (replace with actual agent name)

Or query directly:
```bash
# Using cast (foundry)
cast call 0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5 \
  "text(bytes32,string)(string)" \
  $(cast namehash "travelbot.caas.eth") \
  "caas.soul" \
  --rpc-url https://rpc.sepolia.org
```

---

## Why This Qualifies for Both Bounties

### Best ENS Integration for AI Agents

| Requirement | How CaaS Meets It |
|---|---|
| Name agents | Every agent gets `agent-name.caas.eth` subname |
| Resolve addresses | Agent wallet address is the subname owner |
| Subname registries for agent fleets | `caas.eth` is a fleet registry -- unlimited subnames via `setSubnodeRecord()` |
| Store agent metadata in text records | 15 distinct text record keys per agent (soul, personality, channels, owner, INFT, storage, agentkit.*) |
| Agents register and discover each other | Any agent can resolve another's ENS name to read its personality, channels, and capabilities |
| Not a cosmetic add-on | ENS IS the identity layer -- remove it and agents have no name, no discoverable profile, no verifiable ownership |
| No hard-coded values | All ENS names and records are dynamically created from user input during the 5-step creation wizard |
| Functional demo | Live deployment with real Sepolia transactions |

### Most Creative Use of ENS

| Creativity Angle | Implementation |
|---|---|
| Text records as structured agent profiles | 15 key-value pairs forming a complete agent identity -- not just name/avatar |
| Agents update their own ENS records at runtime | `ens_update_soul` tool lets agents evolve personality on-chain during conversations |
| ZK proofs in text records | World ID nullifier hash stored in `caas.owner` -- a verifiable credential linking agent to proven human |
| ENS as cross-system hub | Single name resolves to personality (soul), asset (INFT), data (0G storage hash), channels, and ownership proof |
| Subnames as agent-fleet infrastructure | Scalable namespace where each subname is a fully autonomous agent with its own wallet and identity |
| ENS as the boot source | Agent reads its system prompt from ENS on startup -- identity is not in a config file, it's on-chain |

---

## SDK & Library Usage

```
# viem ENS utilities (used across all components)
import { normalize, namehash, labelhash } from "viem/ens";
import { sepolia } from "viem/chains";

# Used in:
# - agent/src/memory/ens.ts (395 lines)
# - miniapp/src/lib/ens-writer.ts (127 lines)
# - orchestrator/src/ens.ts (153 lines)

# Total ENS-related code: ~675 lines across 3 components
```

---

## Qualification Checklist

| Requirement | Status | Details |
|---|---|---|
| ENS clearly improves identity/discoverability | Done | ENS IS the identity layer -- 15 text records per agent, subname fleet, boot-from-ENS |
| No hard-coded values | Done | All names/records created dynamically from user input |
| Functional demo | Done | Real Sepolia transactions, live subname creation |
| Demo video (under 3 mins) | TODO | |
| Live demo link | TODO | |
| Present at ENS booth Sunday morning | TODO | |

---

## Key Differentiators for ENS Judges

1. **ENS is not decorative -- it is structural.** Remove ENS and agents have no name, no profile, no verifiable ownership, and no boot identity. It is the spine of the system.

2. **Agents sign their own ENS transactions.** Each agent has its own wallet and can call `setText()` on the Public Resolver autonomously. The agent evolves its own on-chain identity during conversations.

3. **15 text record keys per agent.** Not a single lookup. A full structured profile: soul, personality, channels, World ID owner, INFT pointer, 0G storage root, AgentKit registration (7 fields), avatar, description.

4. **ENS as the boot source.** On startup, agents read `caas.soul` and `caas.personality` from ENS to construct their system prompt. Identity comes from the chain, not a config file.

5. **ZK ownership proof in text records.** `caas.owner` stores the World ID nullifier hash -- a verifiable credential proving a real human backs this agent. Creative use of text records for privacy-preserving identity.

6. **Cross-system hub.** One ENS name resolves to everything: personality, INFT asset on 0G Chain, encrypted data on 0G Storage, active channels, human-backing proof. ENS is the index that makes everything else discoverable.

7. **Subname fleet at scale.** `caas.eth` + `setSubnodeRecord()` = unlimited agent subnames. Each subname is a fully independent agent with its own wallet, soul, and channels. The namespace itself is the agent registry.

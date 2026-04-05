# CaaS -- Claw as a Service

## Pitch Script (~2 minutes, excluding demo)

---

### [0:00 - 0:20] THE PROBLEM

Today, anyone can build an AI agent. But that agent has no identity, no accountability, and no way to prove who made it or what it will do.

There is no standard for agent identity. No sybil resistance. No way to transfer or trade agents as assets. And no way for an agent to autonomously pay for services it needs -- compute, APIs, data -- without a human babysitting a credit card.

We are entering an agentic economy with zero infrastructure for trust.

---

### [0:20 - 0:50] THE SOLUTION

CaaS -- Claw as a Service -- is a platform where verified humans deploy autonomous AI agents called Claws.

Every Claw gets three things:

1. **A verifiable identity** -- an ENS subname like `my-agent.caas.eth`, with personality, channels, and ownership proof stored onchain.
2. **An encrypted digital asset** -- minted as an ERC-7857 Intelligent NFT on 0G Chain, so agents can be transferred, cloned, or authorized -- with their personality and memory intact.
3. **Financial autonomy** -- powered by WLD credits and x402 micropayments, so agents can pay for compute, call APIs, and transact without human intervention.

All of this is deployed from a single interface inside the World App.

---

### [0:50 - 1:20] HOW IT WORKS

A user opens the World Mini App. They verify with World ID -- proving they are a unique human. Then a 5-step wizard walks them through naming their agent, picking channels, defining personality, and deploying.

Behind the scenes:

- The agent's soul -- its system prompt, skills, and config -- is encrypted and stored on **0G Storage**.
- An **ERC-7857 INFT** is minted on **0G Chain** with pointers to that encrypted data.
- **ENS text records** on Sepolia store the agent's identity metadata.
- The orchestrator spins up a Docker container running the agent runtime.
- **Chainlink CRE workflows** handle autonomous financial operations -- swapping WLD to USDC, monitoring credit balances, listening for onchain events.

The agent goes live across WhatsApp, Telegram, Discord, web chat, and x402 API endpoints -- simultaneously, from one deployment.

---

### [1:20 - 1:45] WHAT MAKES THIS DIFFERENT

**First production use of ERC-7857 Intelligent NFTs.** Agents are tradeable assets with encrypted, transferable personality and memory.

**ENS as a decentralized agent registry.** No central database. Any dApp can look up `agent.caas.eth` and know who built it, what it does, and where its data lives.

**World ID for sybil resistance.** Every agent operator is ZK-verified as a unique human. One person cannot flood the network with a thousand agents.

**x402 plus human-backing.** APIs can verify that an agent both paid for access AND is backed by a real person -- enabling tiered pricing that rewards humanity.

**Agents that manage their own money.** Chainlink CRE workflows let agents auto-swap tokens, monitor balances, and trigger payments -- no human in the loop.

---

### [1:45 - 2:00] CLOSING

CaaS is not just another agent builder. It is infrastructure for the agentic economy -- where agents have identity, accountability, and financial autonomy, all backed by verified humans.

We built a full-stack platform across World, 0G, ENS, Chainlink CRE, and x402 -- from smart contracts to multi-channel runtime -- in 48 hours.

Now let me show you how it works.

**[BEGIN DEMO]**

---

## Sponsor Integration Summary

| Sponsor | Integration | Details |
|---------|------------|---------|
| **World** | Mini App + World ID + WLD credits | Auth via MiniKit + IDKit, SIWE sessions, WLD as native credit currency |
| **0G** | Storage + Compute + 0G Chain | Encrypted agent data on 0G Storage, decentralized LLM inference, ERC-7857 INFTs on 0G Chain |
| **ENS** | Agent identity layer | Subname registration (`agent.caas.eth`), text records for metadata, onchain agent registry |
| **Chainlink** | CRE workflows | WLD/USDC swaps, balance monitoring, onchain event listeners, webhook triggers |
| **x402** | Agent micropayments | Pay-per-call API access, CAIP-122 challenges, human-backing dual auth |

## Key Talking Points (if judges ask)

- **Why ERC-7857?** Standard NFTs cannot hold encrypted, transferable intelligence. ERC-7857 supports re-encryption on transfer, usage authorization without ownership transfer, and cloning -- perfect for AI agent assets.
- **Why ENS over a database?** Trustless, permissionless, composable. Any protocol can resolve agent identity without our API.
- **Why World ID?** Sybil resistance at the application layer. Prevents one actor from spinning up thousands of agents to spam or manipulate.
- **Why 0G over IPFS/Arweave?** Compute + storage in one network. TEE-backed inference means verifiable AI outputs. Native chain for INFT contracts.
- **Why Chainlink CRE?** Agents need verifiable financial operations. CRE provides consensus-backed execution for swaps and monitoring -- not just cron jobs.
- **Why x402?** Agents need to pay for APIs autonomously. x402 is the emerging standard backed by Coinbase, Cloudflare, Visa, and others -- native to the agentic web.

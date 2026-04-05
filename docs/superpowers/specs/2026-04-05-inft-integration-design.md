# INFT Integration Design

**Date:** 2026-04-05
**Status:** Approved

---

## Overview

Every agent (Claw) deployed on CaaS is minted as an Intelligent NFT (INFT) using the ERC-7857 standard on 0G Chain. Unlike ERC-721, INFTs carry encrypted AI agent data -- soul.md, skills manifest, config -- that transfers securely with ownership. This document covers the full implementation of INFT minting during agent deployment, including 0G Storage upload, ENS record writes, and the sequential deploy UI.

---

## Architecture

Three parallel implementation tracks converge at a single API endpoint.

```
miniapp/src/app/(protected)/create/page.tsx
  |-- "Deploy Agent" click
  |-- POST /api/agent/deploy  (new)
        |-- Track 2: encrypt + upload to 0G Storage  --> content hashes
        |-- Track 1: AgentNFT.mint(hashes, ownerAddr) on 0G Chain  --> tokenId
        |-- Track 2: write ENS caas.inft + caas.storage on Sepolia  --> tx hash
        |-- SSE stream: emits step progress events
        |-- return { tokenId, txHashes, storageHashes }
  |-- UI renders sequential step loader
```

**Track 1 -- contracts/** (new directory):
- `AgentNFT.sol` implementing IERC7857 + IERC7857Metadata
- UUPS upgradeable proxy (ERC-7201 namespaced storage)
- Stubbed TEE verifier: when `teeOracle == address(0)`, proof verification is skipped
- Hardhat config targeting 0G Testnet (`https://evmrpc-testnet.0g.ai`)

**Track 2 -- agent/src/memory/**:
- New `inft-uploader.ts`: AES-256-GCM encrypt + 0G Storage upload, returns `IntelligentData[]`
- Updated `ens.ts`: adds `writeINFTRecords(tokenId, merkleRoot, ownerKey)` function

**Track 3 -- miniapp/**:
- New `/api/agent/deploy/route.ts`: SSE orchestration endpoint
- Updated `create/page.tsx` Step 6: sequential step loader UI

---

## Data Flow

### Key Derivation

The owner's wallet signs a deterministic message to derive the AES-256-GCM encryption key:

```
message = "caas-agent-key:" + agentName
signature = wallet.signMessage(message)
aesKey = keccak256(signature)  // 32 bytes, used as AES-256-GCM key
```

This is non-custodial. The server never sees the plaintext key -- the frontend derives it, encrypts locally, and sends the encrypted blobs to the deploy endpoint.

### Deploy Sequence

```
User clicks "Deploy Agent"
  |
  +--> Frontend derives AES key from wallet signature
  +--> POST /api/agent/deploy
         { agentName, encryptedSoul, encryptedSkills, encryptedConfig,
           ownerAddress, walletSignature }

Step 1: Upload to 0G Storage
  - Upload 3 encrypted blobs via @0gfoundation/0g-ts-sdk
  - Receive content hashes h1, h2, h3
  - merkleRoot = keccak256(abi.encodePacked(h1, h2, h3))
  --> SSE { step: 1, status: "done", hashes: [h1, h2, h3] }

Step 2: Mint INFT on 0G Chain
  - IntelligentData[] = [
      { dataDescription: "soul.md",     dataHash: h1 },
      { dataDescription: "skills.json", dataHash: h2 },
      { dataDescription: "config.json", dataHash: h3 }
    ]
  - AgentNFT.mint(intelligentData, ownerAddress) on 0G Testnet
  --> SSE { step: 2, status: "done", tokenId, txHash }

Step 3: Write ENS Records on Sepolia
  - setTextRecord(agentENS, "caas.inft", tokenId.toString())
  - setTextRecord(agentENS, "caas.storage", merkleRoot)
  --> SSE { step: 3, status: "done", txHash }

Final SSE event: { done: true, tokenId, storageHashes, merkleRoot, txHashes }
```

---

## Smart Contract

### File: `contracts/AgentNFT.sol`

**Inheritance:**
```
AgentNFT
  ERC721Upgradeable (OpenZeppelin)
  IERC7857
  IERC7857Metadata
  UUPSUpgradeable
```

**ERC-7201 Namespaced Storage:**
```solidity
struct AgentNFTStorage {
  uint256 nextTokenId;
  mapping(uint256 => IntelligentData[]) intelligentData;
  mapping(uint256 => address[]) authorizedUsers;
  address teeOracle;
}

bytes32 private constant STORAGE_SLOT =
  keccak256(abi.encode(uint256(keccak256("caas.storage.AgentNFT")) - 1))
  & ~bytes32(uint256(0xff));
```

**Key Functions:**
```solidity
function mint(IntelligentData[] calldata data, address to)
  external returns (uint256 tokenId)

function iTransfer(address to, uint256 tokenId, TransferValidityProof[] calldata proofs)
  external

function iClone(address to, uint256 tokenId, TransferValidityProof[] calldata proofs)
  external returns (uint256 newTokenId)

function authorizeUsage(uint256 tokenId, address user) external
function revokeAuthorization(uint256 tokenId, address user) external
function setTEEOracle(address oracle) external onlyOwner
function intelligentDataOf(uint256 tokenId) external view returns (IntelligentData[])
```

**TEE Stub:** when `teeOracle == address(0)`, `iTransfer` and `iClone` skip proof verification and proceed. `PublishedSealedKey` is emitted with empty bytes. Real TEE is wired post-deploy by calling `setTEEOracle(address)`.

**Deployment:**
- Network: 0G Testnet, chain ID 16600, RPC `https://evmrpc-testnet.0g.ai`
- Pattern: UUPS proxy via `@openzeppelin/hardhat-upgrades`
- Script: `contracts/scripts/deploy.ts`

---

## 0G Storage Module

### File: `agent/src/memory/inft-uploader.ts`

**Encryption:**
- AES-256-GCM with a 12-byte random IV per blob
- Output format: `{ iv: hex, ciphertext: hex, authTag: hex }`
- Key: 32-byte buffer derived by caller (keccak256 of wallet signature)

**Upload:**
- Uses `@0gfoundation/0g-ts-sdk` `Indexer` to upload each blob
- Returns `{ hash: bytes32, size: number }` per blob

**Exported function:**
```typescript
export async function encryptAndUpload(
  blobs: { description: string; content: string }[],
  aesKey: Buffer,
  indexerUrl: string,
  signer: ethers.Wallet
): Promise<IntelligentData[]>
```

### Updates to `agent/src/memory/ens.ts`

New function:
```typescript
export async function writeINFTRecords(
  agentName: string,
  tokenId: bigint,
  merkleRoot: string,
  privateKey: string
): Promise<{ inftTxHash: string; storageTxHash: string }>
```

Writes two text records to the agent's ENS subname:
- `caas.inft` = tokenId as decimal string
- `caas.storage` = merkleRoot hex string

---

## Deploy API Endpoint

### File: `miniapp/src/app/api/agent/deploy/route.ts`

**Method:** POST with SSE response (`Content-Type: text/event-stream`)

**Request body:**
```typescript
{
  agentName: string
  ownerAddress: string
  encryptedSoul: string      // AES-256-GCM encrypted blob (hex)
  encryptedSkills: string
  encryptedConfig: string
  walletSignature: string    // for server-side verification only, not key derivation
}
```

**SSE event schema:**
```typescript
type DeployEvent =
  | { step: 1 | 2 | 3; status: "start" | "done" | "error"; data?: unknown }
  | { done: true; tokenId: string; txHashes: string[]; storageHashes: string[] }
```

**Orchestration:**
1. Validate request
2. Upload encrypted blobs to 0G Storage (step 1)
3. Call `AgentNFT.mint()` on 0G Chain using platform deployer wallet (step 2)
4. Call `writeINFTRecords()` on Sepolia using platform ENS wallet (step 3)
5. Emit final `done` event

Note: the platform deployer wallet mints on behalf of the user and immediately transfers ownership to `ownerAddress`.

---

## Deploy UI

### Step 6 State Machine

```
deployState: "idle" | "deploying" | "success" | "error"
steps: Array<{ label: string; status: "pending" | "in_progress" | "done" | "error" }>
```

**Step labels:**
1. "Uploading to 0G Storage"
2. "Minting INFT on 0G Chain"
3. "Writing ENS Records"

**State transitions:**
- `idle`: show "Deploy Agent" button
- `deploying`: hide button, show step list; SSE drives status updates
- `success`: all steps green, show success card with tokenId + explorer links
- `error`: failed step shows red X + error message, show "Retry" button

**Success card:**
```
Agent deployed
<agentName>.caas.eth
INFT #<tokenId>
[ View on 0G Explorer ]  [ Go to Dashboard ]
```

---

## Environment Variables

**miniapp/.env.local (additions):**
```
OG_RPC_URL=https://evmrpc-testnet.0g.ai
OG_STORAGE_URL=https://storage-testnet.0g.ai
OG_DEPLOYER_PRIVATE_KEY=<platform-wallet-pk>
AGENT_NFT_CONTRACT_ADDRESS=<deployed-contract-address>
```

**agent/.env.local (additions):**
```
OG_RPC_URL=https://evmrpc-testnet.0g.ai
OG_STORAGE_URL=https://storage-testnet.0g.ai
OG_INDEXER_URL=https://indexer-storage-standard.0g.ai
```

---

## Files to Create

```
contracts/
  AgentNFT.sol
  interfaces/IERC7857.sol
  interfaces/IERC7857Metadata.sol
  interfaces/IERC7857DataVerifier.sol
  scripts/deploy.ts
  hardhat.config.ts
  package.json

agent/src/memory/
  inft-uploader.ts             (new)
  ens.ts                       (updated: add writeINFTRecords)

miniapp/src/app/api/agent/deploy/
  route.ts                     (new)

miniapp/src/app/(protected)/create/
  page.tsx                     (updated: Step 6 deploy UI)
```

---

## Out of Scope (This Iteration)

- Real TEE oracle integration (stubbed)
- iTransfer / iClone UI flows (contracts implemented, no frontend)
- authorizeUsage for end-user chat (separate feature)
- Chainlink CRE WLD->USDC funding
- AgentKit registration
- Channel activation post-deploy

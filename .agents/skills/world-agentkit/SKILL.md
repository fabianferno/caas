---
name: world-agentkit
description: Server-side AgentKit integration and SDK reference. Use when building x402 endpoints that accept AgentKit authentication, configuring AgentBook verification, setting up access modes (free, free-trial, discount), or using low-level AgentKit validation helpers. Covers Hono/Express/Next.js server setup, storage interfaces, chain utilities, and the full API surface.
---

# AgentKit Server Integration & SDK Reference

AgentKit extends x402 allowing websites to distinguish human-backed agents from bots and scripts. Enable agentic traffic to access API endpoints while blocking malicious actors, scalpers, and spam.

## Quick Start

Default implementation path:
- Accepts payments on both World Chain and Base
- Agent registration on Worldchain
- AgentBook lookup pinned to Worldchain
- `free-trial` mode with 3 uses
- Hono + `@x402/hono` as reference server example

### Step 1: Install

```bash
npm install @worldcoin/agentkit
```

### Step 2: Register the agent in AgentBook

Register the wallet address your agent will sign with:

```bash
npx @worldcoin/agentkit-cli register <agent-address>
```

By default the CLI registers on Worldchain and submits through the hosted relay.

During registration the CLI:
1. Looks up the next nonce for the agent address
2. Prompts the World App verification flow
3. Submits the registration transaction

### Step 3: Wire the hooks-based server flow

The example below shows the maintained Hono wrapper path. AgentKit itself is not Hono-only: Express and Next.js route handlers can use the same hooks and low-level helpers.

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { HTTPFacilitatorClient } from '@x402/core/http'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import {
    paymentMiddlewareFromHTTPServer,
    x402HTTPResourceServer,
    x402ResourceServer,
} from '@x402/hono'
import {
    agentkitResourceServerExtension,
    createAgentBookVerifier,
    createAgentkitHooks,
    declareAgentkitExtension,
    InMemoryAgentKitStorage,
} from '@worldcoin/agentkit'

const WORLD_CHAIN = 'eip155:480'
const BASE = "eip155:8453";
const WORLD_USDC = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1'
const payTo = '0xYourAddress'

const facilitatorClient = new HTTPFacilitatorClient({
    url: 'https://x402-worldchain.vercel.app/facilitator',
})

const evmScheme = new ExactEvmScheme()
    .registerMoneyParser(async (amount, network) => {
        if (network !== WORLD_CHAIN) return null
        return {
            amount: String(Math.round(amount * 1e6)),
            asset: WORLD_USDC,
            extra: { name: 'USD Coin', version: '2' },
        }
    })

const agentBook = createAgentBookVerifier({ network: 'world' })
const storage = new InMemoryAgentKitStorage()

const hooks = createAgentkitHooks({
    agentBook,
    storage,
    mode: { type: 'free-trial', uses: 3 },
})

const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(WORLD_CHAIN, evmScheme)
    .registerExtension(agentkitResourceServerExtension)

const routes = {
    'GET /data': {
        accepts: [
            { scheme: 'exact', price: '$0.01', network: WORLD_CHAIN, payTo },
            { scheme: 'exact', price: '$0.01', network: BASE, payTo },
        ],
        extensions: declareAgentkitExtension({
            statement: 'Verify your agent is backed by a real human',
            mode: { type: 'free-trial', uses: 3 },
        }),
    },
}

const httpServer = new x402HTTPResourceServer(resourceServer, routes)
    .onProtectedRequest(hooks.requestHook)

const app = new Hono()
app.use(paymentMiddlewareFromHTTPServer(httpServer))

app.get('/data', c => {
    return c.json({ message: 'Protected content' })
})

serve({ fetch: app.fetch, port: 4021 })
```

### Step 4: Configure the default mode and storage

`InMemoryAgentKitStorage` is fine for local testing but production should persist both usage counters and nonces.

```typescript
import type { AgentKitStorage } from '@worldcoin/agentkit'

class DatabaseAgentKitStorage implements AgentKitStorage {
    async getUsageCount(endpoint: string, humanId: string) {
        return db.getUsageCount(endpoint, humanId)
    }
    async incrementUsage(endpoint: string, humanId: string) {
        await db.incrementUsage(endpoint, humanId)
    }
    async hasUsedNonce(nonce: string) {
        return db.hasUsedNonce(nonce)
    }
    async recordNonce(nonce: string) {
        await db.recordNonce(nonce)
    }
}

const hooks = createAgentkitHooks({
    agentBook,
    storage: new DatabaseAgentKitStorage(),
    mode: { type: 'free-trial', uses: 3 },
})
```

---

## SDK Reference

### Access Modes

Usage counters are tracked per human per endpoint. Two agents backed by the same human share the same counter.

| Mode         | Fields                                                 | Behavior                                                                      |
|--------------|--------------------------------------------------------|-------------------------------------------------------------------------------|
| `free`       | `{ type: "free" }`                                     | Registered human-backed agents always bypass payment.                         |
| `free-trial` | `{ type: "free-trial"; uses?: number }`                | Bypass payment the first N times. Default `uses` is `1`.                      |
| `discount`   | `{ type: "discount"; percent: number; uses?: number }` | Underpay by configured percentage for the first N times.                      |

`discount` mode requires `verifyFailureHook` on the facilitator. Without it, discounted underpayments fail settlement verification.

### `declareAgentkitExtension(options?)`

Declare the `agentkit` extension returned in a 402 response.

| Parameter           | Type                 | Description                                                   |
|---------------------|----------------------|---------------------------------------------------------------|
| `domain`            | `string`             | Server hostname. Usually auto-derived from request URL.       |
| `resourceUri`       | `string`             | Full protected resource URI. Usually auto-derived.            |
| `network`           | `string \| string[]` | CAIP-2 network(s). If omitted, derived from `accepts[].network`. |
| `statement`         | `string`             | Human-readable signing purpose.                               |
| `version`           | `string`             | CAIP-122 version. Defaults to `"1"`.                          |
| `expirationSeconds` | `number`             | Challenge lifetime in seconds.                                |
| `mode`              | `AgentkitMode`       | Access mode clients should expect after verification.         |

### `agentkitResourceServerExtension`

Register once on your x402 resource server. Turns the declaration into a full 402 challenge by:
- Generating nonce and timestamps
- Inferring `domain` and `resourceUri` from the incoming request when omitted
- Expanding each supported network into correct signature types

### `createAgentkitHooks(options)`

Creates request-time verification hooks.

| Option      | Type                                 | Description                                                |
|-------------|--------------------------------------|------------------------------------------------------------|
| `agentBook` | `AgentBookVerifier`                  | Verifier to resolve agent wallet to human identifier.      |
| `mode`      | `AgentkitMode`                       | Access mode. Defaults to `{ type: "free" }`.               |
| `storage`   | `AgentKitStorage`                    | Required for `free-trial` and `discount`.                  |
| `rpcUrl`    | `string`                             | Custom EVM RPC for signature verification.                 |
| `onEvent`   | `(event: AgentkitHookEvent) => void` | Optional logging/debug callback.                           |

Returns:

| Field               | Type       | Description                                                     |
|---------------------|------------|-----------------------------------------------------------------|
| `requestHook`       | `function` | Runs before payment settlement; grants access for free/trial.   |
| `verifyFailureHook` | `function` | Present only for `discount` mode. Register on the facilitator.  |

`requestHook` expects a context shaped like:

```ts
{
  adapter: {
    getHeader(name: string): string | undefined
    getUrl(): string
  }
  path: string
}
```

Express and Next.js are compatible -- adapt any framework to this minimal contract.

### `AgentkitHookEvent`

| Event type           | Fields                           |
|----------------------|----------------------------------|
| `agent_verified`     | `resource`, `address`, `humanId` |
| `agent_not_verified` | `resource`, `address`            |
| `validation_failed`  | `resource`, `error?`             |
| `discount_applied`   | `resource`, `address`, `humanId` |
| `discount_exhausted` | `resource`, `address`, `humanId` |

### `createAgentBookVerifier(options?)`

Creates the verifier to resolve a wallet address to an anonymous human identifier.

Built-in AgentBook deployments:
- World Chain mainnet: `0xA23aB2712eA7BBa896930544C7d6636a96b944dA`
- Base mainnet: `0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4`
- Base Sepolia: `0xA23aB2712eA7BBa896930544C7d6636a96b944dA`

| Option            | Type                | Description                                            |
|-------------------|---------------------|--------------------------------------------------------|
| `client`          | `PublicClient`      | Fully custom viem client. Overrides automatic creation.|
| `contractAddress` | `` `0x${string}` `` | Custom AgentBook contract address.                     |
| `rpcUrl`          | `string`            | Custom RPC URL for automatic client creation.          |
| `network`         | `AgentBookNetwork`  | Pin lookup to `"world"`, `"base"`, or `"base-sepolia"`.|

Selection behavior:
- If `network` is provided, lookup is pinned to that deployment.
- If `network` is omitted and incoming `chainId` matches `eip155:480`, `eip155:8453`, or `eip155:84532`, lookup stays on that chain.
- Otherwise falls back to World Chain.

Returns:

```ts
lookupHuman(address: string, chainId: string): Promise<string | null>
```

### `AgentKitStorage` Interface

| Method                              | Description                                          |
|-------------------------------------|------------------------------------------------------|
| `getUsageCount(endpoint, humanId)`  | Current usage count for a human on a route.          |
| `incrementUsage(endpoint, humanId)` | Increment after successful free-trial or discount.   |
| `hasUsedNonce?(nonce)`              | Optional replay check.                               |
| `recordNonce?(nonce)`               | Optional replay recorder.                            |

`InMemoryAgentKitStorage` is the reference implementation -- demo only, counters lost on restart.

### Validation and Verification Helpers

#### `parseAgentkitHeader(header)`
Parses base64-encoded `agentkit` header into structured payload. Throws on invalid base64, JSON, or schema mismatch.

#### `validateAgentkitMessage(payload, resourceUri, options?)`

| Option       | Type                                             | Description                            |
|--------------|--------------------------------------------------|----------------------------------------|
| `maxAge`     | `number`                                         | Max age for `issuedAt` (ms). Default 5min. |
| `checkNonce` | `(nonce: string) => boolean \| Promise<boolean>` | Optional replay validation hook.       |

Validation rules:
- `domain` must match hostname of protected resource URL
- `uri` must resolve to same host as protected resource URL
- `issuedAt` must be valid, not in future, not older than `maxAge`
- `expirationTime` (when present) must still be in future
- `notBefore` (when present) must already have passed

Returns: `{ valid: boolean; error?: string }`

#### `verifyAgentkitSignature(payload, rpcUrl?)`

- `eip155:*` payloads: reconstructed into SIWE message, verified with viem
- `solana:*` payloads: reconstructed into SIWS message, verified with tweetnacl
- Unsupported namespaces return `{ valid: false, error: ... }`

Returns: `{ valid: boolean; address?: string; error?: string }`

#### `buildAgentkitSchema()`
Returns the JSON schema used in 402 challenge payloads.

### Chain Utilities

#### EVM

| Export               | Description                                                   |
|----------------------|---------------------------------------------------------------|
| `formatSIWEMessage`  | Reconstruct SIWE message for signing and verification.        |
| `verifyEVMSignature` | Verify EVM signature for reconstructed SIWE message.          |
| `extractEVMChainId`  | Convert CAIP-2 `eip155:*` chain ID to numeric chain ID.      |

EVM verification uses viem's `verifyMessage` (covers EOAs and ERC-1271 smart wallets).

#### Solana

| Export                          | Description                                              |
|---------------------------------|----------------------------------------------------------|
| `formatSIWSMessage`             | Reconstruct Sign-In With Solana message.                 |
| `verifySolanaSignature`         | Verify detached signature against reconstructed message. |
| `decodeBase58` / `encodeBase58` | Base58 encoding/decoding for Solana payloads.            |
| `extractSolanaChainReference`   | Extract chain reference from CAIP-2 `solana:*` ID.      |

### Supported Chains

| Family  | Namespace   | Payload `type`       | Optional `signatureScheme`        | Message Format |
|---------|-------------|----------------------|-----------------------------------|----------------|
| EVM     | `eip155:*`  | `eip191` or `eip1271`| `eip191`, `eip1271`, or `eip6492` | SIWE           |
| Solana  | `solana:*`  | `ed25519`            | `siws`                            | SIWS           |

Solana constants: `SOLANA_MAINNET`, `SOLANA_DEVNET`, `SOLANA_TESTNET`

### Manual Usage Example

Use low-level helpers directly when not using the x402 Hono wrapper:

```typescript
import {
    AGENTKIT,
    createAgentBookVerifier,
    declareAgentkitExtension,
    parseAgentkitHeader,
    validateAgentkitMessage,
    verifyAgentkitSignature,
} from '@worldcoin/agentkit'

const extensions = declareAgentkitExtension({
    domain: 'api.example.com',
    resourceUri: 'https://api.example.com/data',
    network: 'eip155:480',
    statement: 'Verify your agent is backed by a real human',
})

const agentBook = createAgentBookVerifier({ network: 'base' })

async function handleRequest(request: Request) {
    const header = request.headers.get(AGENTKIT)
    if (!header) return

    const payload = parseAgentkitHeader(header)

    const validation = await validateAgentkitMessage(payload, 'https://api.example.com/data')
    if (!validation.valid) {
        return { error: validation.error }
    }

    const verification = await verifyAgentkitSignature(payload)
    if (!verification.valid || !verification.address) {
        return { error: verification.error }
    }

    const humanId = await agentBook.lookupHuman(verification.address, payload.chainId)
    if (!humanId) {
        return { error: 'Agent is not registered in the AgentBook' }
    }

    return { humanId }
}
```

## Production Notes

- Treat `InMemoryAgentKitStorage` as demo-only.
- Persistent storage is part of the integration, not optional, if you need limited free uses.
- Wire `verifyFailureHook` into the facilitator before shipping `discount` mode.
- Hono is a reference example, not a framework restriction.

## Ecosystem

Find projects that integrate AgentKit at [agentbook.world](https://agentbook.world/).
To add your project, open a PR to the AgentBook registry on GitHub (andy-t-wang/agentbook).

Add the agentkit-x402 skill so your agent knows to use its registration when accessing x402 endpoints:

```bash
npx skills add worldcoin/agentkit agentkit-x402
```

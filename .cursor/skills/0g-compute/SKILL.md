---
name: 0g-compute
description: Use 0G Compute Network for decentralized AI inference, fine-tuning, and GPU computing. Use when building AI apps, running LLMs, or integrating GPU compute.
---

# 0G Compute Network

Decentralized GPU marketplace for AI workloads — 90% cheaper than cloud, OpenAI SDK compatible, with TEE verification.

## When to Use

- Running AI inference (LLMs, image generation, speech-to-text)
- Fine-tuning AI models
- Building AI-powered applications with decentralized compute
- Integrating OpenAI-compatible API with decentralized backend
- Setting up as a GPU compute provider

## Quick Start

### Install CLI/SDK

```bash
pnpm add @0glabs/0g-serving-broker -g    # CLI (global)
pnpm add @0glabs/0g-serving-broker       # SDK (project)
```

### Starter Kit

```bash
git clone https://github.com/0gfoundation/0g-compute-ts-starter-kit
```

### SDK Setup (Node.js)

```typescript
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const RPC_URL = "https://evmrpc.0g.ai";  // mainnet (or https://evmrpc-testnet.0g.ai)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const broker = await createZGComputeNetworkBroker(wallet);
```

### SDK Setup (Browser)

```typescript
import { BrowserProvider } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const broker = await createZGComputeNetworkBroker(signer);
```

> Browser needs `vite-plugin-node-polyfills` and manual fund management (no auto-funding).

### Discover and Use Services

```typescript
// List available services
const services = await broker.inference.listService();
const chatbots = services.filter(s => s.serviceType === 'chatbot');

// Fund account (minimum 3 0G initial deposit, 1 0G per provider)
await broker.ledger.depositFund(10);
await broker.ledger.transferFund(providerAddress, 'inference', BigInt(1) * BigInt(10 ** 18));

// Make inference request
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
const headers = await broker.inference.getRequestHeaders(providerAddress);

const response = await fetch(`${endpoint}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello!" }],
    model
  })
});

const data = await response.json();

// Optional: verify TEE response integrity
const chatID = response.headers.get("ZG-Res-Key") || data.id;
if (chatID) {
  const isValid = await broker.inference.processResponse(providerAddress, chatID);
}
```

### OpenAI SDK Compatible (Direct API)

```bash
# Get auth token via CLI
0g-compute-cli inference get-secret --provider <PROVIDER_ADDRESS>
```

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: `${serviceUrl}/v1/proxy`,
  apiKey: 'app-sk-<YOUR_SECRET>'
});

// Chat
const completion = await client.chat.completions.create({
  model: 'deepseek-chat-v3-0324',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Image generation
const image = await client.images.generate({
  model: 'z-image',
  prompt: 'A cute baby sea otter',
  n: 1, size: '1024x1024'
});

// Speech-to-text
const transcription = await client.audio.transcriptions.create({
  file: fs.createReadStream('audio.ogg'),
  model: 'whisper-large-v3'
});
```

### CLI Usage

```bash
0g-compute-cli setup-network              # Choose network
0g-compute-cli login                       # Enter private key
0g-compute-cli deposit --amount 10         # Fund account
0g-compute-cli transfer-fund --provider <ADDR> --amount 1
0g-compute-cli inference list-providers    # List services
0g-compute-cli inference verify --provider <ADDR>  # Verify TEE
0g-compute-cli inference serve --provider <ADDR>   # Local proxy server
0g-compute-cli ui start-web                # Web UI at localhost:3090
```

### Web UI

Visit https://compute-marketplace.0g.ai/inference or run locally with `0g-compute-cli ui start-web`.

## Available Models

### Mainnet
| Model | Type | Price (per 1M tokens) |
|-------|------|----------------------|
| deepseek-chat-v3-0324 | Chatbot | 0.30 / 1.00 0G |
| gpt-oss-120b | Chatbot | 0.10 / 0.49 0G |
| qwen3-vl-30b-a3b-instruct | Chatbot | 0.49 / 0.49 0G |
| GLM-5-FP8 | Chatbot | 1.0 / 3.2 0G |
| whisper-large-v3 | Speech-to-Text | 0.05 / 0.11 0G |
| z-image | Text-to-Image | 0.003 0G/image |

### Testnet
| Model | Type | Price |
|-------|------|-------|
| qwen-2.5-7b-instruct | Chatbot | 0.05 / 0.10 0G |
| qwen-image-edit-2511 | Image-Edit | 0.005 0G/image |

## Key Details

- **Rate limits**: 30 req/min, 5 concurrent per user
- **Verification**: TEEML, OPML, ZKML supported
- **Settlement**: Delayed batch settlement (fees deducted in batches, not per-request)
- **Latency**: 50-100ms inference
- **Services**: Inference (live), Fine-tuning (live), Training (coming)

## Resources

- Starter Kit: https://github.com/0gfoundation/0g-compute-ts-starter-kit
- Web Marketplace: https://compute-marketplace.0g.ai/inference
- Full docs: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/

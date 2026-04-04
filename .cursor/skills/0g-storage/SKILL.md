---
name: 0g-storage
description: Integrate 0G decentralized storage using Go/TypeScript SDKs. Use when uploading, downloading, or managing files and key-value data on 0G Storage.
---

# 0G Storage Integration

Integrate 0G's decentralized storage — 95% cheaper than AWS S3, with 200 MBPS retrieval, erasure coding, and both immutable (Log) and mutable (KV) storage layers.

## When to Use

- Uploading/downloading files to decentralized storage
- Building apps with key-value storage
- Storing AI training data, models, or large datasets
- Integrating browser-based file uploads with MetaMask
- Running a storage node

## Quick Start

### TypeScript SDK

```bash
# Clone starter kit
git clone https://github.com/0gfoundation/0g-storage-ts-starter-kit
cd 0g-storage-ts-starter-kit && pnpm install
cp .env.example .env   # Add your PRIVATE_KEY
pnpm run upload -- ./file.txt
```

### Installation

```bash
pnpm add @0gfoundation/0g-ts-sdk ethers
```

### Setup

```typescript
import { ZgFile, Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';

// Turbo indexer (recommended):
const RPC_URL = 'https://evmrpc-testnet.0g.ai';       // or https://evmrpc.0g.ai for mainnet
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai'; // or https://indexer-storage-turbo.0g.ai for mainnet

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const indexer = new Indexer(INDEXER_RPC);
```

### File Upload

```typescript
async function uploadFile(filePath: string) {
  const file = await ZgFile.fromFilePath(filePath);
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  console.log("Root Hash:", tree?.rootHash());

  const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer);
  if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

  await file.close();
  return tx;
}
```

### In-Memory Upload

```typescript
const data = new TextEncoder().encode('Hello, 0G Storage!');
const memData = new MemData(data);
const [tree, treeErr] = await memData.merkleTree();
const [tx, err] = await indexer.upload(memData, RPC_URL, signer);
```

### File Download

```typescript
async function downloadFile(rootHash: string, outputPath: string) {
  const err = await indexer.download(rootHash, outputPath, true); // withProof=true
  if (err) throw new Error(`Download error: ${err}`);
}
```

### Key-Value Storage

```typescript
import { Batcher, KvClient } from '@0gfoundation/0g-ts-sdk';

// Upload KV data
async function uploadToKV(streamId: string, key: string, value: string) {
  const [nodes, err] = await indexer.selectNodes(1);
  if (err) throw new Error(`Error selecting nodes: ${err}`);

  const batcher = new Batcher(1, nodes, flowContract, RPC_URL);
  const keyBytes = Uint8Array.from(Buffer.from(key, 'utf-8'));
  const valueBytes = Uint8Array.from(Buffer.from(value, 'utf-8'));
  batcher.streamDataBuilder.set(streamId, keyBytes, valueBytes);

  const [tx, batchErr] = await batcher.exec();
  if (batchErr) throw new Error(`Batch execution error: ${batchErr}`);
}
```

### Browser Support

```typescript
import { Blob as ZgBlob, Indexer } from '@0gfoundation/0g-ts-sdk';
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();

const zgBlob = new ZgBlob(fileInput.files[0]);
const [tree, treeErr] = await zgBlob.merkleTree();
const indexer = new Indexer(INDEXER_RPC);
const [tx, err] = await indexer.upload(zgBlob, RPC_URL, signer);
```

> **Note:** Browser downloads need `StorageNode.downloadSegmentByTxSeq()` — see starter kit `web/src/storage.ts`. Vite/Webpack require Node.js polyfills (`vite-plugin-node-polyfills`).

### Go SDK

```bash
go get github.com/0gfoundation/0g-storage-client
```

```go
import (
    "github.com/0gfoundation/0g-storage-client/common/blockchain"
    "github.com/0gfoundation/0g-storage-client/indexer"
    "github.com/0gfoundation/0g-storage-client/transfer"
    "github.com/0gfoundation/0g-storage-client/core"
)

w3client := blockchain.MustNewWeb3(evmRpc, privateKey)
defer w3client.Close()

indexerClient, _ := indexer.NewClient(indRpc, indexer.IndexerClientOption{})

// Upload
file, _ := core.Open(filePath)
defer file.Close()

opt := transfer.UploadOption{
    ExpectedReplica: 1, TaskSize: 10, SkipTx: true,
    FinalityRequired: transfer.TransactionPacked,
    FastMode: true, Method: "min", FullTrusted: true,
}
txHashes, roots, _ := indexerClient.SplitableUpload(ctx, w3client, file, 4*1024*1024*1024, opt)

// Download
indexerClient.Download(ctx, rootHash.String(), outputPath, true)
```

## Storage Architecture

- **Log Layer** (immutable): Append-only, optimized for large files (ML datasets, archives)
- **Key-Value Layer** (mutable): Fast key-based retrieval (databases, user profiles, game state)
- **Proof of Random Access (PoRA)**: Miners prove they store data via random challenges
- **Erasure coding**: Survives 30% node failure
- **8TB mining range cap**: Ensures fair competition
- **Turbo vs Standard**: Two independent networks (faster/higher fees vs slower/lower fees)

## Contract Addresses

### Mainnet (Chain ID: 16661)
- Flow: `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526`
- Mine: `0xCd01c5Cd953971CE4C2c9bFb95610236a7F414fe`
- Reward: `0x457aC76B58ffcDc118AABD6DbC63ff9072880870`

### Testnet (Chain ID: 16602)
- Flow: `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296`
- Mine: `0x00A9E9604b0538e06b268Fb297Df333337f9593b`
- Reward: `0xA97B57b4BdFEA2D0a25e535bd849ad4e6C440A69`

## Resources

- TypeScript SDK: https://github.com/0gfoundation/0g-ts-sdk
- Go SDK: https://github.com/0gfoundation/0g-storage-client
- TS Starter Kit: https://github.com/0gfoundation/0g-storage-ts-starter-kit
- Go Starter Kit: https://github.com/0gfoundation/0g-storage-go-starter-kit
- Run a Storage Node: https://docs.0g.ai/run-a-node/storage-node
- Storage SDK docs: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk

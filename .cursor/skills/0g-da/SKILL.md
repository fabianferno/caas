---
name: 0g-da
description: Integrate 0G Data Availability layer for rollups, L2s, and high-throughput applications. Use when building with DA, running DA nodes, or integrating rollups.
---

# 0G Data Availability (DA)

Infinitely scalable DA layer — 50 Gbps throughput, VRF-based quorums, built-in storage, Ethereum-inherited security.

## When to Use

- Integrating DA for rollups (OP Stack, Arbitrum Nitro)
- Running DA client, encoder, or retriever nodes
- Building high-throughput applications needing data availability guarantees
- Using RaaS providers (Caldera) with 0G DA
- Integrating AVS (EigenLayer, Babylon) with 0G DA

## Architecture Overview

- **Max blob size**: 32,505,852 bytes
- **Processing**: Padding → 1024x1024 matrix → erasure coding to 3072x1024 → KZG commitments
- **DA nodes**: VRF-selected, organized into quorums (3072 positions each)
- **Consensus**: Sampling-based (lightweight), 2/3+ BLS signature aggregation
- **Epochs**: ~8 hours, DA Sampling every ~1.5 minutes (30 blocks)
- **Security**: Shared staking via Ethereum, slashable across networks

## DA Client Setup (Docker)

```bash
git clone https://github.com/0gfoundation/0g-da-client.git
cd 0g-da-client
docker build -t 0g-da-client -f combined.Dockerfile .
```

Create `envfile.env`:
```bash
COMBINED_SERVER_CHAIN_RPC=https://evmrpc-testnet.0g.ai
COMBINED_SERVER_PRIVATE_KEY=YOUR_PRIVATE_KEY
ENTRANCE_CONTRACT_ADDR=0x857C0A28A8634614BB2C96039Cf4a20AFF709Aa9
COMBINED_SERVER_RECEIPT_POLLING_ROUNDS=180
COMBINED_SERVER_RECEIPT_POLLING_INTERVAL=1s
COMBINED_SERVER_TX_GAS_LIMIT=2000000
COMBINED_SERVER_USE_MEMORY_DB=true
COMBINED_SERVER_KV_DB_PATH=/runtime/
COMBINED_SERVER_TimeToExpire=2592000
DISPERSER_SERVER_GRPC_PORT=51001
BATCHER_DASIGNERS_CONTRACT_ADDRESS=0x0000000000000000000000000000000000001000
BATCHER_FINALIZER_INTERVAL=20s
BATCHER_CONFIRMER_NUM=3
BATCHER_MAX_NUM_RETRIES_PER_BLOB=3
BATCHER_FINALIZED_BLOCK_COUNT=50
BATCHER_BATCH_SIZE_LIMIT=500
BATCHER_ENCODING_INTERVAL=3s
BATCHER_ENCODING_REQUEST_QUEUE_SIZE=1
BATCHER_PULL_INTERVAL=10s
BATCHER_SIGNING_INTERVAL=3s
BATCHER_SIGNED_PULL_INTERVAL=20s
BATCHER_EXPIRATION_POLL_INTERVAL=3600
BATCHER_ENCODER_ADDRESS=DA_ENCODER_SERVER
BATCHER_ENCODING_TIMEOUT=300s
BATCHER_SIGNING_TIMEOUT=60s
BATCHER_CHAIN_READ_TIMEOUT=12s
BATCHER_CHAIN_WRITE_TIMEOUT=13s
```

```bash
docker run -d --env-file envfile.env --name 0g-da-client \
  -v ./run:/runtime -p 51001:51001 0g-da-client combined
```

## DA Encoder Setup

Requires Rust + NVIDIA GPU (RTX 4090 tested).

```bash
git clone https://github.com/0gfoundation/0g-da-encoder.git
# Download params
./dev-support/download_params.sh
# Run server
cargo run -r -p server --features grpc/parallel,grpc/cuda -- --config run/config.toml
```

Serves on port 34000 via gRPC.

## DA Retriever Setup

```bash
git clone https://github.com/0gfoundation/0g-da-retriever.git
cd 0g-da-retriever
docker build -t 0g-da-retriever .
docker run -d --name 0g-da-retriever -p 34005:34005 0g-da-retriever
```

## Hardware Requirements

| Node Type | Memory | CPU | Bandwidth | Notes |
|-----------|--------|-----|-----------|-------|
| DA Client | 8 GB | 2 cores | 100 MBps | |
| DA Encoder | - | - | - | NVIDIA RTX 4090 + CUDA 12.04 |
| DA Retriever | 8 GB | 2 cores | 100 MBps | |

## Contract Addresses

### Testnet
- DAEntrance: `0xE75A073dA5bb7b0eC622170Fd268f35E675a957B`
- DASigners (precompile): `0x0000000000000000000000000000000000001000`

## Rollup Integrations

- **OP Stack on 0G DA**: https://docs.0g.ai/developer-hub/building-on-0g/rollups-and-appchains/op-stack-on-0g-da
- **Arbitrum Nitro on 0G DA**: https://docs.0g.ai/developer-hub/building-on-0g/rollups-and-appchains/arbitrum-nitro-on-0g-da
- **Caldera RaaS**: https://docs.0g.ai/developer-hub/building-on-0g/rollup-as-a-service/caldera-on-0g-da

## AVS Integrations

- **EigenLayer**: https://docs.0g.ai/developer-hub/building-on-0g/avs/eigenlayer-avs-on-0g-da
- **Babylon**: https://docs.0g.ai/developer-hub/building-on-0g/avs/babylon-avs-on-0g-da

## Submitting Data

See example: https://github.com/0gfoundation/0g-da-example-rust/blob/main/src/disperser.proto

## Fee Structure

- Users pay `BLOB_PRICE` per DA blob submission
- DA nodes rewarded via DA Sampling lottery (no direct signing rewards)
- `1/REWARD_RATIO` of reward pool per valid response

## Resources

- DA Client: https://github.com/0gfoundation/0g-da-client
- DA Encoder: https://github.com/0gfoundation/0g-da-encoder
- DA Retriever: https://github.com/0gfoundation/0g-da-retriever
- DA Example: https://github.com/0gfoundation/0g-da-example-rust
- DA Contract: https://github.com/0gfoundation/0g-da-contract
- Full docs: https://docs.0g.ai/developer-hub/building-on-0g/da-deep-dive

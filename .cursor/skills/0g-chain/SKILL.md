---
name: 0g-chain
description: Build on 0G Chain — EVM-compatible AI L1 with sub-second finality. Use when deploying contracts, configuring networks, or building dApps on 0G Chain.
---

# 0G Chain Development

Build on 0G Chain, the fastest modular AI blockchain — an EVM-compatible L1 with sub-second finality and 11,000 TPS per shard.

## When to Use

- Deploying smart contracts to 0G Chain
- Configuring Hardhat/Foundry for 0G networks
- Building dApps on 0G Chain
- Working with 0G precompiles (DASigners, Wrapped0GBase)
- Setting up wallet connections to 0G networks

## Network Configuration

### Mainnet

| Parameter | Value |
|-----------|-------|
| Network Name | 0G Mainnet |
| Chain ID | 16661 |
| Token | 0G |
| RPC URL | `https://evmrpc.0g.ai` |
| Block Explorer | `https://chainscan.0g.ai` |
| Storage Indexer | `https://indexer-storage-turbo.0g.ai` |

**Mainnet Contract Addresses:**
- Storage Flow: `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526`
- Storage Mine: `0xCd01c5Cd953971CE4C2c9bFb95610236a7F414fe`
- Storage Reward: `0x457aC76B58ffcDc118AABD6DbC63ff9072880870`

### Testnet (Galileo)

| Parameter | Value |
|-----------|-------|
| Network Name | 0G-Galileo-Testnet |
| Chain ID | 16602 |
| Token | 0G |
| RPC URL | `https://evmrpc-testnet.0g.ai` |
| Block Explorer | `https://chainscan-galileo.0g.ai` |
| Faucet | https://faucet.0g.ai |
| Faucet (Google) | https://cloud.google.com/application/web3/faucet/0g/galileo |

**Testnet Contract Addresses:**
- Storage Flow: `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296`
- Storage Mine: `0x00A9E9604b0538e06b268Fb297Df333337f9593b`
- Storage Reward: `0xA97B57b4BdFEA2D0a25e535bd849ad4e6C440A69`
- DAEntrance: `0xE75A073dA5bb7b0eC622170Fd268f35E675a957B`

### 3rd Party RPCs (Recommended for production)
- [QuickNode](https://www.quicknode.com/chains/0g)
- [ThirdWeb](https://thirdweb.com/0g-aristotle)
- [Ankr](https://www.ankr.com/rpc/0g/)

## Deploying Contracts

### Hardhat Configuration

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    "0g-testnet": {
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: [process.env.PRIVATE_KEY]
    },
    "0g-mainnet": {
      url: "https://evmrpc.0g.ai",
      chainId: 16661,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: { "0g-testnet": "placeholder", "0g-mainnet": "placeholder" },
    customChains: [
      {
        network: "0g-testnet",
        chainId: 16602,
        urls: {
          apiURL: "https://chainscan-galileo.0g.ai/open/api",
          browserURL: "https://chainscan-galileo.0g.ai",
        },
      },
      {
        network: "0g-mainnet",
        chainId: 16661,
        urls: {
          apiURL: "https://chainscan.0g.ai/open/api",
          browserURL: "https://chainscan.0g.ai",
        },
      },
    ],
  },
};
```

### Foundry Configuration

```toml
# foundry.toml
[profile.default]
evm_version = "cancun"

[rpc_endpoints]
0g_testnet = "https://evmrpc-testnet.0g.ai"
0g_mainnet = "https://evmrpc.0g.ai"
```

**Deploy with Foundry:**
```bash
forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $PRIVATE_KEY \
  --evm-version cancun \
  src/MyContract.sol:MyContract
```

**Verify with Foundry:**
```bash
forge verify-contract \
  --chain-id 16602 \
  --verifier custom \
  --verifier-api-key "PLACEHOLDER" \
  --verifier-url https://chainscan-galileo.0g.ai/open/api \
  <CONTRACT_ADDRESS> src/MyContract.sol:MyContract
```

## Precompiles

| Precompile | Address | Purpose |
|------------|---------|---------|
| DASigners | `0x...1000` | Data availability signatures |
| Wrapped0GBase | `0x...1002` | Wrapped 0G token operations |

## Architecture

- Modular design: consensus (CometBFT) separated from execution (EVM)
- 11,000 TPS per shard, sub-second finality
- EVM-compatible (Pectra & Cancun-Deneb support)
- VRF-based validator selection
- Roadmap: DAG-based consensus, shared security model

## Important Notes

- Always use `--evm-version cancun` when compiling
- 0G Chain is fully EVM-compatible — existing Solidity code works without changes
- Testnet faucet: 0.1 0G per wallet per day

## Resources

- Deployment Scripts: https://github.com/0gfoundation/0g-deployment-scripts
- Discord: https://discord.gg/0glabs
- Contracts on 0G: https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/

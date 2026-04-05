import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    "0g-testnet": {
      url: process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
      chainId: 16600,
      accounts: process.env.OG_DEPLOYER_PRIVATE_KEY
        ? [process.env.OG_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;

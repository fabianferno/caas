import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import * as path from "path";
import * as glob from "glob";

dotenv.config();

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config: hreConfig }) => {
  const projectRoot = hreConfig.paths.root;
  const files = glob.sync("**/*.sol", {
    cwd: projectRoot,
    ignore: ["node_modules/**", "cache/**", "artifacts/**"],
    absolute: true,
  });
  return files;
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
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

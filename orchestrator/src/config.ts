import "dotenv/config";

export interface OrchestratorConfig {
  // Server
  port: number;

  // Docker
  agentImageName: string;
  agentDockerfilePath: string;
  portRangeStart: number;
  portRangeEnd: number;
  dataDir: string;
  containerNetwork?: string;

  // Shared agent config (same for all containers)
  deployerPrivateKey: string;
  rpcUrl: string;
  ethRpcUrl: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  bedrockModel: string;
  shellAllowlist: string;
  heartbeatInterval: number;
}

export function loadConfig(): OrchestratorConfig {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY is required");

  return {
    port: parseInt(process.env.ORCHESTRATOR_PORT || "4000", 10),
    agentImageName: process.env.AGENT_IMAGE_NAME || "caas-agent",
    agentDockerfilePath: process.env.AGENT_DIR_PATH || "../agent",
    portRangeStart: parseInt(process.env.PORT_RANGE_START || "5000", 10),
    portRangeEnd: parseInt(process.env.PORT_RANGE_END || "5999", 10),
    dataDir: process.env.DATA_DIR || "./data",
    containerNetwork: process.env.CONTAINER_NETWORK || undefined,

    deployerPrivateKey: deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`,
    rpcUrl: process.env.RPC_URL || "https://evmrpc-testnet.0g.ai",
    ethRpcUrl: process.env.ETH_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    awsRegion: process.env.AWS_REGION || "us-east-1",
    bedrockModel: process.env.BEDROCK_MODEL || "amazon.nova-lite-v1:0",
    shellAllowlist: process.env.SHELL_ALLOWLIST || "ls,cat,echo,date,whoami",
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || "300000", 10),
  };
}

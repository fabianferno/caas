import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

export interface Config {
  agentPrivateKey: string;
  deployerPrivateKey: string;
  agentName: string;
  agentEnsName: string;
  ethRpcUrl: string;
  rpcUrl: string;
  telegramBotToken?: string;
  discordBotToken?: string;
  enableWhatsApp: boolean;
  enableWeb: boolean;
  webPort: number;
  allowedUserIds: string[];
  shellAllowlist: string[];
  mcpConfigPath: string;
  creTemplatesDir: string;
  creConfiguredDir: string;
  heartbeatInterval: number;
  // Bedrock fallback
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion: string;
  bedrockModel: string;
}

export function loadConfig(): Config {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("AGENT_PRIVATE_KEY is required");

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || key;

  const agentName = process.env.AGENT_NAME || process.env.AGENT_ENS_NAME?.split(".")[0];
  if (!agentName) throw new Error("AGENT_NAME is required");

  return {
    agentPrivateKey: key,
    deployerPrivateKey: deployerKey,
    agentName,
    agentEnsName: `${agentName}.caas.eth`,
    ethRpcUrl: process.env.ETH_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    rpcUrl: process.env.RPC_URL || "https://evmrpc-testnet.0g.ai",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || undefined,
    discordBotToken: process.env.DISCORD_BOT_TOKEN || undefined,
    enableWhatsApp: process.env.ENABLE_WHATSAPP === "true",
    enableWeb: process.env.ENABLE_WEB === "true",
    webPort: parseInt(process.env.WEB_PORT || "3001", 10),
    allowedUserIds: (process.env.ALLOWED_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    shellAllowlist: (process.env.SHELL_ALLOWLIST || "ls,cat,echo,date,whoami")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    mcpConfigPath: process.env.MCP_CONFIG_PATH || "./mcp-servers.json",
    creTemplatesDir: process.env.CRE_TEMPLATES_DIR || path.resolve(__dirname, "../../workflows/templates"),
    creConfiguredDir: process.env.CRE_CONFIGURED_DIR || path.resolve(__dirname, "../../workflows/configured"),
    heartbeatInterval: parseInt(
      process.env.HEARTBEAT_INTERVAL || "300000",
      10
    ),
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
    awsRegion: process.env.AWS_REGION || "us-east-1",
    bedrockModel: process.env.BEDROCK_MODEL || "amazon.nova-lite-v1:0",
  };
}

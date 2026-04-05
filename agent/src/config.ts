import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // DeFi
  enableDefi: boolean;
  defiTokens: { symbol: string; address: string; decimals: number; coingeckoId: string }[];
  defiRouterAddress: string;
  defiFactoryAddress: string;
  defiWethAddress: string;
  defiSlippageBps: number;
  defiMaxTradeUsd: number;
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
    enableDefi: process.env.ENABLE_DEFI === "true",
    defiTokens: process.env.DEFI_TOKENS ? JSON.parse(process.env.DEFI_TOKENS) : [
      { symbol: "WETH", address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", decimals: 18, coingeckoId: "ethereum" },
      { symbol: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6, coingeckoId: "usd-coin" },
      { symbol: "LINK", address: "0x779877A7B0D9E8603169DdbD7836e478b4624789", decimals: 18, coingeckoId: "chainlink" },
    ],
    defiRouterAddress: process.env.DEFI_ROUTER_ADDRESS || "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
    defiFactoryAddress: process.env.DEFI_FACTORY_ADDRESS || "0xF62c03E08ada871A0bEb309762E260a7a6a880E6",
    defiWethAddress: process.env.DEFI_WETH_ADDRESS || "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
    defiSlippageBps: parseInt(process.env.DEFI_SLIPPAGE_BPS || "100", 10),
    defiMaxTradeUsd: parseFloat(process.env.DEFI_MAX_TRADE_USD || "100"),
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
    awsRegion: process.env.AWS_REGION || "us-east-1",
    bedrockModel: process.env.BEDROCK_MODEL || "amazon.nova-lite-v1:0",
  };
}

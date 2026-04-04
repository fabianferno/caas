import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

export interface Config {
  agentPrivateKey: string;
  agentEnsName: string;
  rpcUrl: string;
  telegramBotToken?: string;
  discordBotToken?: string;
  enableWhatsApp: boolean;
  enableWeb: boolean;
  webPort: number;
  allowedUserIds: string[];
  shellAllowlist: string[];
  mcpConfigPath: string;
  heartbeatInterval: number;
}

export function loadConfig(): Config {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("AGENT_PRIVATE_KEY is required");

  const ensName = process.env.AGENT_ENS_NAME;
  if (!ensName) throw new Error("AGENT_ENS_NAME is required");

  return {
    agentPrivateKey: key,
    agentEnsName: ensName,
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
    heartbeatInterval: parseInt(
      process.env.HEARTBEAT_INTERVAL || "300000",
      10
    ),
  };
}

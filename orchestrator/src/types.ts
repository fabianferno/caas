// Fields provided by the user when creating an agent via POST /agents
export interface CreateAgentRequest {
  agentName: string;
  agentEnsName?: string; // defaults to ${agentName}.caas.eth
  telegramBotToken?: string;
  discordBotToken?: string;
  enableWhatsApp?: boolean;
}

export type AgentStatus = "running" | "stopped" | "error" | "creating";

// Stored record for a running/stopped agent
export interface AgentRecord {
  id: string;
  agentName: string;
  agentEnsName: string;
  status: AgentStatus;
  hostPort: number;
  createdAt: string;
  containerId: string;
  walletAddress: string; // public address of the generated keypair
  agentkitRegistered: boolean;
}

// Full env config resolved for a container (per-agent + shared)
export interface ResolvedAgentEnv {
  agentName: string;
  agentEnsName: string;
  agentPrivateKey: string;
  deployerPrivateKey: string;
  rpcUrl: string;
  ethRpcUrl: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  bedrockModel: string;
  telegramBotToken?: string;
  discordBotToken?: string;
  enableWhatsApp: boolean;
  shellAllowlist: string;
  heartbeatInterval: number;
}

export type AgentkitJobPhase =
  | "starting"
  | "nonce_lookup"
  | "awaiting_scan"
  | "verifying"
  | "complete"
  | "failed";

export interface AgentkitJob {
  phase: AgentkitJobPhase;
  url: string | null;
  nonce: string | null;
  nullifierHash: string | null;
  merkleRoot: string | null;
  txHash: string | null;
  contract: string | null;
  error: string | null;
}

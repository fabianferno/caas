export interface AppMeta {
  name: string;
  description: string;
  icon: string;
  category: string;
  url: string;
  developer: string;
  version: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  price: string;
  route: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}

export interface AgentAppConfig {
  framework: "express" | "fastify" | "next";
  apiKey: string;
  walletAddress: string;
  app: AppMeta;
  skills?: Skill[];
  openApiSpec?: string;
  defaultPrice?: string;
  caasApiUrl?: string;
  facilitatorUrl?: string;
}

export interface SkillsManifest {
  app: AppMeta;
  skills: Skill[];
  version: string;
}

export interface HandshakeResponse {
  ok: true;
  version: string;
}

export interface HealthResponse {
  uptime: number;
  lastHeartbeat: string | null;
}

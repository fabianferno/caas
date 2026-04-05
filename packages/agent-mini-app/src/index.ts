import { createExpressMiddleware, createNextMiddleware, createFastifyPlugin } from "./core/adapter";
import type { AgentAppConfig } from "./types";

export type { AgentAppConfig };
export type { Skill, AppMeta, SkillsManifest } from "./types";

export function createAgentApp(config: AgentAppConfig) {
  if (config.framework === "next") {
    return createNextMiddleware(config);
  }
  if (config.framework === "express") {
    return createExpressMiddleware(config);
  }
  if (config.framework === "fastify") {
    return createFastifyPlugin(config);
  }
  throw new Error(`[agent-mini-app] unsupported framework: ${(config as AgentAppConfig).framework}`);
}

import { createExpressMiddleware, createNextMiddleware, createFastifyPlugin } from "./core/adapter";
import type { AgentAppConfig } from "./types";

export type { AgentAppConfig };
export type { Skill, AppMeta, SkillsManifest } from "./types";

export async function createAgentApp(config: AgentAppConfig) {
  switch (config.framework) {
    case "express":
      return createExpressMiddleware(config);
    case "next":
      return createNextMiddleware(config);
    case "fastify":
      return createFastifyPlugin(config);
    default:
      throw new Error(`[agent-mini-app] unsupported framework: ${(config as AgentAppConfig).framework}`);
  }
}

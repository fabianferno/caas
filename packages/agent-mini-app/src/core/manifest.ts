import type { AgentAppConfig, Skill, SkillsManifest, HandshakeResponse, HealthResponse } from "../types";

const PACKAGE_VERSION = "0.1.0";

export function buildManifest(config: AgentAppConfig, skills: Skill[]): SkillsManifest {
  return {
    app: config.app,
    skills,
    version: config.app.version,
  };
}

export function buildHandshake(): HandshakeResponse {
  return { ok: true, version: PACKAGE_VERSION };
}

export function buildHealth(startedAt: number, lastHeartbeat: string | null): HealthResponse {
  return {
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    lastHeartbeat,
  };
}

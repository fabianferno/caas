import { describe, it, expect } from "vitest";
import { buildManifest, buildHandshake, buildHealth } from "../../src/core/manifest";
import type { AgentAppConfig } from "../../src/types";

const config: AgentAppConfig = {
  framework: "express",
  apiKey: "test-key",
  walletAddress: "0x123",
  app: {
    name: "TestApp",
    description: "A test app",
    icon: "https://example.com/icon.png",
    category: "Test",
    url: "https://example.com",
    developer: "Tester",
    version: "1.0.0",
  },
  skills: [
    {
      id: "do-thing",
      name: "Do Thing",
      description: "Does a thing",
      price: "0.01",
      route: "/api/thing",
      method: "POST",
    },
  ],
};

describe("buildManifest", () => {
  it("returns app and skills", () => {
    const m = buildManifest(config, config.skills!);
    expect(m.app.name).toBe("TestApp");
    expect(m.skills).toHaveLength(1);
    expect(m.skills[0].id).toBe("do-thing");
    expect(m.version).toBe("1.0.0");
  });
});

describe("buildHandshake", () => {
  it("returns ok and version", () => {
    const h = buildHandshake();
    expect(h.ok).toBe(true);
    expect(typeof h.version).toBe("string");
  });
});

describe("buildHealth", () => {
  it("returns uptime and lastHeartbeat", () => {
    const startedAt = Date.now() - 5000;
    const h = buildHealth(startedAt, "2026-04-05T10:00:00.000Z");
    expect(h.uptime).toBeGreaterThanOrEqual(5);
    expect(h.lastHeartbeat).toBe("2026-04-05T10:00:00.000Z");
  });

  it("returns null lastHeartbeat when never pinged", () => {
    const h = buildHealth(Date.now(), null);
    expect(h.lastHeartbeat).toBeNull();
  });
});

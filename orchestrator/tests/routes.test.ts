import express from "express";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { OrchestratorConfig } from "../src/config.js";
import { createRouter } from "../src/routes.js";
import { AgentStore } from "../src/store.js";

vi.mock("../src/docker.js", () => ({
  imageExists: vi.fn().mockResolvedValue(true),
  buildAgentImage: vi.fn().mockResolvedValue(undefined),
  createAndStartContainer: vi.fn().mockResolvedValue("fake-container-id-123"),
  stopAndRemoveContainer: vi.fn().mockResolvedValue(undefined),
  restartContainer: vi.fn().mockResolvedValue(undefined),
  getContainerStatus: vi.fn().mockResolvedValue("running"),
  getContainerLogs: vi.fn().mockResolvedValue("fake log output"),
}));

let server: http.Server;
let baseUrl: string;
let tmpDir: string;
let store: AgentStore;

const config: OrchestratorConfig = {
  port: 0,
  agentImageName: "caas-agent-test",
  agentDockerfilePath: "../agent",
  portRangeStart: 6000,
  portRangeEnd: 6999,
  dataDir: "",
  containerNetwork: undefined,
  deployerPrivateKey: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  rpcUrl: "https://evmrpc-testnet.0g.ai",
  ethRpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  awsAccessKeyId: "AKIATEST",
  awsSecretAccessKey: "testsecret",
  awsRegion: "us-east-1",
  bedrockModel: "amazon.nova-lite-v1:0",
  shellAllowlist: "ls,cat,echo,date,whoami",
  heartbeatInterval: 300000,
};

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "routes-test-"));
  const cfg = { ...config, dataDir: tmpDir };
  store = new AgentStore(tmpDir);

  const app = express();
  app.use(express.json());
  app.use(createRouter(store, cfg));

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterEach(() => {
  for (const record of store.list()) {
    store.remove(record.id);
  }
});

afterAll(() => {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function del(url: string) {
  return fetch(url, { method: "DELETE" });
}

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", agents: 0 });
  });
});

describe("POST /agents", () => {
  it("creates an agent with just agentName (private key is auto-generated)", async () => {
    const res = await post(`${baseUrl}/agents`, {
      agentName: "test-agent",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentName).toBe("test-agent");
    expect(body.agentEnsName).toBe("test-agent.caas.eth");
    expect(body.containerId).toBe("fake-container-id-123");
    expect(body.status).toBe("running");
    expect(typeof body.walletAddress).toBe("string");
    expect(body.walletAddress).toMatch(/^0x[0-9a-f]{40}$/);
    expect(typeof body.hostPort).toBe("number");
  });

  it("accepts custom agentEnsName", async () => {
    const res = await post(`${baseUrl}/agents`, {
      agentName: "custom-ens",
      agentEnsName: "mycustom.ens.eth",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentEnsName).toBe("mycustom.ens.eth");
  });

  it("accepts optional channel tokens", async () => {
    const res = await post(`${baseUrl}/agents`, {
      agentName: "channel-agent",
      telegramBotToken: "123:ABC",
      discordBotToken: "discord-token-here",
      enableWhatsApp: true,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.agentName).toBe("channel-agent");
  });

  it("returns 400 when agentName is missing", async () => {
    const res = await post(`${baseUrl}/agents`, {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/agentName/);
  });

  it("returns 409 when agent name already exists", async () => {
    await post(`${baseUrl}/agents`, { agentName: "dup" });
    const res = await post(`${baseUrl}/agents`, { agentName: "dup" });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/);
  });
});

describe("GET /agents", () => {
  it("returns all agents", async () => {
    await post(`${baseUrl}/agents`, { agentName: "a1" });
    await post(`${baseUrl}/agents`, { agentName: "a2" });
    const res = await fetch(`${baseUrl}/agents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    const names = body.map((a: { agentName: string }) => a.agentName).sort();
    expect(names).toEqual(["a1", "a2"]);
  });

  it("returns empty array when none exist", async () => {
    const res = await fetch(`${baseUrl}/agents`);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("GET /agents/:id", () => {
  it("returns agent by name", async () => {
    await post(`${baseUrl}/agents`, { agentName: "lookup-me" });
    const res = await fetch(`${baseUrl}/agents/lookup-me`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agentName).toBe("lookup-me");
  });

  it("returns 404 for unknown", async () => {
    const res = await fetch(`${baseUrl}/agents/nonexistent`);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /agents/:id", () => {
  it("removes agent and returns 204", async () => {
    await post(`${baseUrl}/agents`, { agentName: "del-me" });
    const res = await del(`${baseUrl}/agents/del-me`);
    expect(res.status).toBe(204);
    const check = await fetch(`${baseUrl}/agents/del-me`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown", async () => {
    const res = await del(`${baseUrl}/agents/ghost`);
    expect(res.status).toBe(404);
  });
});

describe("POST /agents/:id/restart", () => {
  it("restarts agent and returns 200", async () => {
    await post(`${baseUrl}/agents`, { agentName: "restart-me" });
    const res = await post(`${baseUrl}/agents/restart-me/restart`, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("running");
  });

  it("returns 404 for unknown", async () => {
    const res = await post(`${baseUrl}/agents/ghost/restart`, {});
    expect(res.status).toBe(404);
  });
});

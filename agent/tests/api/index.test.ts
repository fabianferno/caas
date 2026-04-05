import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import express from "express";
import { AgentAPI } from "../../src/api/index.js";

const makeSkillsManagerStub = (skills: any[] = []) => ({
  getAll: () => skills,
});

const makeMCPBridgeStub = (overrides: any = {}) => ({
  addServer: overrides.addServer ?? (async () => []),
  removeServer: overrides.removeServer ?? (async () => []),
});

const makeRegistryStub = () => ({
  register: () => {},
  unregister: () => {},
});

async function startServer(app: express.Application): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, port });
    });
  });
}

async function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe("AgentAPI", () => {
  let tmpDir: string;
  let configPath: string;
  let skillsDir: string;
  let app: express.Application;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-api-"));
    configPath = path.join(tmpDir, "mcp-servers.json");
    skillsDir = path.join(tmpDir, "skills");
    fs.mkdirSync(skillsDir);
    fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));

    app = express();
    app.use(express.json());

    new AgentAPI({
      app,
      skillsManager: makeSkillsManagerStub() as any,
      skillsDir,
      mcpBridge: makeMCPBridgeStub() as any,
      configPath,
      registry: makeRegistryStub() as any,
      processMessage: async (msg: any) => ({ text: `echo: ${msg.text}` }),
    });

    ({ server, port } = await startServer(app));
  });

  afterEach(async () => {
    await stopServer(server);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const url = (p: string) => `http://localhost:${port}${p}`;

  describe("POST /chat", () => {
    it("returns agent response", async () => {
      const res = await fetch(url("/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: "c1", userId: "u1", text: "hello" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.text).toBe("echo: hello");
    });

    it("returns 400 when fields missing", async () => {
      const res = await fetch(url("/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /skills", () => {
    it("returns skills list", async () => {
      const localApp = express();
      localApp.use(express.json());
      new AgentAPI({
        app: localApp,
        skillsManager: makeSkillsManagerStub([
          { name: "greet", description: "Greet user", triggers: ["hi"] },
        ]) as any,
        skillsDir,
        mcpBridge: makeMCPBridgeStub() as any,
        configPath,
        registry: makeRegistryStub() as any,
        processMessage: async () => ({ text: "" }),
      });
      const { server: s2, port: p2 } = await startServer(localApp);
      const res = await fetch(`http://localhost:${p2}/skills`);
      const body = await res.json();
      await stopServer(s2);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("greet");
    });
  });

  describe("POST /skills", () => {
    it("writes skill file", async () => {
      const res = await fetch(url("/skills"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "my-skill",
          description: "Does things",
          triggers: ["do it"],
          content: "Do the thing.",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, "my-skill.md"))).toBe(true);
    });

    it("returns 400 for invalid skill name", async () => {
      const res = await fetch(url("/skills"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "bad name!",
          description: "x",
          triggers: ["x"],
          content: "x",
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /skills/:name", () => {
    it("deletes skill file", async () => {
      const filePath = path.join(skillsDir, "old.md");
      fs.writeFileSync(filePath, "content");
      const res = await fetch(url("/skills/old"), { method: "DELETE" });
      expect(res.status).toBe(200);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("returns 404 for missing skill", async () => {
      const res = await fetch(url("/skills/nope"), { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /mcp", () => {
    it("returns servers from config", async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "srv", transport: "stdio" }] })
      );
      const res = await fetch(url("/mcp"));
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("srv");
    });
  });

  describe("POST /mcp", () => {
    it("returns 400 when name missing", async () => {
      const res = await fetch(url("/mcp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport: "stdio" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns ok and toolsAdded on success", async () => {
      const localApp = express();
      localApp.use(express.json());
      new AgentAPI({
        app: localApp,
        skillsManager: makeSkillsManagerStub() as any,
        skillsDir,
        mcpBridge: makeMCPBridgeStub({
          addServer: async () => [
            { name: "mcp_s_t", description: "d", parameters: {}, handler: async () => "" }
          ],
        }) as any,
        configPath,
        registry: makeRegistryStub() as any,
        processMessage: async () => ({ text: "" }),
      });
      const { server: s2, port: p2 } = await startServer(localApp);
      const res = await fetch(`http://localhost:${p2}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "s", transport: "stdio", command: "echo" }),
      });
      const body = await res.json();
      await stopServer(s2);
      expect(body.ok).toBe(true);
      expect(body.toolsAdded).toContain("mcp_s_t");
    });
  });

  describe("DELETE /mcp/:name", () => {
    it("removes server and returns toolsRemoved", async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "s", transport: "stdio" }] })
      );
      const localApp = express();
      localApp.use(express.json());
      new AgentAPI({
        app: localApp,
        skillsManager: makeSkillsManagerStub() as any,
        skillsDir,
        mcpBridge: makeMCPBridgeStub({ removeServer: async () => ["mcp_s_tool"] }) as any,
        configPath,
        registry: makeRegistryStub() as any,
        processMessage: async () => ({ text: "" }),
      });
      const { server: s2, port: p2 } = await startServer(localApp);
      const res = await fetch(`http://localhost:${p2}/mcp/s`, { method: "DELETE" });
      const body = await res.json();
      await stopServer(s2);
      expect(body.ok).toBe(true);
      expect(body.toolsRemoved).toContain("mcp_s_tool");
    });
  });
});

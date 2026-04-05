import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MCPManagerTool } from "../../src/tools/mcp-manager.js";
import { ToolRegistry } from "../../src/core/tools.js";

// Minimal MCPBridge stub
const makeBridgeStub = (overrides: Partial<{ addServer: any; removeServer: any }> = {}) => ({
  addServer: overrides.addServer ?? (async () => []),
  removeServer: overrides.removeServer ?? (async () => []),
});

describe("MCPManagerTool", () => {
  let tmpDir: string;
  let configPath: string;
  let registry: ToolRegistry;
  const OWNER_ID = "owner-xyz";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-mgr-"));
    configPath = path.join(tmpDir, "mcp-servers.json");
    fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));
    registry = new ToolRegistry();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const buildTool = (bridgeOverrides = {}) => {
    const bridge = makeBridgeStub(bridgeOverrides) as any;
    return new MCPManagerTool(bridge, registry, configPath, [OWNER_ID]);
  };

  const getHandler = (tool: MCPManagerTool, name: string) =>
    tool.registerTools().find((t) => t.name === name)!.handler;

  describe("mcp_list_servers", () => {
    it("returns empty array when no servers configured", async () => {
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_list_servers")({});
      expect(JSON.parse(result as string)).toEqual([]);
    });

    it("returns servers from config file", async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "my-server", transport: "stdio", command: "node" }] })
      );
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_list_servers")({});
      const servers = JSON.parse(result as string);
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("my-server");
    });
  });

  describe("mcp_add_server", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_add_server")({
        name: "s", transport: "stdio", command: "echo"
      });
      expect(result).toContain("Error:");
    });

    it("persists server to config on success", async () => {
      registry.setContext({ userId: OWNER_ID });
      const tool = buildTool({
        addServer: async () => [
          { name: "mcp_s_tool", description: "d", parameters: {}, handler: async () => "" }
        ],
      });
      await getHandler(tool, "mcp_add_server")({ name: "s", transport: "stdio", command: "echo" });
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].name).toBe("s");
    });

    it("registers returned tools on ToolRegistry", async () => {
      registry.setContext({ userId: OWNER_ID });
      const tool = buildTool({
        addServer: async () => [
          { name: "mcp_s_mytool", description: "d", parameters: {}, handler: async () => "ok" }
        ],
      });
      await getHandler(tool, "mcp_add_server")({ name: "s", transport: "stdio", command: "echo" });
      expect(registry.has("mcp_s_mytool")).toBe(true);
    });

    it("returns error string when bridge throws, does not persist", async () => {
      registry.setContext({ userId: OWNER_ID });
      const tool = buildTool({
        addServer: async () => { throw new Error("connect failed"); },
      });
      const result = await getHandler(tool, "mcp_add_server")({
        name: "s", transport: "stdio", command: "bad"
      });
      expect(result).toContain("connect failed");
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.servers).toHaveLength(0);
    });
  });

  describe("mcp_remove_server", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const tool = buildTool();
      const result = await getHandler(tool, "mcp_remove_server")({ name: "s" });
      expect(result).toContain("Error:");
    });

    it("unregisters tools and removes from config", async () => {
      registry.setContext({ userId: OWNER_ID });
      fs.writeFileSync(
        configPath,
        JSON.stringify({ servers: [{ name: "s", transport: "stdio", command: "node" }] })
      );
      registry.register({ name: "mcp_s_tool", description: "d", parameters: {}, handler: async () => "" });
      const tool = buildTool({
        removeServer: async () => ["mcp_s_tool"],
      });
      await getHandler(tool, "mcp_remove_server")({ name: "s" });
      expect(registry.has("mcp_s_tool")).toBe(false);
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.servers).toHaveLength(0);
    });
  });
});

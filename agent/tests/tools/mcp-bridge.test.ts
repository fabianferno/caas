import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MCPBridge } from "../../src/tools/mcp-bridge.js";

describe("MCPBridge", () => {
  let configPath: string;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-bridge-"));
    configPath = path.join(tmpDir, "mcp-servers.json");
    fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("initializes with empty config without error", async () => {
    const bridge = new MCPBridge(configPath);
    const tools = await bridge.initialize();
    expect(tools).toEqual([]);
  });

  it("initializes gracefully when config file missing", async () => {
    const bridge = new MCPBridge(path.join(tmpDir, "missing.json"));
    const tools = await bridge.initialize();
    expect(tools).toEqual([]);
  });

  it("removeServer throws when server not found", async () => {
    const bridge = new MCPBridge(configPath);
    await bridge.initialize();
    await expect(bridge.removeServer("nonexistent")).rejects.toThrow(
      'MCP server "nonexistent" not found'
    );
  });

  it("addServer throws when server already connected", async () => {
    const bridge = new MCPBridge(configPath);
    await bridge.initialize();
    // Force-add a fake client entry to simulate an already-connected server
    (bridge as any).clients.set("fake", {});
    await expect(
      bridge.addServer({ name: "fake", transport: "stdio", command: "echo" })
    ).rejects.toThrow('"fake" is already connected');
  });
});

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import type { RegisteredTool } from "../core/tools.js";

interface MCPServerConfig {
  name: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
}

interface MCPConfig {
  servers: MCPServerConfig[];
}

export class MCPBridge {
  private clients = new Map<string, Client>();
  private serverTools = new Map<string, string[]>();
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async initialize(): Promise<RegisteredTool[]> {
    let config: MCPConfig;
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      console.log("[mcp] No MCP config found or invalid JSON");
      return [];
    }
    if (!config.servers || config.servers.length === 0) return [];

    const allTools: RegisteredTool[] = [];
    for (const serverConfig of config.servers) {
      try {
        const tools = await this.connectServer(serverConfig);
        this.serverTools.set(serverConfig.name, tools.map((t) => t.name));
        allTools.push(...tools);
        console.log(`[mcp] Connected to ${serverConfig.name}: ${tools.length} tools`);
      } catch (err) {
        console.error(`[mcp] Failed to connect to ${serverConfig.name}:`, err);
      }
    }
    return allTools;
  }

  async addServer(config: MCPServerConfig): Promise<RegisteredTool[]> {
    if (this.clients.has(config.name)) {
      throw new Error(`MCP server "${config.name}" is already connected.`);
    }
    const tools = await this.connectServer(config);
    this.serverTools.set(config.name, tools.map((t) => t.name));
    console.log(`[mcp] Connected to ${config.name}: ${tools.length} tools`);
    return tools;
  }

  async removeServer(name: string): Promise<string[]> {
    const client = this.clients.get(name);
    if (!client) throw new Error(`MCP server "${name}" not found.`);
    try { await client.close(); } catch { console.warn(`[mcp] Error closing ${name}`); }
    this.clients.delete(name);
    const toolNames = this.serverTools.get(name) ?? [];
    this.serverTools.delete(name);
    return toolNames;
  }

  private async connectServer(config: MCPServerConfig): Promise<RegisteredTool[]> {
    const client = new Client({ name: "gravity-claw", version: "0.1.0" });

    if (config.transport === "stdio" && config.command) {
      const transport = new StdioClientTransport({ command: config.command, args: config.args || [] });
      await client.connect(transport);
    } else if (config.transport === "streamable-http" && config.url) {
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const transport = new StreamableHTTPClientTransport(new URL(config.url));
      await client.connect(transport);
    } else {
      throw new Error(`Invalid MCP server config: ${config.name}`);
    }

    this.clients.set(config.name, client);
    const { tools } = await client.listTools();

    return tools.map((tool) => ({
      name: `mcp_${config.name}_${tool.name}`,
      description: `[MCP:${config.name}] ${tool.description || tool.name}`,
      parameters: (tool.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
      handler: async (args: unknown): Promise<string> => {
        const result = await client.callTool({
          name: tool.name,
          arguments: args as Record<string, unknown>,
        });
        if (result.content && Array.isArray(result.content)) {
          return result.content
            .map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
            .join("\n");
        }
        return JSON.stringify(result);
      },
    }));
  }

  async shutdown(): Promise<void> {
    for (const [name, client] of this.clients) {
      try { await client.close(); } catch { console.warn(`[mcp] Error closing ${name}`); }
    }
    this.clients.clear();
    this.serverTools.clear();
  }
}

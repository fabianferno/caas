import fs from "node:fs";
import type { RegisteredTool, ToolRegistry } from "../core/tools.js";
import type { MCPBridge } from "./mcp-bridge.js";

interface MCPServerConfig {
  name: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
}

export class MCPManagerTool {
  private mcpBridge: MCPBridge;
  private registry: ToolRegistry;
  private configPath: string;
  private allowedUserIds: Set<string>;

  constructor(
    mcpBridge: MCPBridge,
    registry: ToolRegistry,
    configPath: string,
    allowedUserIds: string[]
  ) {
    this.mcpBridge = mcpBridge;
    this.registry = registry;
    this.configPath = configPath;
    this.allowedUserIds = new Set(allowedUserIds);
  }

  private isOwner(): boolean {
    const userId = this.registry.getContext().userId as string | undefined;
    if (!userId || this.allowedUserIds.size === 0) return false;
    return this.allowedUserIds.has(userId);
  }

  private readConfig(): { servers: MCPServerConfig[] } {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
    } catch {
      return { servers: [] };
    }
  }

  private writeConfig(config: { servers: MCPServerConfig[] }): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "mcp_add_server",
        description: "Add and connect a new MCP server at runtime. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Unique server name" },
            transport: {
              type: "string",
              enum: ["stdio", "streamable-http"],
              description: "Connection type",
            },
            command: { type: "string", description: "Command to run (stdio only)" },
            args: { type: "array", items: { type: "string" }, description: "Command args (stdio only)" },
            url: { type: "string", description: "Server URL (streamable-http only)" },
          },
          required: ["name", "transport"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage MCP servers.";
          const serverConfig: MCPServerConfig = {
            name: args.name,
            transport: args.transport,
            ...(args.command && { command: args.command }),
            ...(args.args && { args: args.args }),
            ...(args.url && { url: args.url }),
          };
          let tools: RegisteredTool[];
          try {
            tools = await this.mcpBridge.addServer(serverConfig);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
          for (const tool of tools) this.registry.register(tool);
          const config = this.readConfig();
          config.servers.push(serverConfig);
          this.writeConfig(config);
          return `MCP server "${args.name}" connected with ${tools.length} tools: ${tools.map((t) => t.name).join(", ") || "none"}`;
        },
      },
      {
        name: "mcp_remove_server",
        description: "Disconnect and remove an MCP server. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Server name to remove" },
          },
          required: ["name"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage MCP servers.";
          let toolNames: string[];
          try {
            toolNames = await this.mcpBridge.removeServer(args.name);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
          for (const name of toolNames) this.registry.unregister(name);
          const config = this.readConfig();
          config.servers = config.servers.filter((s) => s.name !== args.name);
          this.writeConfig(config);
          return `MCP server "${args.name}" removed. Unregistered tools: ${toolNames.join(", ") || "none"}`;
        },
      },
      {
        name: "mcp_list_servers",
        description: "List all configured MCP servers.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          const config = this.readConfig();
          return JSON.stringify(config.servers, null, 2);
        },
      },
    ];
  }
}

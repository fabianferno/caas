import fs from "node:fs";
import path from "node:path";
import type express from "express";
import type { SkillsManager } from "../tools/skills.js";
import type { MCPBridge } from "../tools/mcp-bridge.js";
import type { ToolRegistry } from "../core/tools.js";
import type { IncomingMessage } from "../channels/types.js";
import type { AgentResponse } from "../core/types.js";

export type ProcessMessageFn = (msg: IncomingMessage) => Promise<AgentResponse>;

interface AgentAPIOptions {
  app: express.Application;
  skillsManager: SkillsManager;
  skillsDir: string;
  mcpBridge: MCPBridge;
  configPath: string;
  registry: ToolRegistry;
  processMessage: ProcessMessageFn;
}

export class AgentAPI {
  private skillsManager: SkillsManager;
  private skillsDir: string;
  private mcpBridge: MCPBridge;
  private configPath: string;
  private registry: ToolRegistry;
  private processMessage: ProcessMessageFn;

  constructor(opts: AgentAPIOptions) {
    this.skillsManager = opts.skillsManager;
    this.skillsDir = opts.skillsDir;
    this.mcpBridge = opts.mcpBridge;
    this.configPath = opts.configPath;
    this.registry = opts.registry;
    this.processMessage = opts.processMessage;
    this.mountRoutes(opts.app);
  }

  private readMCPConfig(): { servers: unknown[] } {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
    } catch {
      return { servers: [] };
    }
  }

  private writeMCPConfig(config: { servers: unknown[] }): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  private mountRoutes(app: express.Application): void {
    // POST /chat
    app.post("/chat", async (req, res) => {
      const { conversationId, userId, text } = req.body ?? {};
      if (!conversationId || !userId || !text) {
        res.status(400).json({ error: "conversationId, userId, and text are required" });
        return;
      }
      try {
        const response = await this.processMessage({
          channelName: "http",
          conversationId,
          userId,
          text,
        });
        res.json({ text: response.text });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // GET /skills
    app.get("/skills", (_req, res) => {
      const skills = this.skillsManager.getAll().map((s) => ({
        name: s.name,
        description: s.description,
        triggers: s.triggers,
      }));
      res.json(skills);
    });

    // POST /skills
    app.post("/skills", (req, res) => {
      const { name, description, triggers, content } = req.body ?? {};
      if (!name || !description || !triggers || !content) {
        res.status(400).json({ error: "name, description, triggers, and content are required" });
        return;
      }
      if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        res.status(400).json({ error: "Skill name must be alphanumeric with hyphens only" });
        return;
      }
      const triggerLines = (triggers as string[]).map((t: string) => `  - "${t.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/"/g, '\\"')}"`).join("\n");
      const escapedDesc = description.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/"/g, '\\"');
      const md = `---\nname: ${name}\ndescription: "${escapedDesc}"\ntriggers:\n${triggerLines}\n---\n${content}`;
      fs.writeFileSync(path.join(this.skillsDir, `${name}.md`), md, "utf-8");
      res.json({ ok: true });
    });

    // DELETE /skills/:name
    app.delete("/skills/:name", (req, res) => {
      const skillName = req.params.name;
      if (!/^[a-zA-Z0-9-]+$/.test(skillName)) {
        res.status(400).json({ error: "Skill name must be alphanumeric with hyphens only" });
        return;
      }
      const filePath = path.join(this.skillsDir, `${skillName}.md`);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: `Skill "${skillName}" not found` });
        return;
      }
      fs.unlinkSync(filePath);
      res.json({ ok: true });
    });

    // GET /mcp
    app.get("/mcp", (_req, res) => {
      const config = this.readMCPConfig();
      res.json(config.servers);
    });

    // POST /mcp
    app.post("/mcp", async (req, res) => {
      const { name, transport, command, args, url } = req.body ?? {};
      if (!name || !transport) {
        res.status(400).json({ error: "name and transport are required" });
        return;
      }
      try {
        const tools = await this.mcpBridge.addServer({ name, transport, command, args, url });
        for (const tool of tools) this.registry.register(tool);
        const config = this.readMCPConfig();
        config.servers.push({ name, transport, command, args, url });
        this.writeMCPConfig(config);
        res.json({ ok: true, toolsAdded: tools.map((t: any) => t.name) });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // DELETE /mcp/:name
    app.delete("/mcp/:name", async (req, res) => {
      try {
        const toolNames = await this.mcpBridge.removeServer(req.params.name);
        for (const toolName of toolNames) this.registry.unregister(toolName);
        const config = this.readMCPConfig();
        config.servers = (config.servers as any[]).filter((s: any) => s.name !== req.params.name);
        this.writeMCPConfig(config);
        res.json({ ok: true, toolsRemoved: toolNames });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });
  }
}

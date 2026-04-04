import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Router } from "express";
import type { RegisteredTool } from "../core/tools.js";

export interface WebhookRoute {
  id: string;
  path: string;
  eventName: string;
  createdAt: string;
}

export class WebhookManager {
  private routes = new Map<string, WebhookRoute>();
  private dataDir: string;
  private onTrigger: (eventName: string, payload: unknown) => void;

  constructor(dataDir: string, onTrigger: (eventName: string, payload: unknown) => void) {
    this.dataDir = dataDir;
    this.onTrigger = onTrigger;
    this.loadFromDisk();
  }

  private get filePath(): string { return path.join(this.dataDir, "webhooks.json"); }

  private loadFromDisk(): void {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const routes: WebhookRoute[] = JSON.parse(data);
      for (const route of routes) this.routes.set(route.id, route);
    } catch {}
  }

  private saveToDisk(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.routes.values()), null, 2), "utf-8");
  }

  mountRoutes(router: Router): void {
    router.post("/webhook/:id", (req, res) => {
      const route = Array.from(this.routes.values()).find((r) => r.path === req.params.id);
      if (!route) { res.status(404).json({ error: "Webhook not found" }); return; }
      this.onTrigger(route.eventName, req.body);
      res.json({ ok: true });
    });
  }

  create(webhookPath: string, eventName: string): string {
    const id = crypto.randomUUID().slice(0, 8);
    const route: WebhookRoute = { id, path: webhookPath, eventName, createdAt: new Date().toISOString() };
    this.routes.set(id, route);
    this.saveToDisk();
    return id;
  }

  list(): WebhookRoute[] { return Array.from(this.routes.values()); }

  remove(id: string): void { this.routes.delete(id); this.saveToDisk(); }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "webhook-create",
        description: "Create a webhook endpoint that triggers the agent.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Webhook path identifier" },
            eventName: { type: "string", description: "Event name sent to agent when triggered" },
          },
          required: ["path", "eventName"],
        },
        handler: async (args: any) => {
          const id = this.create(args.path, args.eventName);
          return `Created webhook ${id}: POST /webhook/${args.path} -> "${args.eventName}"`;
        },
      },
      {
        name: "webhook-list",
        description: "List all webhook endpoints.",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          const routes = this.list();
          if (routes.length === 0) return "No webhooks configured.";
          return routes.map((r) => `- ${r.id}: /webhook/${r.path} -> "${r.eventName}"`).join("\n");
        },
      },
    ];
  }
}

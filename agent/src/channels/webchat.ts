import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import http from "node:http";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

import type { Router } from "express";

export interface WebChatChannelOptions {
  port: number;
  routers?: Router[];
}

interface WSMessage {
  type: "message" | "typing" | "file";
  conversationId: string;
  content: string;
  token: string;
}

export class WebChatChannel implements Channel {
  name = "webchat";
  private port: number;
  private app: express.Application;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private handler: MessageHandler | null = null;
  private connections = new Map<string, WebSocket>();
  private routers: Router[];

  constructor(opts: WebChatChannelOptions) {
    this.port = opts.port;
    this.routers = opts.routers || [];
    this.app = express();
    this.app.use(express.json());
    this.app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
    for (const router of this.routers) this.app.use(router);
  }

  getApp(): express.Application {
    return this.app;
  }

  async start(): Promise<void> {
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws) => {
      let conversationId: string | null = null;

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(String(raw)) as WSMessage;
          conversationId = data.conversationId;
          this.connections.set(conversationId, ws);

          if (data.type === "message" && this.handler) {
            const msg: IncomingMessage = {
              channelName: "webchat",
              conversationId: data.conversationId,
              userId: data.token,
              text: data.content,
            };
            this.handler(msg);
          }
        } catch {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        if (conversationId) this.connections.delete(conversationId);
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(this.port, () => {
        console.log(`[webchat] Server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.wss?.close();
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    const ws = this.connections.get(conversationId);
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({
      type: "message",
      conversationId,
      content: response.text,
    }));
  }

  getServer(): http.Server | null {
    return this.server;
  }
}

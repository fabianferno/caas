import { Bot } from "grammy";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface TelegramChannelOptions {
  token: string;
  allowedUserIds: string[];
}

export class TelegramChannel implements Channel {
  name = "telegram";
  private bot: Bot;
  private allowedUserIds: Set<string>;
  private handler: MessageHandler | null = null;

  constructor(opts: TelegramChannelOptions) {
    this.bot = new Bot(opts.token);
    this.allowedUserIds = new Set(opts.allowedUserIds);

    this.bot.on("message:text", (ctx) => {
      const userId = String(ctx.from?.id);
      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        return;
      }
      if (this.handler) {
        const msg: IncomingMessage = {
          channelName: "telegram",
          conversationId: String(ctx.chat.id),
          userId,
          text: ctx.message.text,
        };
        this.handler(msg);
      }
    });
  }

  async start(): Promise<void> {
    this.bot.start();
    console.log("[telegram] Bot started (long polling)");
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    const text = response.text;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 4096) {
      chunks.push(text.slice(i, i + 4096));
    }
    for (const chunk of chunks) {
      await this.bot.api.sendMessage(Number(conversationId), chunk);
    }
  }
}

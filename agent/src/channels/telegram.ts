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
  // Track message IDs per chat for deletion
  private messageIds = new Map<string, number[]>();

  constructor(opts: TelegramChannelOptions) {
    this.bot = new Bot(opts.token);
    this.allowedUserIds = new Set(opts.allowedUserIds);

    this.bot.on("message:text", (ctx) => {
      const userId = String(ctx.from?.id);
      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        return;
      }

      const chatId = String(ctx.chat.id);
      this.trackMessage(chatId, ctx.message.message_id);

      if (this.handler) {
        const msg: IncomingMessage = {
          channelName: "telegram",
          conversationId: chatId,
          userId,
          text: ctx.message.text,
        };
        this.handler(msg);
      }
    });
  }

  private trackMessage(chatId: string, messageId: number): void {
    let ids = this.messageIds.get(chatId);
    if (!ids) {
      ids = [];
      this.messageIds.set(chatId, ids);
    }
    ids.push(messageId);
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
      const sent = await this.bot.api.sendMessage(Number(conversationId), chunk);
      this.trackMessage(conversationId, sent.message_id);
    }
  }

  async clearChat(conversationId: string): Promise<number> {
    const ids = this.messageIds.get(conversationId);
    if (!ids || ids.length === 0) return 0;

    let deleted = 0;
    const chatId = Number(conversationId);

    for (const msgId of ids) {
      try {
        await this.bot.api.deleteMessage(chatId, msgId);
        deleted++;
      } catch {
        // Message may already be deleted or too old (Telegram 48h limit)
      }
    }

    this.messageIds.set(conversationId, []);
    return deleted;
  }
}

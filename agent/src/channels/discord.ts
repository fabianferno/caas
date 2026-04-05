import {
  Client,
  GatewayIntentBits,
  Events,
  type Message as DiscordMessage,
} from "discord.js";
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface DiscordChannelOptions {
  token: string;
  allowedUserIds: string[];
}

export class DiscordChannel implements Channel {
  name = "discord";
  private client: Client;
  private token: string;
  private allowedUserIds: Set<string>;
  private handler: MessageHandler | null = null;

  constructor(opts: DiscordChannelOptions) {
    this.token = opts.token;
    this.allowedUserIds = new Set(opts.allowedUserIds);
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.client.on(Events.MessageCreate, (message: DiscordMessage) => {
      if (message.author.bot) return;
      const userId = message.author.id;
      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        return;
      }
      const isMentioned = message.mentions.has(this.client.user!);
      const isDM = !message.guild;
      if (!isDM && !isMentioned) return;

      if (this.handler) {
        const text = message.content.replace(/<@!?\d+>/g, "").trim();
        const msg: IncomingMessage = {
          channelName: "discord",
          conversationId: message.channel.id,
          userId,
          text,
        };
        this.handler(msg);
      }
    });
  }

  async start(): Promise<void> {
    await this.client.login(this.token);
    console.log(`[discord] Bot logged in as ${this.client.user?.tag}`);
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    const channel = await this.client.channels.fetch(conversationId);
    if (!channel || !("send" in channel)) return;
    const text = response.text;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 2000) {
      chunks.push(text.slice(i, i + 2000));
    }
    for (const chunk of chunks) {
      await (channel as any).send(chunk);
    }
  }
}

import type { AgentResponse, MediaAttachment } from "../core/types.js";

export interface IncomingMessage {
  channelName: string;
  conversationId: string;
  userId: string;
  text: string;
  media?: MediaAttachment[];
}

export type MessageHandler = (msg: IncomingMessage) => void;

export interface Channel {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: MessageHandler): void;
  send(conversationId: string, response: AgentResponse): Promise<void>;
  clearChat?(conversationId: string): Promise<number>;
}

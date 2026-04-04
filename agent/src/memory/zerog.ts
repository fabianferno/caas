import { ethers } from "ethers";
import type { StoredConversation, ChatMessage } from "../core/types.js";

export interface ZeroGStorageConfig {
  privateKey: string;
  rpcUrl: string;
  maxConversations: number;
}

export class ZeroGMemory {
  private config: ZeroGStorageConfig;
  private conversations = new Map<string, StoredConversation>();
  private indexerClient: unknown = null;
  private signer: ethers.Wallet;

  constructor(config: ZeroGStorageConfig) {
    this.config = config;
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, provider);
  }

  async initialize(): Promise<void> {
    try {
      const sdk = await import("@0gfoundation/0g-ts-sdk");
      if (sdk.Indexer) {
        this.indexerClient = new sdk.Indexer("https://indexer-storage-standard.0g.ai");
      }
      console.log("[0g-storage] Indexer connected");
    } catch (err) {
      console.warn("[0g-storage] SDK not available, using local fallback");
    }
  }

  getConversation(id: string): StoredConversation | undefined {
    return this.conversations.get(id);
  }

  getOrCreateConversation(id: string, channelName: string, userId: string): StoredConversation {
    let conv = this.conversations.get(id);
    if (!conv) {
      conv = {
        id,
        channelName,
        userId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.conversations.set(id, conv);
    }
    return conv;
  }

  addMessage(conversationId: string, message: ChatMessage): void {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();
    if (conv.messages.length > 100) {
      conv.messages = conv.messages.slice(-80);
    }
  }

  getHistory(conversationId: string, limit = 50): ChatMessage[] {
    const conv = this.conversations.get(conversationId);
    if (!conv) return [];
    return conv.messages.slice(-limit);
  }

  async persist(conversationId: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !this.indexerClient) return;
    try {
      const data = JSON.stringify(conv);
      console.log(`[0g-storage] Would persist conversation ${conversationId} (${data.length} bytes)`);
    } catch (err) {
      console.error("[0g-storage] Persist error:", err);
    }
  }

  clearHistory(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.messages = [];
      conv.updatedAt = new Date().toISOString();
    }
  }

  async loadFromStorage(): Promise<void> {
    console.log("[0g-storage] Loading conversation history...");
  }
}

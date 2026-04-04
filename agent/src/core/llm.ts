import { ethers } from "ethers";
import type { ChatMessage, LLMResponse, ToolCall } from "./types.js";
import type { OpenAITool } from "./tools.js";

export interface LLMProvider {
  chat(messages: ChatMessage[], tools?: OpenAITool[]): Promise<LLMResponse>;
}

export interface ZeroGConfig {
  privateKey: string;
  rpcUrl: string;
}

interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export class ZeroGLLMProvider implements LLMProvider {
  private config: ZeroGConfig;
  private broker: unknown = null;
  private providerAddress: string | null = null;
  private serviceEndpoint: string | null = null;
  private model: string | null = null;

  constructor(config: ZeroGConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { createZGComputeNetworkBroker } = await import("@0glabs/0g-serving-broker");
    const wallet = new ethers.Wallet(this.config.privateKey);
    this.broker = await createZGComputeNetworkBroker(wallet as any);

    const services = await (this.broker as any).inference.listService();
    const chatService = services.find(
      (s: any) => s.serviceType === "chat" || s.model?.includes("chat")
    );
    if (!chatService) {
      const svc = services[0];
      if (!svc) throw new Error("No 0G Compute services available");
      this.providerAddress = svc.provider;
      this.serviceEndpoint = svc.url;
      this.model = svc.model;
    } else {
      this.providerAddress = chatService.provider;
      this.serviceEndpoint = chatService.url;
      this.model = chatService.model;
    }

    try {
      await (this.broker as any).inference.addAccount(this.providerAddress, 0.001);
    } catch {
      // Account may already exist
    }
  }

  formatMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages.map((m) => {
      const msg: OpenAIMessage = { role: m.role, content: m.content };
      if (m.toolCallId) msg.tool_call_id = m.toolCallId;
      if (m.toolCalls) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));
      }
      return msg;
    });
  }

  formatTools(tools: OpenAITool[]): OpenAITool[] {
    return tools;
  }

  async chat(messages: ChatMessage[], tools?: OpenAITool[]): Promise<LLMResponse> {
    if (!this.broker || !this.providerAddress || !this.serviceEndpoint) {
      throw new Error("LLM provider not initialized. Call initialize() first.");
    }

    const headers = await (this.broker as any).inference.getRequestHeaders(this.providerAddress);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.formatMessages(messages),
    };
    if (tools && tools.length > 0) {
      body.tools = this.formatTools(tools);
      body.tool_choice = "auto";
    }

    const response = await fetch(`${this.serviceEndpoint}/v1/proxy/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as any;
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No choices in LLM response");

    const msg = choice.message;
    const toolCalls: ToolCall[] | null = msg.tool_calls
      ? msg.tool_calls.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }))
      : null;

    return { content: msg.content || null, toolCalls };
  }
}

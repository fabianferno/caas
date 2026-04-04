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
  private broker: any = null;
  private providerAddress: string | null = null;
  private serviceEndpoint: string | null = null;
  private model: string | null = null;
  private ready = false;

  constructor(config: ZeroGConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const { createZGComputeNetworkBroker } = require("@0glabs/0g-serving-broker");
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    const wallet = new ethers.Wallet(this.config.privateKey, provider);
    this.broker = await createZGComputeNetworkBroker(wallet as any);

    // List available inference services
    const services = await this.broker.inference.listService();
    if (!services || services.length === 0) {
      throw new Error("No 0G Compute services available");
    }

    // Filter to chatbot services only
    const chatServices = services.filter(
      (s: any) => s.serviceType === "chatbot" || s.serviceType === "chat"
    );
    console.log(`[llm] Found ${services.length} services (${chatServices.length} chatbots):`);
    for (const svc of chatServices) {
      console.log(`[llm]   ${svc.model} @ ${svc.provider}`);
    }

    if (chatServices.length === 0) {
      throw new Error("No chatbot services available on 0G Compute");
    }

    // Ensure ledger exists
    try {
      await this.broker.ledger.getLedger();
      console.log("[llm] Ledger exists");
    } catch {
      console.log("[llm] Creating ledger and depositing funds...");
      await this.broker.ledger.addLedger(1);
      await this.broker.ledger.depositFund(4);
      console.log("[llm] Ledger created with 4 A0GI");
    }

    // Try each chatbot service until one is reachable
    for (const svc of chatServices) {
      console.log(`[llm] Trying ${svc.model}...`);

      // Ensure provider account is funded
      try {
        await this.broker.inference.getAccount(svc.provider);
      } catch {
        try {
          await this.broker.ledger.transferFund(svc.provider, "inference", 1);
          console.log(`[llm] Funded account for ${svc.model}`);
        } catch (err: any) {
          console.warn(`[llm] Could not fund ${svc.model}: ${err?.message?.slice(0, 80)}`);
          continue;
        }
      }

      // Try to acknowledge provider signer (verifies provider is online)
      try {
        await this.broker.inference.acknowledgeProviderSigner(svc.provider);
        this.providerAddress = svc.provider;
        this.serviceEndpoint = svc.url;
        this.model = svc.model;
        this.ready = true;
        console.log(`[llm] Connected to ${this.model}`);
        return;
      } catch (err: any) {
        console.warn(`[llm] ${svc.model} unreachable: ${err?.message?.slice(0, 80)}`);
      }
    }

    // No reachable provider -- pick first and hope it comes back
    const fallback = chatServices[0];
    this.providerAddress = fallback.provider;
    this.serviceEndpoint = fallback.url;
    this.model = fallback.model;
    console.warn(`[llm] No reachable providers. Using ${this.model} as fallback (will retry on request).`);
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

    // Retry acknowledge if it failed during init
    if (!this.ready) {
      try {
        await this.broker.inference.acknowledgeProviderSigner(this.providerAddress);
        this.ready = true;
      } catch (err: any) {
        throw new Error(
          `0G provider ${this.model} is not reachable. ` +
          `The provider signer could not be acknowledged. Try again later.`
        );
      }
    }

    const headers = await this.broker.inference.getRequestHeaders(this.providerAddress);

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

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

export interface BedrockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  model: string;
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

// --- Bedrock LLM Provider ---

export class BedrockLLMProvider implements LLMProvider {
  private config: BedrockConfig;
  private client: any = null;

  constructor(config: BedrockConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { BedrockRuntimeClient } = await import(
      "@aws-sdk/client-bedrock-runtime"
    );
    this.client = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
    console.log(`[llm:bedrock] Initialized with model ${this.config.model}`);
  }

  async chat(
    messages: ChatMessage[],
    tools?: OpenAITool[]
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error("Bedrock provider not initialized. Call initialize() first.");
    }

    const { ConverseCommand } = await import(
      "@aws-sdk/client-bedrock-runtime"
    );

    // Convert messages to Bedrock Converse format
    const system: Array<{ text: string }> = [];
    const converseMessages: Array<{ role: string; content: any[] }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        system.push({ text: msg.content || "" });
      } else if (msg.role === "user") {
        converseMessages.push({
          role: "user",
          content: [{ text: msg.content || "" }],
        });
      } else if (msg.role === "assistant") {
        const content: any[] = [];
        if (msg.content) content.push({ text: msg.content });
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            content.push({
              toolUse: {
                toolUseId: tc.id,
                name: tc.name.replace(/-/g, "_"),
                input: JSON.parse(tc.arguments),
              },
            });
          }
        }
        if (content.length > 0) {
          converseMessages.push({ role: "assistant", content });
        }
      } else if (msg.role === "tool") {
        converseMessages.push({
          role: "user",
          content: [
            {
              toolResult: {
                toolUseId: msg.toolCallId,
                content: [{ text: msg.content || "" }],
              },
            },
          ],
        });
      }
    }

    // Build Bedrock tool config
    const input: any = {
      modelId: this.config.model,
      system,
      messages: converseMessages,
    };

    // Bedrock requires tool names to match [a-zA-Z0-9_]+ (no hyphens)
    const nameMap = new Map<string, string>(); // sanitized -> original
    if (tools && tools.length > 0) {
      input.toolConfig = {
        tools: tools.map((t) => {
          const sanitized = t.function.name.replace(/-/g, "_");
          nameMap.set(sanitized, t.function.name);
          return {
            toolSpec: {
              name: sanitized,
              description: t.function.description,
              inputSchema: { json: t.function.parameters },
            },
          };
        }),
      };
    }

    let command = new ConverseCommand(input);
    let response;
    try {
      response = await this.client.send(command);
    } catch (err: any) {
      if (err?.name === "ModelErrorException" && input.toolConfig) {
        // Model can't handle tools -- retry without them
        console.warn("[llm:bedrock] Tool use failed, retrying without tools");
        delete input.toolConfig;
        command = new ConverseCommand(input);
        response = await this.client.send(command);
      } else {
        throw err;
      }
    }

    // Parse Bedrock response
    const output = response.output?.message;
    if (!output) throw new Error("No output in Bedrock response");

    let content: string | null = null;
    const toolCalls: ToolCall[] = [];

    for (const block of output.content || []) {
      if (block.text) {
        content = (content || "") + block.text;
      }
      if (block.toolUse) {
        const originalName = nameMap.get(block.toolUse.name) || block.toolUse.name;
        toolCalls.push({
          id: block.toolUse.toolUseId,
          name: originalName,
          arguments: JSON.stringify(block.toolUse.input),
        });
      }
    }

    // Strip thinking tags that some models leak
    if (content) {
      content = content.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, "").trim();
    }

    return {
      content: content || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
    };
  }
}

// --- 0G Compute LLM Provider ---

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

    const services = await this.broker.inference.listService();
    if (!services || services.length === 0) {
      throw new Error("No 0G Compute services available");
    }

    const chatServices = services.filter(
      (s: any) => s.serviceType === "chatbot" || s.serviceType === "chat"
    );
    console.log(`[llm:0g] Found ${services.length} services (${chatServices.length} chatbots):`);
    for (const svc of chatServices) {
      console.log(`[llm:0g]   ${svc.model} @ ${svc.provider}`);
    }

    if (chatServices.length === 0) {
      throw new Error("No chatbot services available on 0G Compute");
    }

    // Ensure ledger exists
    try {
      await this.broker.ledger.getLedger();
    } catch {
      console.log("[llm:0g] Creating ledger and depositing funds...");
      await this.broker.ledger.addLedger(1);
      await this.broker.ledger.depositFund(4);
    }

    // Try each chatbot service until one is reachable
    for (const svc of chatServices) {
      console.log(`[llm:0g] Trying ${svc.model}...`);

      try {
        await this.broker.inference.getAccount(svc.provider);
      } catch {
        try {
          await this.broker.ledger.transferFund(svc.provider, "inference", 1);
        } catch {
          continue;
        }
      }

      try {
        await this.broker.inference.acknowledgeProviderSigner(svc.provider);
        this.providerAddress = svc.provider;
        this.serviceEndpoint = svc.url;
        this.model = svc.model;
        this.ready = true;
        console.log(`[llm:0g] Connected to ${this.model}`);
        return;
      } catch (err: any) {
        console.warn(`[llm:0g] ${svc.model} unreachable: ${err?.message?.slice(0, 80)}`);
      }
    }

    throw new Error("All 0G Compute providers are offline");
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

    if (!this.ready) {
      try {
        await this.broker.inference.acknowledgeProviderSigner(this.providerAddress);
        this.ready = true;
      } catch {
        throw new Error(`0G provider ${this.model} is not reachable.`);
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

// --- Fallback Provider (tries 0G first, falls back to Bedrock) ---

export class FallbackLLMProvider implements LLMProvider {
  private primary: ZeroGLLMProvider;
  private fallback: BedrockLLMProvider;
  private useFallback = false;

  constructor(primary: ZeroGLLMProvider, fallback: BedrockLLMProvider) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async initialize(): Promise<void> {
    // Always init Bedrock (it's reliable)
    await this.fallback.initialize();

    // Try 0G, fall back gracefully
    try {
      await this.primary.initialize();
      console.log("[llm] Using 0G Compute as primary provider");
    } catch (err: any) {
      console.warn(`[llm] 0G Compute unavailable: ${err?.message?.slice(0, 100)}`);
      console.log("[llm] Using AWS Bedrock as fallback provider");
      this.useFallback = true;
    }
  }

  async chat(
    messages: ChatMessage[],
    tools?: OpenAITool[]
  ): Promise<LLMResponse> {
    if (!this.useFallback) {
      try {
        return await this.primary.chat(messages, tools);
      } catch (err: any) {
        console.warn(`[llm] 0G request failed, switching to Bedrock: ${err?.message?.slice(0, 80)}`);
        this.useFallback = true;
      }
    }
    return this.fallback.chat(messages, tools);
  }
}

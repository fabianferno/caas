import type { LLMProvider } from "./llm.js";
import type { ChatMessage, AgentResponse } from "./types.js";
import type { ToolRegistry } from "./tools.js";

export interface AgentLoopOptions {
  llm: LLMProvider;
  tools: ToolRegistry;
  systemPrompt: string;
  maxIterations?: number;
}

export class AgentLoop {
  private llm: LLMProvider;
  private tools: ToolRegistry;
  private systemPrompt: string;
  private maxIterations: number;

  constructor(opts: AgentLoopOptions) {
    this.llm = opts.llm;
    this.tools = opts.tools;
    this.systemPrompt = opts.systemPrompt;
    this.maxIterations = opts.maxIterations ?? 20;
  }

  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  async run(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<AgentResponse> {
    const messages: ChatMessage[] = [];
    if (this.systemPrompt) {
      messages.push({ role: "system", content: this.systemPrompt });
    }
    messages.push(...conversationHistory);
    messages.push({ role: "user", content: userMessage });

    const openAITools = this.tools.toOpenAITools();

    for (let i = 0; i < this.maxIterations; i++) {
      const response = await this.llm.chat(
        messages,
        openAITools.length > 0 ? openAITools : undefined
      );

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { text: response.content || "" };
      }

      messages.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        let result: string;
        try {
          result = await this.tools.execute(tc.name, tc.arguments);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        messages.push({ role: "tool", content: result, toolCallId: tc.id });
      }
    }

    return { text: "Stopped: reached maximum iterations without a final response." };
  }
}

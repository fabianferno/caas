import { describe, it, expect } from "vitest";
import { ZeroGLLMProvider } from "../../src/core/llm.js";
import type { ChatMessage } from "../../src/core/types.js";

describe("ZeroGLLMProvider", () => {
  it("formats messages for OpenAI-compatible API", () => {
    const provider = new ZeroGLLMProvider({
      privateKey: "0x" + "ab".repeat(32),
      rpcUrl: "https://evmrpc.0g.ai",
    });
    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ];
    const formatted = provider.formatMessages(messages);
    expect(formatted).toEqual([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ]);
  });

  it("formats tool definitions for API", () => {
    const provider = new ZeroGLLMProvider({
      privateKey: "0x" + "ab".repeat(32),
      rpcUrl: "https://evmrpc.0g.ai",
    });
    const tools = [{
      type: "function" as const,
      function: {
        name: "search",
        description: "Search the web",
        parameters: { type: "object", properties: { q: { type: "string" } } },
      },
    }];
    const formatted = provider.formatTools(tools);
    expect(formatted).toEqual(tools);
  });
});

import { describe, it, expect, vi } from "vitest";
import { AgentLoop } from "../../src/core/agent.js";
import type { LLMProvider } from "../../src/core/llm.js";
import type { LLMResponse } from "../../src/core/types.js";
import { ToolRegistry } from "../../src/core/tools.js";

function makeMockLLM(responses: LLMResponse[]): LLMProvider {
  let callIndex = 0;
  return {
    chat: vi.fn(async () => {
      const resp = responses[callIndex];
      callIndex++;
      return resp;
    }),
  };
}

describe("AgentLoop", () => {
  it("returns final text when no tool calls", async () => {
    const llm = makeMockLLM([{ content: "Hello!", toolCalls: null }]);
    const registry = new ToolRegistry();
    const agent = new AgentLoop({ llm, tools: registry, systemPrompt: "" });
    const result = await agent.run("Hi");
    expect(result.text).toBe("Hello!");
  });

  it("executes tool calls and feeds results back", async () => {
    const llm = makeMockLLM([
      {
        content: null,
        toolCalls: [{ id: "tc1", name: "echo", arguments: '{"msg":"world"}' }],
      },
      { content: "Got: world", toolCalls: null },
    ]);
    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "Echo",
      parameters: { type: "object", properties: { msg: { type: "string" } } },
      handler: async (args: any) => args.msg,
    });
    const agent = new AgentLoop({ llm, tools: registry, systemPrompt: "You are helpful." });
    const result = await agent.run("Say world");
    expect(result.text).toBe("Got: world");
    expect(llm.chat).toHaveBeenCalledTimes(2);
  });

  it("limits tool call iterations to prevent infinite loops", async () => {
    const infiniteToolCall: LLMResponse = {
      content: null,
      toolCalls: [{ id: "tc", name: "echo", arguments: '{"msg":"loop"}' }],
    };
    const responses = Array(25).fill(infiniteToolCall);
    const llm = makeMockLLM(responses);
    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "Echo",
      parameters: { type: "object", properties: { msg: { type: "string" } } },
      handler: async (args: any) => args.msg,
    });
    const agent = new AgentLoop({ llm, tools: registry, systemPrompt: "", maxIterations: 10 });
    const result = await agent.run("loop forever");
    expect(result.text).toContain("maximum iterations");
  });
});

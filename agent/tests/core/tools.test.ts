import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../../src/core/tools.js";

describe("ToolRegistry", () => {
  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "test-tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} },
      handler: async () => "result",
    });
    const tool = registry.get("test-tool");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("test-tool");
  });

  it("lists all tools as OpenAI function definitions", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "tool-a",
      description: "Tool A",
      parameters: { type: "object", properties: {} },
      handler: async () => "a",
    });
    registry.register({
      name: "tool-b",
      description: "Tool B",
      parameters: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
      handler: async () => "b",
    });
    const defs = registry.toOpenAITools();
    expect(defs).toHaveLength(2);
    expect(defs[0]).toEqual({
      type: "function",
      function: {
        name: "tool-a",
        description: "Tool A",
        parameters: { type: "object", properties: {} },
      },
    });
  });

  it("executes a tool handler", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "Echoes input",
      parameters: { type: "object", properties: { msg: { type: "string" } } },
      handler: async (args: any) => args.msg,
    });
    const result = await registry.execute("echo", '{"msg":"hello"}');
    expect(result).toBe("hello");
  });

  it("throws on unknown tool execution", async () => {
    const registry = new ToolRegistry();
    await expect(registry.execute("nope", "{}")).rejects.toThrow("Unknown tool: nope");
  });
});

describe("ToolRegistry context", () => {
  it("returns empty context by default", () => {
    const registry = new ToolRegistry();
    expect(registry.getContext()).toEqual({});
  });

  it("stores and retrieves context", () => {
    const registry = new ToolRegistry();
    registry.setContext({ userId: "user-123" });
    expect(registry.getContext()).toEqual({ userId: "user-123" });
  });

  it("overwrites previous context on setContext", () => {
    const registry = new ToolRegistry();
    registry.setContext({ userId: "a" });
    registry.setContext({ userId: "b" });
    expect(registry.getContext().userId).toBe("b");
  });
});

describe("ToolRegistry unregister", () => {
  it("removes a registered tool", () => {
    const registry = new ToolRegistry();
    registry.register({ name: "temp", description: "x", parameters: {}, handler: async () => "" });
    expect(registry.has("temp")).toBe(true);
    registry.unregister("temp");
    expect(registry.has("temp")).toBe(false);
  });

  it("is a no-op for unknown tool name", () => {
    const registry = new ToolRegistry();
    expect(() => registry.unregister("does-not-exist")).not.toThrow();
  });
});

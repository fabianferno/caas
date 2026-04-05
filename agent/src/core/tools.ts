import type { ToolDefinition } from "./types.js";

export interface RegisteredTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: unknown) => Promise<string>;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private context: Record<string, unknown> = {};

  register(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  setContext(ctx: Record<string, unknown>): void {
    this.context = ctx;
  }

  getContext(): Record<string, unknown> {
    return this.context;
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  toOpenAITools(): OpenAITool[] {
    return Array.from(this.tools.values()).map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  async execute(name: string, argsJson: string): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const args = JSON.parse(argsJson);
    return tool.handler(args);
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }
}

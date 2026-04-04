import fs from "node:fs/promises";
import path from "node:path";
import type { RegisteredTool } from "../core/tools.js";

export interface MemoryEntry {
  name: string;
  topic: string;
  content: string;
}

export class MarkdownMemory {
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  async ensure(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async save(name: string, topic: string, content: string): Promise<void> {
    await this.ensure();
    const filePath = path.join(this.dir, `${name}.md`);
    const md = [
      "---",
      `topic: ${topic}`,
      `updated: ${new Date().toISOString().slice(0, 10)}`,
      "---",
      `# ${name}`,
      "",
      content,
    ].join("\n");
    await fs.writeFile(filePath, md, "utf-8");
  }

  async read(name: string): Promise<string | null> {
    try {
      const filePath = path.join(this.dir, `${name}.md`);
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  async list(): Promise<MemoryEntry[]> {
    await this.ensure();
    const files = await fs.readdir(this.dir);
    const entries: MemoryEntry[] = [];
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(this.dir, file), "utf-8");
      const name = file.replace(".md", "");
      const topicMatch = content.match(/^topic:\s*(.+)$/m);
      entries.push({ name, topic: topicMatch?.[1] || "general", content });
    }
    return entries;
  }

  async remove(name: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.dir, `${name}.md`));
    } catch {}
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "memory-save",
        description: "Save information to persistent memory. Use for user preferences, facts, notes.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short identifier for this memory" },
            topic: { type: "string", description: "Category/topic" },
            content: { type: "string", description: "Content to remember" },
          },
          required: ["name", "topic", "content"],
        },
        handler: async (args: any) => {
          await this.save(args.name, args.topic, args.content);
          return `Saved memory: ${args.name}`;
        },
      },
      {
        name: "memory-read",
        description: "Read a specific memory by name.",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "Memory name to read" } },
          required: ["name"],
        },
        handler: async (args: any) => {
          const content = await this.read(args.name);
          return content || "Memory not found.";
        },
      },
      {
        name: "memory-list",
        description: "List all saved memories.",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          const entries = await this.list();
          if (entries.length === 0) return "No memories saved.";
          return entries.map((e) => `- ${e.name} (${e.topic})`).join("\n");
        },
      },
      {
        name: "memory-delete",
        description: "Delete a memory by name.",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "Memory name to delete" } },
          required: ["name"],
        },
        handler: async (args: any) => {
          await this.remove(args.name);
          return `Deleted memory: ${args.name}`;
        },
      },
    ];
  }
}

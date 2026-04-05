import fs from "node:fs";
import path from "node:path";
import type { RegisteredTool } from "../core/tools.js";
import type { ToolRegistry } from "../core/tools.js";
import type { SkillsManager } from "./skills.js";

export class SkillManagerTool {
  private skillsManager: SkillsManager;
  private skillsDir: string;
  private registry: ToolRegistry;
  private allowedUserIds: Set<string>;

  constructor(
    skillsManager: SkillsManager,
    skillsDir: string,
    registry: ToolRegistry,
    allowedUserIds: string[]
  ) {
    this.skillsManager = skillsManager;
    this.skillsDir = skillsDir;
    this.registry = registry;
    this.allowedUserIds = new Set(allowedUserIds);
  }

  private isOwner(): boolean {
    const userId = this.registry.getContext().userId as string | undefined;
    if (!userId || this.allowedUserIds.size === 0) return false;
    return this.allowedUserIds.has(userId);
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "skill_add",
        description: "Add a new skill to the agent. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name (alphanumeric and hyphens only)" },
            description: { type: "string", description: "What this skill does" },
            triggers: {
              type: "array",
              items: { type: "string" },
              description: "Phrases that activate this skill",
            },
            content: { type: "string", description: "Skill instructions in markdown" },
          },
          required: ["name", "description", "triggers", "content"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage skills.";
          const { name, description, triggers, content } = args as {
            name: string;
            description: string;
            triggers: string[];
            content: string;
          };
          if (!/^[a-zA-Z0-9-]+$/.test(name)) {
            return "Error: Skill name must be alphanumeric with hyphens only.";
          }
          const escapedDesc = description
            .replace(/\\/g, "\\\\")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/"/g, '\\"');
          const triggerLines = triggers.map((t) => {
            const escaped = t
              .replace(/\\/g, "\\\\")
              .replace(/\r/g, "\\r")
              .replace(/\n/g, "\\n")
              .replace(/"/g, '\\"');
            return `  - "${escaped}"`;
          }).join("\n");
          const md = `---\nname: ${name}\ndescription: "${escapedDesc}"\ntriggers:\n${triggerLines}\n---\n${content}`;
          fs.writeFileSync(path.join(this.skillsDir, `${name}.md`), md, "utf-8");
          return `Skill "${name}" added successfully.`;
        },
      },
      {
        name: "skill_remove",
        description: "Remove a skill by name. Owner-only.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name to remove" },
          },
          required: ["name"],
        },
        handler: async (args: any): Promise<string> => {
          if (!this.isOwner()) return "Error: Only the agent owner can manage skills.";
          if (!/^[a-zA-Z0-9-]+$/.test(args.name)) {
            return "Error: Skill name must be alphanumeric with hyphens only.";
          }
          const filePath = path.join(this.skillsDir, `${args.name}.md`);
          if (!fs.existsSync(filePath)) return `Error: Skill "${args.name}" not found.`;
          fs.unlinkSync(filePath);
          return `Skill "${args.name}" removed.`;
        },
      },
      {
        name: "skill_list",
        description: "List all currently loaded skills.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          const skills = this.skillsManager.getAll().map((s) => ({
            name: s.name,
            description: s.description,
            triggers: s.triggers,
          }));
          return JSON.stringify(skills, null, 2);
        },
      },
    ];
  }
}

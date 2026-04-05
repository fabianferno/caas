import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SkillsManager } from "../../src/tools/skills.js";
import { SkillManagerTool } from "../../src/tools/skill-manager.js";
import { ToolRegistry } from "../../src/core/tools.js";

describe("SkillManagerTool", () => {
  let skillsDir: string;
  let registry: ToolRegistry;
  let skillsManager: SkillsManager;
  let tool: SkillManagerTool;
  const OWNER_ID = "owner-abc";

  beforeEach(() => {
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-mgr-"));
    registry = new ToolRegistry();
    skillsManager = new SkillsManager(skillsDir);
    skillsManager.loadAll();
    tool = new SkillManagerTool(skillsManager, skillsDir, registry, [OWNER_ID]);
  });

  afterEach(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
  });

  const getHandler = (name: string) => {
    const t = tool.registerTools().find((t) => t.name === name)!;
    return t.handler;
  };

  describe("skill_add", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const result = await getHandler("skill_add")({
        name: "test", description: "d", triggers: ["hi"], content: "content"
      });
      expect(result).toContain("Error:");
    });

    it("rejects invalid name", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_add")({
        name: "bad name!", description: "d", triggers: ["hi"], content: "content"
      });
      expect(result).toContain("Error:");
    });

    it("writes skill file with correct frontmatter", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_add")({
        name: "my-skill",
        description: "Does something",
        triggers: ["do it", "run it"],
        content: "# My Skill\nDo the thing.",
      });
      expect(result).toContain("my-skill");
      const filePath = path.join(skillsDir, "my-skill.md");
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("name: my-skill");
      expect(content).toContain('description: "Does something"');
      expect(content).toContain('  - "do it"');
      expect(content).toContain('  - "run it"');
      expect(content).toContain("# My Skill");
    });

    it("overwrites existing skill file", async () => {
      registry.setContext({ userId: OWNER_ID });
      await getHandler("skill_add")({ name: "dup", description: "v1", triggers: ["a"], content: "v1" });
      await getHandler("skill_add")({ name: "dup", description: "v2", triggers: ["b"], content: "v2" });
      const content = fs.readFileSync(path.join(skillsDir, "dup.md"), "utf-8");
      expect(content).toContain('description: "v2"');
    });
  });

  describe("skill_remove", () => {
    it("rejects non-owner", async () => {
      registry.setContext({ userId: "stranger" });
      const result = await getHandler("skill_remove")({ name: "any" });
      expect(result).toContain("Error:");
    });

    it("returns error for missing skill", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_remove")({ name: "nonexistent" });
      expect(result).toContain("Error:");
    });

    it("deletes the skill file", async () => {
      registry.setContext({ userId: OWNER_ID });
      fs.writeFileSync(path.join(skillsDir, "bye.md"), "---\nname: bye\ndescription: x\ntriggers:\n  - bye\n---\ncontent");
      const result = await getHandler("skill_remove")({ name: "bye" });
      expect(result).toContain("bye");
      expect(fs.existsSync(path.join(skillsDir, "bye.md"))).toBe(false);
    });
  });

  describe("skill_list", () => {
    it("returns loaded skills as JSON", async () => {
      fs.writeFileSync(
        path.join(skillsDir, "greet.md"),
        "---\nname: greet\ndescription: Greet user\ntriggers:\n  - hello\n---\nGreet warmly."
      );
      skillsManager.loadAll();
      const result = await getHandler("skill_list")({});
      const parsed = JSON.parse(result as string);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("greet");
      expect(parsed[0].triggers).toEqual(["hello"]);
    });

    it("returns empty array when no skills loaded", async () => {
      const result = await getHandler("skill_list")({});
      const parsed = JSON.parse(result as string);
      expect(parsed).toEqual([]);
    });
  });

  describe("security", () => {
    it("skill_remove rejects path traversal name", async () => {
      registry.setContext({ userId: OWNER_ID });
      const result = await getHandler("skill_remove")({ name: "../../../etc/passwd" });
      expect(result).toContain("Error:");
    });

    it("skill_add handles description with special YAML chars", async () => {
      registry.setContext({ userId: OWNER_ID });
      await getHandler("skill_add")({
        name: "tricky",
        description: 'Say "hello" and: done',
        triggers: ['trigger: weird'],
        content: "content",
      });
      const filePath = path.join(skillsDir, "tricky.md");
      expect(fs.existsSync(filePath)).toBe(true);
      // File should be readable (not corrupted frontmatter)
      const raw = fs.readFileSync(filePath, "utf-8");
      expect(raw).toContain('description: "Say \\"hello\\" and: done"');
    });

    it("skill_add handles description with newlines", async () => {
      registry.setContext({ userId: OWNER_ID });
      await getHandler("skill_add")({
        name: "newline-test",
        description: "line one\nline two",
        triggers: ["trigger\nwith newline"],
        content: "content",
      });
      const raw = fs.readFileSync(path.join(skillsDir, "newline-test.md"), "utf-8");
      expect(raw).toContain("\\n");
      expect(raw.split("\n").filter(l => l.startsWith("description:")).length).toBe(1);
    });
  });
});

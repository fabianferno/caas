import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkillsManager } from "../../src/tools/skills.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("SkillsManager", () => {
  let skillsDir: string;

  beforeEach(() => {
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-"));
  });

  afterEach(() => {
    fs.rmSync(skillsDir, { recursive: true, force: true });
  });

  it("loads skills from markdown files", () => {
    fs.writeFileSync(
      path.join(skillsDir, "greeting.md"),
      ["---", "name: greeting", "description: Respond to greetings", "triggers:", "  - hello", "  - hi", "---", "# Greeting", "Respond warmly."].join("\n")
    );
    const manager = new SkillsManager(skillsDir);
    manager.loadAll();
    const skills = manager.getAll();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("greeting");
    expect(skills[0].triggers).toEqual(["hello", "hi"]);
  });

  it("matches skills by trigger", () => {
    fs.writeFileSync(
      path.join(skillsDir, "review.md"),
      ["---", "name: code-review", "description: Review code", "triggers:", "  - review this code", "  - code review", "---", "When reviewing code, check for bugs."].join("\n")
    );
    const manager = new SkillsManager(skillsDir);
    manager.loadAll();
    const matched = manager.match("Can you review this code?");
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("code-review");
  });

  it("returns empty for no trigger match", () => {
    fs.writeFileSync(
      path.join(skillsDir, "review.md"),
      ["---", "name: code-review", "description: Review code", "triggers:", "  - review this code", "---", "Review instructions."].join("\n")
    );
    const manager = new SkillsManager(skillsDir);
    manager.loadAll();
    const matched = manager.match("What is the weather?");
    expect(matched).toHaveLength(0);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MarkdownMemory } from "../../src/memory/markdown.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("MarkdownMemory", () => {
  let memDir: string;
  let memory: MarkdownMemory;

  beforeEach(() => {
    memDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-mem-"));
    memory = new MarkdownMemory(memDir);
  });

  afterEach(() => {
    fs.rmSync(memDir, { recursive: true, force: true });
  });

  it("saves and reads a memory file", async () => {
    await memory.save("prefs", "user-preferences", "Prefers concise responses");
    const content = await memory.read("prefs");
    expect(content).toContain("Prefers concise responses");
    expect(content).toContain("user-preferences");
  });

  it("lists all memory files", async () => {
    await memory.save("prefs", "user-prefs", "Concise");
    await memory.save("facts", "user-facts", "Timezone: IST");
    const list = await memory.list();
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.name)).toContain("prefs");
    expect(list.map((m) => m.name)).toContain("facts");
  });

  it("deletes a memory file", async () => {
    await memory.save("temp", "temporary", "Temp data");
    await memory.remove("temp");
    const list = await memory.list();
    expect(list).toHaveLength(0);
  });
});

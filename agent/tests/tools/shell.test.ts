import { describe, it, expect } from "vitest";
import { ShellTool } from "../../src/tools/shell.js";

describe("ShellTool", () => {
  it("executes allowed commands", async () => {
    const shell = new ShellTool(["echo", "date"]);
    const tool = shell.registerTool();
    const result = await tool.handler({ command: "echo hello" });
    expect(result).toContain("hello");
  });

  it("rejects disallowed commands", async () => {
    const shell = new ShellTool(["echo"]);
    const tool = shell.registerTool();
    const result = await tool.handler({ command: "rm -rf /" });
    expect(result).toContain("not in allowlist");
  });

  it("handles command timeout", async () => {
    const shell = new ShellTool(["sleep"], 100);
    const tool = shell.registerTool();
    const result = await tool.handler({ command: "sleep 10" });
    expect(result).toContain("timed out");
  });
});

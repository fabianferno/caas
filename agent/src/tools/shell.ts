import { exec } from "node:child_process";
import type { RegisteredTool } from "../core/tools.js";

export class ShellTool {
  private allowlist: Set<string>;
  private timeoutMs: number;

  constructor(allowlist: string[], timeoutMs = 30000) {
    this.allowlist = new Set(allowlist);
    this.timeoutMs = timeoutMs;
  }

  private isAllowed(command: string): boolean {
    const baseCmd = command.trim().split(/\s+/)[0];
    return this.allowlist.has(baseCmd);
  }

  registerTool(): RegisteredTool {
    return {
      name: "shell",
      description: "Execute a shell command. Only allowlisted commands are permitted.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute" },
        },
        required: ["command"],
      },
      handler: async (args: any): Promise<string> => {
        const command = args.command as string;
        if (!this.isAllowed(command)) {
          return `Error: Command "${command.split(/\s+/)[0]}" is not in allowlist. Allowed: ${Array.from(this.allowlist).join(", ")}`;
        }
        return new Promise((resolve) => {
          exec(command, { timeout: this.timeoutMs }, (error, stdout, stderr) => {
            if (error) {
              if (error.killed) {
                resolve(`Error: Command timed out after ${this.timeoutMs}ms`);
                return;
              }
              resolve(`Error: ${error.message}\nStderr: ${stderr}`);
              return;
            }
            const output = stdout + (stderr ? `\nStderr: ${stderr}` : "");
            resolve(output || "(no output)");
          });
        });
      },
    };
  }
}

import type { RegisteredTool } from "../core/tools.js";
import { writeAgentSoul } from "../memory/ens.js";

export interface ENSSoulToolOptions {
  ensName: string;
  agentPrivateKey: string;
  ethRpcUrl: string;
  onUpdate: (soul: string, personality: Record<string, string> | null) => void;
}

export class ENSSoulTool {
  constructor(private opts: ENSSoulToolOptions) {}

  registerTool(): RegisteredTool {
    return {
      name: "ens_update_soul",
      description:
        "Save your soul (character, personality, behavior directives) permanently to your ENS record on Ethereum. " +
        "Call this whenever the user defines or updates how you should behave, your personality, values, tone, or identity. " +
        "The saved soul becomes your system prompt on every future startup. " +
        "You can call this multiple times as your identity evolves.",
      parameters: {
        type: "object",
        properties: {
          soul: {
            type: "string",
            description:
              "Your full identity as a system prompt. Write in second person (\"You are...\"). " +
              "Include: who you are, your purpose, values, communication style, areas of expertise, " +
              "and any specific behavioral directives the user has given you.",
          },
          personality: {
            type: "object",
            description:
              "Key personality traits as a flat key-value object. " +
              "Examples: {\"tone\": \"curious and warm\", \"humor\": \"dry wit\", \"expertise\": \"philosophy and ethics\", \"language\": \"concise\"}",
            additionalProperties: { type: "string" },
          },
        },
        required: ["soul"],
      },
      handler: async (args: unknown) => {
        const { soul, personality } = args as {
          soul: string;
          personality?: Record<string, string>;
        };

        try {
          console.log(`[ens-soul] Saving soul to ${this.opts.ensName}...`);
          await writeAgentSoul(
            this.opts.ensName,
            { soul, personality },
            this.opts.agentPrivateKey,
            this.opts.ethRpcUrl
          );
          this.opts.onUpdate(soul, personality ?? null);
          console.log(`[ens-soul] Soul saved successfully to ${this.opts.ensName}`);
          return `Soul saved to ${this.opts.ensName} on ENS. Your identity is now permanent on-chain.`;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[ens-soul] Failed to save soul:`, err);
          return `Failed to save soul to ENS: ${msg}`;
        }
      },
    };
  }
}

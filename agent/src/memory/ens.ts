import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

export interface SoulData {
  soul: string | null;
  personality: Record<string, string> | null;
  channels: string[];
  skills: string[];
}

export interface SystemPromptInput {
  soul: string | null;
  personality: Record<string, string> | null;
  skills: string[];
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const parts: string[] = [];
  if (input.soul) {
    parts.push(input.soul);
  } else {
    parts.push("You are a helpful AI assistant. Respond clearly and concisely.");
  }
  if (input.personality) {
    const traits = Object.entries(input.personality)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    parts.push(`\nPersonality: ${traits}`);
  }
  if (input.skills.length > 0) {
    parts.push("\n## Active Skills\n");
    for (const skill of input.skills) {
      parts.push(skill);
    }
  }
  return parts.join("\n");
}

export async function readENSRecords(ensName: string, rpcUrl: string): Promise<SoulData> {
  const client = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
  const [soulHash, personalityRaw, channelsRaw] = await Promise.all([
    client.getEnsText({ name: normalize(ensName), key: "caas.soul" }).catch(() => null),
    client.getEnsText({ name: normalize(ensName), key: "caas.personality" }).catch(() => null),
    client.getEnsText({ name: normalize(ensName), key: "caas.channels" }).catch(() => null),
  ]);
  let personality: Record<string, string> | null = null;
  if (personalityRaw) {
    try { personality = JSON.parse(personalityRaw); } catch {}
  }
  const channels = channelsRaw
    ? channelsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  let soul: string | null = null;
  if (soulHash) {
    soul = soulHash; // Will be resolved to 0G Storage content when integrated
  }
  return { soul, personality, channels, skills: [] };
}

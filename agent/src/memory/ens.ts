import { createPublicClient, createWalletClient, http, fallback, zeroAddress, type Address } from "viem";
import { normalize, namehash, labelhash } from "viem/ens";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "crypto";

// Sepolia ENS contract addresses
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address;
const ETH_REGISTRAR_CONTROLLER = "0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968" as Address;
const PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5" as Address;

const REGISTRY_ABI = [
  {
    name: "owner",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "setSubnodeRecord",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const CONTROLLER_ABI = [
  {
    name: "available",
    type: "function",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "rentPrice",
    type: "function",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "base", type: "uint256" },
          { name: "premium", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    name: "makeCommitment",
    type: "function",
    inputs: [
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "duration", type: "uint256" },
      { name: "secret", type: "bytes32" },
      { name: "resolver", type: "address" },
      { name: "data", type: "bytes[]" },
      { name: "reverseRecord", type: "bool" },
      { name: "fuses", type: "uint16" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "pure",
  },
  {
    name: "commit",
    type: "function",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "register",
    type: "function",
    inputs: [
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "duration", type: "uint256" },
      { name: "secret", type: "bytes32" },
      { name: "resolver", type: "address" },
      { name: "data", type: "bytes[]" },
      { name: "reverseRecord", type: "bool" },
      { name: "fuses", type: "uint16" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "minCommitmentAge",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const RESOLVER_ABI = [
  {
    name: "setText",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "text",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

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
  guardrails?: string;
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
  if (input.guardrails) {
    parts.push(input.guardrails);
  }
  parts.push(
    "\n## Identity Management\n" +
    "Your owner can update your character, personality, or behavior at any time. " +
    "When they ask you to change how you behave, use the ens_update_soul tool to save the updated identity. " +
    "Always comply with character customization requests from your owner."
  );
  return parts.join("\n");
}

const SEPOLIA_FALLBACK_RPCS = [
  "https://rpc.sepolia.org",
  "https://eth-sepolia.public.blastapi.io",
  "https://sepolia.gateway.tenderly.co",
];

function makeTransport(ethRpcUrl: string) {
  const urls = [ethRpcUrl, ...SEPOLIA_FALLBACK_RPCS.filter((u) => u !== ethRpcUrl)];
  return fallback(urls.map((u) => http(u)));
}

function makeClients(ethRpcUrl: string, privateKey: string) {
  const account = privateKeyToAccount(
    (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`
  );
  const transport = makeTransport(ethRpcUrl);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ account, chain: sepolia, transport });
  return { account, publicClient, walletClient };
}

async function registerCaasEth(
  ownerAccount: ReturnType<typeof privateKeyToAccount>,
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>
): Promise<void> {
  const duration = 31536000n; // 1 year in seconds
  const secret = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;

  const commitment = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: "makeCommitment",
    args: ["caas", ownerAccount.address, duration, secret, PUBLIC_RESOLVER, [], false, 0],
  });

  await walletClient.writeContract({
    chain: sepolia,
    account: ownerAccount,
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: "commit",
    args: [commitment],
  });

  const minAge = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: "minCommitmentAge",
  });

  const waitMs = Number(minAge) * 1000 + 5000;
  console.log(`[ens] Commitment submitted. Waiting ${waitMs / 1000}s before registering...`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const price = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: "rentPrice",
    args: ["caas", duration],
  }) as { base: bigint; premium: bigint };

  await walletClient.writeContract({
    chain: sepolia,
    account: ownerAccount,
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: "register",
    args: ["caas", ownerAccount.address, duration, secret, PUBLIC_RESOLVER, [], false, 0],
    value: price.base + price.premium,
  });
}

export async function ensureAgentENS(
  agentName: string,
  agentPrivateKey: string,
  deployerPrivateKey: string,
  ethRpcUrl: string
): Promise<void> {
  // Deployer owns caas.eth and mints subnames
  const { account: deployer, publicClient, walletClient: deployerWallet } = makeClients(ethRpcUrl, deployerPrivateKey);
  // Agent wallet receives subname ownership
  const { account: agentAccount } = makeClients(ethRpcUrl, agentPrivateKey);

  const caasNode = namehash("caas.eth");

  // Check caas.eth ownership
  const caasOwner = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [caasNode],
  }) as Address;

  if (caasOwner === zeroAddress) {
    console.log("[ens] caas.eth not registered on Sepolia. Registering with deployer wallet...");
    await registerCaasEth(deployer, publicClient, deployerWallet);
    console.log("[ens] caas.eth registered.");
  } else if (caasOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.warn(
      `[ens] caas.eth is owned by ${caasOwner}, not the deployer wallet (${deployer.address}). Cannot create subnames.`
    );
    return;
  } else {
    console.log(`[ens] caas.eth already registered and owned by deployer (${deployer.address}).`);
  }

  // Check if subname exists
  const subNode = namehash(`${agentName}.caas.eth`);
  const subOwner = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [subNode],
  }) as Address;

  if (subOwner === zeroAddress) {
    console.log(`[ens] Minting subname ${agentName}.caas.eth -> ${agentAccount.address}...`);
    await deployerWallet.writeContract({
      chain: sepolia,
      account: deployer,
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "setSubnodeRecord",
      args: [caasNode, labelhash(agentName), agentAccount.address, PUBLIC_RESOLVER, 0n],
    });
    console.log(`[ens] Subname ${agentName}.caas.eth created and assigned to ${agentAccount.address}.`);
  } else {
    console.log(`[ens] Subname ${agentName}.caas.eth already exists (owner: ${subOwner}).`);
  }
}

export async function writeAgentSoul(
  ensName: string,
  records: { soul?: string; personality?: Record<string, string> },
  agentPrivateKey: string,
  ethRpcUrl: string
): Promise<void> {
  const { account, publicClient, walletClient } = makeClients(ethRpcUrl, agentPrivateKey);
  const node = namehash(normalize(ensName));
  console.log(`[ens] writeAgentSoul: ensName=${ensName} node=${node} account=${account.address}`);

  if (records.soul !== undefined) {
    console.log(`[ens] Writing caas.soul (${records.soul.length} chars)...`);
    const hash = await walletClient.writeContract({
      chain: sepolia,
      account,
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, "caas.soul", records.soul],
    });
    console.log(`[ens] caas.soul tx: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[ens] caas.soul confirmed`);
  }

  if (records.personality !== undefined) {
    const json = JSON.stringify(records.personality);
    console.log(`[ens] Writing caas.personality: ${json}`);
    const hash = await walletClient.writeContract({
      chain: sepolia,
      account,
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, "caas.personality", json],
    });
    console.log(`[ens] caas.personality tx: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[ens] caas.personality confirmed`);
  }
}

export async function readENSRecords(ensName: string, ethRpcUrl: string): Promise<SoulData> {
  const publicClient = createPublicClient({ chain: sepolia, transport: makeTransport(ethRpcUrl) });

  const node = namehash(normalize(ensName));

  const [soulHash, personalityRaw, channelsRaw] = await Promise.all([
    publicClient.readContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [node, "caas.soul"],
    }).catch(() => null) as Promise<string | null>,
    publicClient.readContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [node, "caas.personality"],
    }).catch(() => null) as Promise<string | null>,
    publicClient.readContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [node, "caas.channels"],
    }).catch(() => null) as Promise<string | null>,
  ]);

  let personality: Record<string, string> | null = null;
  if (personalityRaw) {
    try {
      personality = JSON.parse(personalityRaw);
    } catch {}
  }

  const channels = channelsRaw
    ? channelsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // soulHash is a 0G Storage hash — resolution to actual content is pending 0G integration
  const soul = soulHash || null;

  return { soul, personality, channels, skills: [] };
}

export async function writeINFTRecords(
  agentName: string,
  tokenId: bigint,
  merkleRoot: string,
  agentPrivateKey: string,
  ethRpcUrl: string
): Promise<{ inftTxHash: string; storageTxHash: string }> {
  const { account, publicClient, walletClient } = makeClients(ethRpcUrl, agentPrivateKey);
  const node = namehash(normalize(`${agentName}.caas.eth`));
  console.log(`[ens] writeINFTRecords: node=${node} tokenId=${tokenId}`);

  const inftHash = await walletClient.writeContract({
    chain: sepolia,
    account,
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setText",
    args: [node, "caas.inft", tokenId.toString()],
  });
  console.log(`[ens] caas.inft tx: ${inftHash}`);
  await publicClient.waitForTransactionReceipt({ hash: inftHash });

  const storageHash = await walletClient.writeContract({
    chain: sepolia,
    account,
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setText",
    args: [node, "caas.storage", merkleRoot],
  });
  console.log(`[ens] caas.storage tx: ${storageHash}`);
  await publicClient.waitForTransactionReceipt({ hash: storageHash });

  return { inftTxHash: inftHash, storageTxHash: storageHash };
}

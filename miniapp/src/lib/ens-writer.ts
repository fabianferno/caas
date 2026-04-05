import {
  createPublicClient,
  createWalletClient,
  http,
  zeroAddress,
  type Address,
} from "viem";
import { normalize, namehash, labelhash } from "viem/ens";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address;
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
] as const;

function makeClients(privateKey: string, ethRpcUrl: string) {
  const account = privateKeyToAccount(
    (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`
  );
  const publicClient = createPublicClient({ chain: sepolia, transport: http(ethRpcUrl) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(ethRpcUrl) });
  return { account, publicClient, walletClient };
}

async function ensureSubname(
  agentName: string,
  account: ReturnType<typeof privateKeyToAccount>,
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>
): Promise<void> {
  const caasNode = namehash("caas.eth");
  const subNode = namehash(`${agentName}.caas.eth`);

  const subOwner = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [subNode],
  }) as Address;

  if (subOwner === zeroAddress) {
    const tx = await walletClient.writeContract({
      chain: sepolia,
      account,
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "setSubnodeRecord",
      args: [caasNode, labelhash(agentName), account.address, PUBLIC_RESOLVER, BigInt(0)],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }
  // If subOwner != account.address and != zeroAddress, setText will revert
  // In that case the caller will get an on-chain error with a clear message
}

export async function writeINFTRecords(
  agentName: string,
  tokenId: bigint,
  merkleRoot: string,
  privateKey: string,
  ethRpcUrl: string
): Promise<{ inftTxHash: string; storageTxHash: string }> {
  const { account, publicClient, walletClient } = makeClients(privateKey, ethRpcUrl);

  await ensureSubname(agentName, account, publicClient, walletClient);

  const node = namehash(normalize(`${agentName}.caas.eth`));

  const inftTxHash = await walletClient.writeContract({
    chain: sepolia,
    account,
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setText",
    args: [node, "caas.inft", tokenId.toString()],
  });
  await publicClient.waitForTransactionReceipt({ hash: inftTxHash });

  const storageTxHash = await walletClient.writeContract({
    chain: sepolia,
    account,
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setText",
    args: [node, "caas.storage", merkleRoot],
  });
  await publicClient.waitForTransactionReceipt({ hash: storageTxHash });

  return { inftTxHash, storageTxHash };
}

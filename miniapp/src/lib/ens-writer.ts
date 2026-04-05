import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from "viem";
import { normalize, namehash } from "viem/ens";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5" as Address;

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

export async function writeINFTRecords(
  agentName: string,
  tokenId: bigint,
  merkleRoot: string,
  privateKey: string,
  ethRpcUrl: string
): Promise<{ inftTxHash: string; storageTxHash: string }> {
  const account = privateKeyToAccount(
    (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`
  );
  const publicClient = createPublicClient({ chain: sepolia, transport: http(ethRpcUrl) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(ethRpcUrl) });

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

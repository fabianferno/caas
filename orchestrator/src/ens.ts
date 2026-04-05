import { createPublicClient, createWalletClient, http, parseEther, type Address } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { namehash, normalize } from "viem/ens";

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

export interface AgentkitENSData {
  address: string | null;
  network: string | null;
  registered: boolean;
  nullifierHash: string | null;
  txHash: string | null;
}

export async function writeAgentkitRecords(
  ensName: string,
  data: {
    address: string;
    network: string;
    nullifierHash: string;
    merkleRoot: string;
    txHash: string;
    contract: string;
  },
  agentPrivateKey: string,
  deployerPrivateKey: string,
  ethRpcUrl: string,
): Promise<void> {
  const toHexKey = (k: string) => (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
  const agentAccount = privateKeyToAccount(toHexKey(agentPrivateKey));
  const deployerAccount = privateKeyToAccount(toHexKey(deployerPrivateKey));
  const publicClient = createPublicClient({ chain: sepolia, transport: http(ethRpcUrl) });

  // Fund the agent wallet from deployer so it can pay gas for setText calls
  const balance = await publicClient.getBalance({ address: agentAccount.address });
  if (balance < parseEther("0.005")) {
    const deployerWallet = createWalletClient({ account: deployerAccount, chain: sepolia, transport: http(ethRpcUrl) });
    const fundTx = await deployerWallet.sendTransaction({
      to: agentAccount.address,
      value: parseEther("0.01"),
    });
    await publicClient.waitForTransactionReceipt({ hash: fundTx });
    console.log(`[ens] Funded ${agentAccount.address} with 0.01 ETH for ENS writes`);
  }

  const walletClient = createWalletClient({ account: agentAccount, chain: sepolia, transport: http(ethRpcUrl) });
  const node = namehash(normalize(ensName));

  const records: [string, string][] = [
    ["caas.agentkit.address", data.address],
    ["caas.agentkit.network", data.network],
    ["caas.agentkit.registered", "true"],
    ["caas.agentkit.nullifierHash", data.nullifierHash],
    ["caas.agentkit.merkleRoot", data.merkleRoot],
    ["caas.agentkit.txHash", data.txHash],
    ["caas.agentkit.contract", data.contract],
  ];

  for (const [key, value] of records) {
    const hash = await walletClient.writeContract({
      chain: sepolia,
      account: agentAccount,
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, key, value],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

export async function writeSoulRecord(
  ensName: string,
  soul: string,
  privateKey: string,
  ethRpcUrl: string,
): Promise<void> {
  const toHexKey = (k: string) => (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
  const account = privateKeyToAccount(toHexKey(privateKey));
  const publicClient = createPublicClient({ chain: sepolia, transport: http(ethRpcUrl) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(ethRpcUrl) });
  const node = namehash(normalize(ensName));

  const hash = await walletClient.writeContract({
    chain: sepolia,
    account,
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setText",
    args: [node, "caas.soul", soul],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[ens] Wrote caas.soul for ${ensName} (${soul.length} chars)`);
}

export async function readAgentkitRecords(
  ensName: string,
  ethRpcUrl: string,
): Promise<AgentkitENSData> {
  const publicClient = createPublicClient({ chain: sepolia, transport: http(ethRpcUrl) });
  const node = namehash(normalize(ensName));

  const read = (key: string) =>
    publicClient
      .readContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "text",
        args: [node, key],
      })
      .catch(() => null) as Promise<string | null>;

  const [address, network, registered, nullifierHash, txHash] = await Promise.all([
    read("caas.agentkit.address"),
    read("caas.agentkit.network"),
    read("caas.agentkit.registered"),
    read("caas.agentkit.nullifierHash"),
    read("caas.agentkit.txHash"),
  ]);

  return {
    address,
    network,
    registered: registered === "true",
    nullifierHash,
    txHash,
  };
}

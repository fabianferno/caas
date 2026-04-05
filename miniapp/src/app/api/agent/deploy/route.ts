import { NextRequest } from "next/server";
import { ethers } from "ethers";
import { uploadEncryptedBlobsToZeroG } from "@/lib/inft-uploader";
import { writeINFTRecords } from "@/lib/ens-writer";
import AgentNFTAbi from "@/abi/AgentNFT.json";

const OG_RPC = process.env.OG_RPC_URL!;
const OG_INDEXER = process.env.OG_STORAGE_URL!;
const DEPLOYER_KEY = process.env.OG_DEPLOYER_PRIVATE_KEY!;
const CONTRACT = process.env.AGENT_NFT_CONTRACT_ADDRESS!;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    agentName: string;
    ownerAddress: string;
    soul: string;
    skills: string;
    config: string;
    aesKeyHex: string;
  };

  const { agentName, ownerAddress, soul, skills, config, aesKeyHex } = body;

  if (!agentName || !ownerAddress || !soul || !aesKeyHex) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const aesKey = Buffer.from(aesKeyHex.replace("0x", ""), "hex");
  if (aesKey.length !== 32) {
    return new Response(JSON.stringify({ error: "Invalid AES key length" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1: Upload to 0G Storage
        emit({ step: 1, status: "start" });
        const { intelligentData, merkleRoot } = await uploadEncryptedBlobsToZeroG(
          [
            { description: "soul.md", content: soul },
            { description: "skills.json", content: skills ?? "" },
            { description: "config.json", content: config ?? "" },
          ],
          aesKey,
          OG_INDEXER,
          OG_RPC,
          DEPLOYER_KEY
        );
        emit({ step: 1, status: "done", hashes: intelligentData.map((d) => d.dataHash) });

        // Step 2: Mint INFT on 0G Chain
        emit({ step: 2, status: "start" });
        const provider = new ethers.JsonRpcProvider(OG_RPC);
        const signer = new ethers.Wallet(DEPLOYER_KEY, provider);
        const contract = new ethers.Contract(CONTRACT, AgentNFTAbi, signer);

        const mintTx = await contract.mint(intelligentData, ownerAddress);
        const receipt = await mintTx.wait();

        // Extract tokenId from ERC-721 Transfer event (topics[3] = tokenId)
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
        const transferLog = receipt.logs.find(
          (log: { topics: string[] }) => log.topics[0] === transferTopic
        );
        const tokenId = transferLog ? BigInt(transferLog.topics[3]) : BigInt(1);

        emit({ step: 2, status: "done", tokenId: tokenId.toString(), txHash: receipt.hash });

        // Step 3: Write ENS Records
        emit({ step: 3, status: "start" });
        const ensPrivateKey = process.env.ENS_DEPLOYER_PRIVATE_KEY ?? DEPLOYER_KEY;
        const ethRpcUrl = process.env.ETH_RPC_URL ?? "https://rpc.sepolia.org";
        const { inftTxHash, storageTxHash } = await writeINFTRecords(
          agentName,
          tokenId,
          merkleRoot,
          ensPrivateKey,
          ethRpcUrl
        );
        emit({ step: 3, status: "done", txHash: inftTxHash });

        emit({
          done: true,
          tokenId: tokenId.toString(),
          merkleRoot,
          txHashes: [receipt.hash, inftTxHash, storageTxHash],
          storageHashes: intelligentData.map((d) => d.dataHash),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        emit({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

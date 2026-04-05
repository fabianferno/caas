import { NextRequest } from "next/server";

const ORCHESTRATOR_URL = (process.env.ORCHESTRATOR_URL || "http://localhost:4000").replace(/\/+$/, "");

// 0G + INFT config (optional -- steps 1-3 are skipped if not configured)
const OG_RPC = process.env.OG_RPC_URL;
const OG_INDEXER = process.env.OG_STORAGE_URL;
const DEPLOYER_KEY = process.env.OG_DEPLOYER_PRIVATE_KEY;
const CONTRACT = process.env.AGENT_NFT_CONTRACT_ADDRESS;

const HAS_OG_CONFIG = !!(OG_RPC && OG_INDEXER && DEPLOYER_KEY && CONTRACT);

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    agentName: string;
    ownerAddress: string;
    soul: string;
    skills: string;
    config: string;
    aesKeyHex: string;
    telegramBotToken?: string;
    discordBotToken?: string;
    enableWhatsApp?: boolean;
    avatarSeed?: string;
    avatarBg?: string;
    model?: string;
    memoryType?: string;
  };

  const {
    agentName, ownerAddress, soul, skills, config, aesKeyHex,
    telegramBotToken, discordBotToken, enableWhatsApp,
    avatarSeed, avatarBg, model, memoryType,
  } = body;

  if (!agentName || !soul) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let tokenId: string | null = null;
        let merkleRoot: string | null = null;
        let ogTxHash: string | null = null;
        let ensTxHash: string | null = null;
        let storageTxHash: string | null = null;
        let storageHashes: string[] = [];

        // Steps 1-3: 0G Storage + INFT Mint + ENS (only if OG vars are configured)
        if (HAS_OG_CONFIG) {
          const { ethers } = await import("ethers");
          const { uploadEncryptedBlobsToZeroG } = await import("@/lib/inft-uploader");
          const { writeINFTRecords } = await import("@/lib/ens-writer");
          const AgentNFTAbi = (await import("@/abi/AgentNFT.json")).default;

          const aesKey = Buffer.from(aesKeyHex.replace("0x", ""), "hex");

          // Step 1: Upload to 0G Storage
          emit({ step: 1, status: "start" });
          const uploadResult = await uploadEncryptedBlobsToZeroG(
            [
              { description: "soul.md", content: soul },
              { description: "skills.json", content: skills ?? "" },
              { description: "config.json", content: config ?? "" },
            ],
            aesKey,
            OG_INDEXER!,
            OG_RPC!,
            DEPLOYER_KEY!
          );
          merkleRoot = uploadResult.merkleRoot;
          storageHashes = uploadResult.intelligentData.map((d) => d.dataHash);
          emit({ step: 1, status: "done", hashes: storageHashes });

          // Step 2: Mint INFT on 0G Chain
          emit({ step: 2, status: "start" });
          const provider = new ethers.JsonRpcProvider(OG_RPC);
          const signer = new ethers.Wallet(DEPLOYER_KEY!, provider);
          const contract = new ethers.Contract(CONTRACT!, AgentNFTAbi, signer);

          const mintTx = await contract.mint(uploadResult.intelligentData, ownerAddress);
          const receipt = await mintTx.wait();

          const transferTopic = ethers.id("Transfer(address,address,uint256)");
          const transferLog = receipt.logs.find(
            (log: { topics: string[] }) => log.topics[0] === transferTopic
          );
          const tid = transferLog ? BigInt(transferLog.topics[3]) : BigInt(1);
          tokenId = tid.toString();
          ogTxHash = receipt.hash;
          emit({ step: 2, status: "done", tokenId, txHash: ogTxHash });

          // Step 3: Write ENS Records
          emit({ step: 3, status: "start" });
          const ensPrivateKey = process.env.ENS_DEPLOYER_PRIVATE_KEY ?? DEPLOYER_KEY!;
          const ethRpcUrl = process.env.ETH_RPC_URL ?? "https://rpc.sepolia.org";
          const ensResult = await writeINFTRecords(agentName, tid, merkleRoot, ensPrivateKey, ethRpcUrl);
          ensTxHash = ensResult.inftTxHash;
          storageTxHash = ensResult.storageTxHash;
          emit({ step: 3, status: "done", txHash: ensTxHash });
        } else {
          // Skip 0G steps -- mark as skipped
          emit({ step: 1, status: "done", skipped: true });
          emit({ step: 2, status: "done", skipped: true });
          emit({ step: 3, status: "done", skipped: true });
        }

        // Step 4: Start agent container via orchestrator
        emit({ step: 4, status: "start" });
        const orchRes = await fetch(`${ORCHESTRATOR_URL}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentName,
            telegramBotToken: telegramBotToken || undefined,
            discordBotToken: discordBotToken || undefined,
            enableWhatsApp: enableWhatsApp || false,
            soul,
            avatarSeed: avatarSeed || undefined,
            avatarBg: avatarBg || undefined,
            model: model || undefined,
            memoryType: memoryType || undefined,
          }),
        });

        if (!orchRes.ok) {
          const errBody = await orchRes.json().catch(() => ({ error: "Unknown orchestrator error" }));
          throw new Error(`Orchestrator: ${errBody.error || orchRes.statusText}`);
        }

        const agentRecord = await orchRes.json();
        emit({
          step: 4,
          status: "done",
          agentId: agentRecord.id,
          hostPort: agentRecord.hostPort,
          walletAddress: agentRecord.walletAddress,
          agentkit: agentRecord.agentkit,
        });

        emit({
          done: true,
          tokenId,
          merkleRoot,
          txHashes: [ogTxHash, ensTxHash, storageTxHash].filter(Boolean),
          storageHashes,
          agent: {
            id: agentRecord.id,
            hostPort: agentRecord.hostPort,
            walletAddress: agentRecord.walletAddress,
            ensName: agentRecord.agentEnsName,
            agentkit: agentRecord.agentkit,
          },
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

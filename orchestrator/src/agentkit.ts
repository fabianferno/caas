import type { AgentkitJob } from "./types.js";
import type { AgentStore } from "./store.js";
import { execInContainer } from "./docker.js";
import { writeAgentkitRecords } from "./ens.js";

// In-memory job tracker: agentId -> job
const jobs = new Map<string, AgentkitJob>();

export function getJob(agentId: string): AgentkitJob | undefined {
  return jobs.get(agentId);
}

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

// Docker multiplexed stream frames have 8-byte headers even with Tty.
// Strip bytes 0x00-0x08 that appear at frame boundaries.
const stripDockerFrameHeaders = (s: string) => s.replace(/[\x00-\x08]/g, "");

function parseLine(job: AgentkitJob, rawLine: string): void {
  const line = stripAnsi(stripDockerFrameHeaders(rawLine));

  const nonceMatch = line.match(/Nonce:\s+(\d+)/);
  if (nonceMatch) {
    job.nonce = nonceMatch[1];
    job.phase = "nonce_lookup";
    return;
  }

  // Agent mode: "HUMAN ACTION REQUIRED: ... https://..."
  // Interactive mode: bare URL on its own line "  https://world.org/verify?..."
  const urlMatch = line.match(/HUMAN ACTION REQUIRED:.*?(https:\/\/\S+)/) ||
    line.match(/^\s*(https:\/\/world\.org\/verify\S+)/);
  if (urlMatch) {
    job.url = urlMatch[1];
    job.phase = "awaiting_scan";
    return;
  }

  if (line.includes("World ID verified")) {
    job.phase = "verifying";
    return;
  }

  const merkleMatch = line.match(/Merkle root:\s+(0x[a-fA-F0-9]+)/);
  if (merkleMatch) {
    job.merkleRoot = merkleMatch[1];
    return;
  }

  const nullifierMatch = line.match(/Nullifier hash:\s+(0x[a-fA-F0-9]+)/);
  if (nullifierMatch) {
    job.nullifierHash = nullifierMatch[1];
    return;
  }

  const txMatch = line.match(/Tx\s+(0x[a-fA-F0-9]+)/);
  if (txMatch) {
    job.txHash = txMatch[1];
    return;
  }

  // Structured JSON output (--agent mode)
  if (line.trimStart().startsWith("{") && line.includes('"agent"')) {
    try {
      const data = JSON.parse(line.trim());
      job.nullifierHash = job.nullifierHash || data.nullifierHash || null;
      job.merkleRoot = job.merkleRoot || data.root || null;
      job.txHash = job.txHash || data.txHash || null;
      job.contract = data.contract || null;
    } catch {
      // not valid JSON, skip
    }
    return;
  }

  if (line.includes("Agent registered on World Chain")) {
    job.phase = "complete";
    return;
  }
}

/**
 * Launch agentkit-cli inside the container and process stdout in the background.
 * Returns a promise that resolves once the World App URL is captured (or 5s timeout).
 * The CLI keeps running in the background -- poll via getJob() for progress.
 * On completion, writes ENS records and updates the agent store.
 */
export async function startRegistration(opts: {
  agentId: string;
  containerId: string;
  walletAddress: string;
  agentEnsName: string;
  agentPrivateKey: string;
  deployerPrivateKey: string;
  ethRpcUrl: string;
  store: AgentStore;
}): Promise<AgentkitJob> {
  const job: AgentkitJob = {
    phase: "starting",
    url: null,
    nonce: null,
    nullifierHash: null,
    merkleRoot: null,
    txHash: null,
    contract: null,
    error: null,
  };
  jobs.set(opts.agentId, job);

  const { stream } = await execInContainer(opts.containerId, [
    "npx", "@worldcoin/agentkit-cli", "register", opts.walletAddress,
  ]);

  let buffer = "";

  stream.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    buffer += text;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.trim()) parseLine(job, line);
    }
  });

  stream.on("end", async () => {
    if (buffer.trim()) parseLine(job, buffer);

    if (job.phase === "complete" && job.nullifierHash) {
      try {
        await writeAgentkitRecords(
          opts.agentEnsName,
          {
            address: opts.walletAddress,
            network: "world",
            nullifierHash: job.nullifierHash,
            merkleRoot: job.merkleRoot || "",
            txHash: job.txHash || "",
            contract: job.contract || "0xA23aB2712eA7BBa896930544C7d6636a96b944dA",
          },
          opts.agentPrivateKey,
          opts.deployerPrivateKey,
          opts.ethRpcUrl,
        );

        const record = opts.store.findById(opts.agentId);
        if (record) {
          record.agentkitRegistered = true;
          opts.store.save(record);
        }
        console.log(`[agentkit] ${opts.agentEnsName}: registered + ENS records written`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        job.phase = "failed";
        job.error = `ENS write failed: ${msg}`;
        console.error(`[agentkit] ${opts.agentEnsName}: ENS write failed:`, err);
      }
    } else if (job.phase !== "complete") {
      job.phase = "failed";
      job.error = job.error || "CLI exited without successful registration";
    }
  });

  // Wait up to 30s for the URL to appear before returning
  const deadline = Date.now() + 30000;
  while (!job.url && job.phase !== "failed" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }

  return job;
}

import { Router } from "express";
import { createECDH, createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { AgentStore } from "./store.js";
import type { OrchestratorConfig } from "./config.js";
import type { CreateAgentRequest, ResolvedAgentEnv } from "./types.js";
import {
  buildAgentImage,
  imageExists,
  createAndStartContainer,
  stopAndRemoveContainer,
  restartContainer,
  getContainerStatus,
  getContainerLogs,
} from "./docker.js";
import { startRegistration, getJob } from "./agentkit.js";

export function generateWallet(): { privateKey: string; address: string } {
  const privKeyBytes = randomBytes(32);
  const privateKey = `0x${privKeyBytes.toString("hex")}`;

  // Derive a deterministic identifier from the public key.
  // Node does not have keccak256 built-in (sha3-256 is NIST, not keccak).
  // We use SHA-256 of the uncompressed public key as a display address.
  // The agent itself derives the real Ethereum address via ethers/viem at runtime.
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(privKeyBytes);
  const uncompressedPubKey = ecdh.getPublicKey();
  const pubKeyBody = uncompressedPubKey.subarray(1); // strip 0x04 prefix
  const hash = createHash("sha256").update(pubKeyBody).digest();
  const address = `0x${hash.subarray(hash.length - 20).toString("hex")}`;

  return { privateKey, address };
}

export function createRouter(store: AgentStore, config: OrchestratorConfig): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", agents: store.list().length });
  });

  router.post("/agents", async (req, res) => {
    try {
      const body = req.body as Partial<CreateAgentRequest>;

      if (!body.agentName) {
        res.status(400).json({ error: "agentName is required" });
        return;
      }

      if (store.findByName(body.agentName)) {
        res.status(409).json({ error: "agent with that name already exists" });
        return;
      }

      const hostPort = store.nextPort(config.portRangeStart);
      if (hostPort >= config.portRangeEnd) {
        res.status(503).json({ error: "port range exhausted" });
        return;
      }

      if (!(await imageExists(config.agentImageName))) {
        await buildAgentImage(config.agentDockerfilePath, config.agentImageName);
      }

      // Generate a fresh keypair for this agent
      const wallet = generateWallet();
      const agentEnsName = body.agentEnsName || `${body.agentName}.caas.eth`;

      // Merge per-agent fields with shared orchestrator config
      const resolvedEnv: ResolvedAgentEnv = {
        agentName: body.agentName,
        agentEnsName,
        agentPrivateKey: wallet.privateKey,
        deployerPrivateKey: config.deployerPrivateKey,
        rpcUrl: config.rpcUrl,
        ethRpcUrl: config.ethRpcUrl,
        awsAccessKeyId: config.awsAccessKeyId,
        awsSecretAccessKey: config.awsSecretAccessKey,
        awsRegion: config.awsRegion,
        bedrockModel: config.bedrockModel,
        shellAllowlist: config.shellAllowlist,
        heartbeatInterval: config.heartbeatInterval,
        telegramBotToken: body.telegramBotToken,
        discordBotToken: body.discordBotToken,
        enableWhatsApp: body.enableWhatsApp ?? false,
      };

      const volumePath = path.join(config.dataDir, "volumes", body.agentName);
      fs.mkdirSync(path.join(volumePath, "data", "memory"), { recursive: true });
      fs.mkdirSync(path.join(volumePath, "skills"), { recursive: true });

      const containerId = await createAndStartContainer(
        config.agentImageName,
        resolvedEnv,
        hostPort,
        volumePath,
        config.containerNetwork,
      );

      const record = {
        id: randomUUID(),
        agentName: body.agentName,
        agentEnsName,
        status: "running" as const,
        hostPort,
        createdAt: new Date().toISOString(),
        containerId,
        walletAddress: wallet.address,
        agentkitRegistered: false,
      };

      store.save(record);

      // Launch agentkit registration inside the container (non-blocking).
      // Waits up to 5s for the World App URL, then returns.
      let agentkitUrl: string | null = null;
      let agentkitPhase: string = "starting";
      try {
        const job = await startRegistration({
          agentId: record.id,
          containerId,
          walletAddress: wallet.address,
          agentEnsName,
          agentPrivateKey: wallet.privateKey,
          deployerPrivateKey: config.deployerPrivateKey,
          ethRpcUrl: config.ethRpcUrl,
          store,
        });
        agentkitUrl = job.url;
        agentkitPhase = job.phase;
      } catch (err) {
        console.error(`[agentkit] Failed to start registration for ${body.agentName}:`, err);
        agentkitPhase = "failed";
      }

      res.status(201).json({
        ...record,
        agentkit: {
          phase: agentkitPhase,
          url: agentkitUrl,
        },
      });
    } catch (err) {
      console.error("[POST /agents]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  router.get("/agents", async (_req, res) => {
    try {
      const records = store.list();
      const results = await Promise.all(
        records.map(async (r) => {
          const liveStatus = await getContainerStatus(r.containerId);
          if (liveStatus !== r.status) {
            store.updateStatus(r.id, liveStatus);
          }
          return { ...r, status: liveStatus };
        }),
      );
      res.json(results);
    } catch (err) {
      console.error("[GET /agents]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  router.get("/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = store.findById(id) ?? store.findByName(id);
      if (!record) {
        res.status(404).json({ error: "agent not found" });
        return;
      }
      const liveStatus = await getContainerStatus(record.containerId);
      if (liveStatus !== record.status) {
        store.updateStatus(record.id, liveStatus);
      }
      res.json({ ...record, status: liveStatus });
    } catch (err) {
      console.error("[GET /agents/:id]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  router.delete("/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = store.findById(id) ?? store.findByName(id);
      if (!record) {
        res.status(404).json({ error: "agent not found" });
        return;
      }
      await stopAndRemoveContainer(record.containerId);
      store.remove(record.id);
      res.status(204).end();
    } catch (err) {
      console.error("[DELETE /agents/:id]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  router.post("/agents/:id/restart", async (req, res) => {
    try {
      const { id } = req.params;
      const record = store.findById(id) ?? store.findByName(id);
      if (!record) {
        res.status(404).json({ error: "agent not found" });
        return;
      }
      await restartContainer(record.containerId);
      store.updateStatus(record.id, "running");
      res.json({ ...record, status: "running" });
    } catch (err) {
      console.error("[POST /agents/:id/restart]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  router.get("/agents/:id/logs", async (req, res) => {
    try {
      const { id } = req.params;
      const record = store.findById(id) ?? store.findByName(id);
      if (!record) {
        res.status(404).json({ error: "agent not found" });
        return;
      }
      const tail = req.query.tail !== undefined ? parseInt(req.query.tail as string, 10) : 100;
      const logs = await getContainerLogs(record.containerId, tail);
      res.json({ logs });
    } catch (err) {
      console.error("[GET /agents/:id/logs]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  router.get("/agents/:id/agentkit-status", (req, res) => {
    try {
      const { id } = req.params;
      const record = store.findById(id) ?? store.findByName(id);
      if (!record) {
        res.status(404).json({ error: "agent not found" });
        return;
      }

      if (record.agentkitRegistered) {
        res.json({ phase: "complete", registered: true, address: record.walletAddress });
        return;
      }

      const job = getJob(record.id);
      if (!job) {
        res.json({ phase: "not_started", registered: false });
        return;
      }

      res.json({
        phase: job.phase,
        registered: job.phase === "complete",
        url: job.url,
        nonce: job.nonce,
        nullifierHash: job.nullifierHash,
        txHash: job.txHash,
        error: job.error,
      });
    } catch (err) {
      console.error("[GET /agents/:id/agentkit-status]", err);
      res.status(500).json({ error: "internal server error" });
    }
  });

  return router;
}

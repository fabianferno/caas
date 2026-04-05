import express from "express";
import { loadConfig } from "./config.js";
import { AgentStore } from "./store.js";
import { createRouter } from "./routes.js";

const config = loadConfig();
const store = new AgentStore(config.dataDir);
const app = express();

app.use(express.json());
app.use(createRouter(store, config));

const server = app.listen(config.port, () => {
  console.log(`[orchestrator] Listening on port ${config.port}`);
  console.log(`[orchestrator] Agent image: ${config.agentImageName}`);
  console.log(`[orchestrator] Agent Dockerfile: ${config.agentDockerfilePath}`);
  console.log(`[orchestrator] Port range: ${config.portRangeStart}-${config.portRangeEnd}`);
  console.log(`[orchestrator] Data dir: ${config.dataDir}`);
  console.log(`[orchestrator] Tracking ${store.list().length} existing agents`);
});

const shutdown = () => {
  console.log("\n[orchestrator] Shutting down...");
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

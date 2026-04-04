import { loadConfig } from "./config.js";
import { ToolRegistry } from "./core/tools.js";
import { ZeroGLLMProvider, BedrockLLMProvider, FallbackLLMProvider } from "./core/llm.js";
import { AgentLoop } from "./core/agent.js";
import { TelegramChannel } from "./channels/telegram.js";
import { DiscordChannel } from "./channels/discord.js";
import { WhatsAppChannel } from "./channels/whatsapp.js";
import { WebChatChannel } from "./channels/webchat.js";
import type { Channel, IncomingMessage } from "./channels/types.js";
import { readENSRecords, buildSystemPrompt } from "./memory/ens.js";
import { ZeroGMemory } from "./memory/zerog.js";
import { MarkdownMemory } from "./memory/markdown.js";
import { ShellTool } from "./tools/shell.js";
import { WebSearchTool } from "./tools/web-search.js";
import { Scheduler } from "./tools/scheduler.js";
import { MCPBridge } from "./tools/mcp-bridge.js";
import { SkillsManager } from "./tools/skills.js";
import { Heartbeat } from "./heartbeat/index.js";

async function main() {
  console.log("Gravity Claw agent starting...");
  const config = loadConfig();

  // Tool Registry
  const tools = new ToolRegistry();

  // LLM Provider (0G Compute primary, Bedrock fallback)
  const zeroG = new ZeroGLLMProvider({ privateKey: config.agentPrivateKey, rpcUrl: config.rpcUrl });
  const bedrock = new BedrockLLMProvider({
    region: config.awsRegion,
    accessKeyId: config.awsAccessKeyId || "",
    secretAccessKey: config.awsSecretAccessKey || "",
    model: config.bedrockModel,
  });
  const llm = new FallbackLLMProvider(zeroG, bedrock);
  await llm.initialize();

  // Memory
  const memory = new ZeroGMemory({ privateKey: config.agentPrivateKey, rpcUrl: config.rpcUrl, maxConversations: 50 });
  await memory.initialize();

  const markdownMemory = new MarkdownMemory("./data/memory");
  for (const tool of markdownMemory.registerTools()) tools.register(tool);

  // ENS Soul
  let systemPrompt = "You are a helpful AI assistant.";
  try {
    const ensData = await readENSRecords(config.agentEnsName, config.rpcUrl);
    systemPrompt = buildSystemPrompt({ soul: ensData.soul, personality: ensData.personality, skills: [] });
    console.log(`[ens] Loaded soul for ${config.agentEnsName}`);
  } catch (err) {
    console.warn("[ens] Could not read ENS records, using default prompt:", err);
  }

  // Skills
  const skillsManager = new SkillsManager("./skills");
  skillsManager.loadAll();
  skillsManager.startWatching();
  console.log(`[skills] Loaded ${skillsManager.getAll().length} skills`);

  // Built-in Tools
  tools.register(new ShellTool(config.shellAllowlist).registerTool());
  tools.register(new WebSearchTool().registerTool());

  // Message handler (forward declaration for scheduler)
  const channels: Channel[] = [];

  const handleSyntheticMessage = (text: string) => {
    handleMessage({
      channelName: "system",
      conversationId: "system",
      userId: "system",
      text,
    });
  };

  const scheduler = new Scheduler("./data", handleSyntheticMessage);
  for (const tool of scheduler.registerTools()) tools.register(tool);

  // MCP Bridge
  const mcpBridge = new MCPBridge(config.mcpConfigPath);
  const mcpTools = await mcpBridge.initialize();
  for (const tool of mcpTools) tools.register(tool);
  if (mcpTools.length > 0) console.log(`[mcp] Registered ${mcpTools.length} MCP tools`);

  // Agent Loop
  const agent = new AgentLoop({ llm, tools, systemPrompt });

  // Message Handler
  async function handleMessage(msg: IncomingMessage) {
    const conv = memory.getOrCreateConversation(msg.conversationId, msg.channelName, msg.userId);

    const matchedSkills = skillsManager.match(msg.text);
    if (matchedSkills.length > 0) {
      const skillInstructions = matchedSkills.map((s) => s.content);
      agent.updateSystemPrompt(buildSystemPrompt({ soul: systemPrompt, personality: null, skills: skillInstructions }));
    } else {
      agent.updateSystemPrompt(systemPrompt);
    }

    const history = memory.getHistory(msg.conversationId);

    try {
      const response = await agent.run(msg.text, history);
      memory.addMessage(msg.conversationId, { role: "user", content: msg.text });
      memory.addMessage(msg.conversationId, { role: "assistant", content: response.text });
      memory.persist(msg.conversationId).catch(console.error);

      const channel = channels.find((c) => c.name === msg.channelName);
      if (channel) await channel.send(msg.conversationId, response);
    } catch (err: any) {
      console.error("[agent] Error processing message:", err);
      const channel = channels.find((c) => c.name === msg.channelName);
      if (channel) {
        const errMsg = err?.message || String(err);
        let userMessage = "Sorry, I encountered an error processing your message.";
        if (errMsg.includes("not reachable") || errMsg.includes("fetch failed")) {
          userMessage = "The AI inference provider (0G Compute) is currently unavailable. The testnet providers may be offline. Please try again later.";
        }
        await channel.send(msg.conversationId, { text: userMessage });
      }
    }
  }

  // Channels
  if (config.telegramBotToken) {
    const telegram = new TelegramChannel({ token: config.telegramBotToken, allowedUserIds: config.allowedUserIds });
    telegram.onMessage(handleMessage);
    channels.push(telegram);
  }

  if (config.discordBotToken) {
    const discord = new DiscordChannel({ token: config.discordBotToken, allowedUserIds: config.allowedUserIds });
    discord.onMessage(handleMessage);
    channels.push(discord);
  }

  if (config.enableWhatsApp) {
    const whatsapp = new WhatsAppChannel({ sessionDir: "./data/whatsapp-session", allowedUserIds: config.allowedUserIds });
    whatsapp.onMessage(handleMessage);
    channels.push(whatsapp);
  }

  if (config.enableWeb) {
    const webchat = new WebChatChannel({ port: config.webPort });
    webchat.onMessage(handleMessage);
    channels.push(webchat);
  }

  for (const channel of channels) {
    try { await channel.start(); } catch (err) { console.error(`[${channel.name}] Failed to start:`, err); }
  }

  console.log(`[agent] Ready. Channels: ${channels.map((c) => c.name).join(", ")}`);
  console.log(`[agent] Tools: ${tools.names().join(", ")}`);

  // Heartbeat
  const heartbeat = new Heartbeat({
    intervalMs: config.heartbeatInterval,
    onEvent: (summary) => handleSyntheticMessage(`[Heartbeat event]\n${summary}`),
  });
  heartbeat.start();

  // Graceful Shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    heartbeat.stop();
    scheduler.stopAll();
    skillsManager.stopWatching();
    await mcpBridge.shutdown();
    for (const channel of channels) await channel.stop().catch(console.error);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });

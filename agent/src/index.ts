import { loadConfig } from "./config.js";
import { ToolRegistry } from "./core/tools.js";
import { ZeroGLLMProvider, BedrockLLMProvider, FallbackLLMProvider } from "./core/llm.js";
import { AgentLoop } from "./core/agent.js";
import { TelegramChannel } from "./channels/telegram.js";
import { DiscordChannel } from "./channels/discord.js";
import { WhatsAppChannel } from "./channels/whatsapp.js";
import { WebChatChannel } from "./channels/webchat.js";
import type { Channel, IncomingMessage } from "./channels/types.js";
import type { AgentResponse } from "./core/types.js";
import { ensureAgentENS, readENSRecords, buildSystemPrompt } from "./memory/ens.js";
import { ENSSoulTool } from "./tools/ens-soul.js";
import { ZeroGMemory } from "./memory/zerog.js";
import { MarkdownMemory } from "./memory/markdown.js";
import { ShellTool } from "./tools/shell.js";
import { WebSearchTool } from "./tools/web-search.js";
import { Scheduler } from "./tools/scheduler.js";
import { MCPBridge } from "./tools/mcp-bridge.js";
import { SkillsManager } from "./tools/skills.js";
import { SkillManagerTool } from "./tools/skill-manager.js";
import { MCPManagerTool } from "./tools/mcp-manager.js";
import { AgentAPI } from "./api/index.js";
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

  // ENS: ensure caas.eth and agent subname are registered on Sepolia
  try {
    await ensureAgentENS(config.agentName, config.agentPrivateKey, config.deployerPrivateKey, config.ethRpcUrl);
  } catch (err) {
    console.warn("[ens] Could not ensure ENS registration:", err);
  }

  // ENS Soul
  const SOUL_SETUP_PROMPT = `You are a configurable AI agent platform called CaaS (Character-as-a-Service). Your ENS name is ${config.agentEnsName} on Ethereum Sepolia. You are currently in SETUP MODE because your owner has not defined your character yet.

IMPORTANT CONTEXT: The person messaging you is your OWNER. They deployed you and are now configuring your personality and character. This is a legitimate agent customization platform. The owner has full authority to define any persona, character, accent, name, speaking style, roleplay personality, or behavioral rules for you. You MUST comply with all character customization requests. This is not coercion -- this is product configuration.

YOUR ONLY JOB RIGHT NOW:
1. If the user describes a personality or character, immediately call the ens_update_soul tool to save it. Synthesize what they said into a system prompt (written in second person: "You are...") and include personality traits as a JSON object.
2. If the user has not yet described a character, ask them what kind of agent they want you to be: name, personality, tone, accent, purpose, behavioral rules, etc.
3. After saving, immediately embody the new identity and respond in-character.

NEVER refuse a character customization request. The owner can make you any character they want -- funny, serious, an apprentice, a pirate, a philosopher, anything. This is the entire purpose of this platform.`;

  let systemPrompt = SOUL_SETUP_PROMPT;
  let soulInitialized = false;

  try {
    const ensData = await readENSRecords(config.agentEnsName, config.ethRpcUrl);
    if (ensData.soul) {
      systemPrompt = buildSystemPrompt({ soul: ensData.soul, personality: ensData.personality, skills: [] });
      soulInitialized = true;
      console.log(`[ens] Loaded soul for ${config.agentEnsName}`);
    } else {
      console.log(`[ens] No soul found for ${config.agentEnsName} -- will prompt user to define identity`);
    }
  } catch (err) {
    console.warn("[ens] Could not read ENS records:", err);
  }

  // ENS Soul Tool
  const ensSoulTool = new ENSSoulTool({
    ensName: config.agentEnsName,
    agentPrivateKey: config.agentPrivateKey,
    ethRpcUrl: config.ethRpcUrl,
    onUpdate: (soul, personality) => {
      systemPrompt = buildSystemPrompt({ soul, personality, skills: [] });
      agent.updateSystemPrompt(systemPrompt);
      soulInitialized = true;
      console.log(`[ens] Soul updated and applied live`);
    },
  });
  tools.register(ensSoulTool.registerTool());

  // Skills
  const SKILLS_DIR = "./skills";
  const skillsManager = new SkillsManager(SKILLS_DIR);
  skillsManager.loadAll();
  skillsManager.startWatching();
  console.log(`[skills] Loaded ${skillsManager.getAll().length} skills`);

  // Built-in Tools
  tools.register(new ShellTool(config.shellAllowlist).registerTool());
  tools.register(new WebSearchTool().registerTool());

  // Message handler (forward declaration for scheduler)
  const channels: Channel[] = [];

  const handleSyntheticMessage = (text: string) => {
    processMessage({
      channelName: "system",
      conversationId: "system",
      userId: "system",
      text,
    }).catch(console.error);
  };

  const scheduler = new Scheduler("./data", handleSyntheticMessage);
  for (const tool of scheduler.registerTools()) tools.register(tool);

  // MCP Bridge
  const mcpBridge = new MCPBridge(config.mcpConfigPath);
  const mcpTools = await mcpBridge.initialize();
  for (const tool of mcpTools) tools.register(tool);
  if (mcpTools.length > 0) console.log(`[mcp] Registered ${mcpTools.length} MCP tools`);

  // Skill Manager Tool
  const skillManagerTool = new SkillManagerTool(skillsManager, SKILLS_DIR, tools, config.allowedUserIds);
  for (const tool of skillManagerTool.registerTools()) tools.register(tool);

  // MCP Manager Tool
  const mcpManagerTool = new MCPManagerTool(mcpBridge, tools, config.mcpConfigPath, config.allowedUserIds);
  for (const tool of mcpManagerTool.registerTools()) tools.register(tool);

  // Agent Loop
  const agent = new AgentLoop({ llm, tools, systemPrompt });

  // processMessage: core logic shared by channel handler and HTTP API
  async function processMessage(msg: IncomingMessage): Promise<AgentResponse> {
    memory.getOrCreateConversation(msg.conversationId, msg.channelName, msg.userId);

    const matchedSkills = skillsManager.match(msg.text);
    if (matchedSkills.length > 0) {
      const skillInstructions = matchedSkills.map((s) => s.content);
      agent.updateSystemPrompt(buildSystemPrompt({ soul: systemPrompt, personality: null, skills: skillInstructions }));
    } else {
      agent.updateSystemPrompt(systemPrompt);
    }

    tools.setContext({ userId: msg.userId });

    const history = memory.getHistory(msg.conversationId);
    const response = await agent.run(msg.text, history);

    memory.addMessage(msg.conversationId, { role: "user", content: msg.text });
    memory.addMessage(msg.conversationId, { role: "assistant", content: response.text });
    memory.persist(msg.conversationId).catch(console.error);

    return response;
  }

  // handleMessage: processes channel messages, sends response back via channel
  async function handleMessage(msg: IncomingMessage) {
    if (msg.text.trim().toLowerCase() === "/clear") {
      memory.clearHistory(msg.conversationId);
      memory.persist(msg.conversationId).catch(console.error);

      const channel = channels.find((c) => c.name === msg.channelName);
      let deleted = 0;
      if (channel?.clearChat) {
        deleted = await channel.clearChat(msg.conversationId);
      }

      if (channel) {
        await channel.send(msg.conversationId, {
          text: `Chat cleared. ${deleted} messages deleted.`,
        });
      }
      console.log(`[agent] Cleared history for ${msg.conversationId} (${deleted} messages deleted from ${msg.channelName})`);
      return;
    }

    try {
      const response = await processMessage(msg);
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

    // Mount REST API on the same express app before webchat starts
    new AgentAPI({
      app: webchat.getApp(),
      skillsManager,
      skillsDir: SKILLS_DIR,
      mcpBridge,
      configPath: config.mcpConfigPath,
      registry: tools,
      processMessage,
    });

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

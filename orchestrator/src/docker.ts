import Dockerode from "dockerode";
import path from "node:path";
import type { ResolvedAgentEnv } from "./types.js";

const docker = new Dockerode();

function buildEnvArray(env: ResolvedAgentEnv): string[] {
  const vars: string[] = [
    `AGENT_PRIVATE_KEY=${env.agentPrivateKey}`,
    `AGENT_NAME=${env.agentName}`,
    `AGENT_ENS_NAME=${env.agentEnsName}`,
    `DEPLOYER_PRIVATE_KEY=${env.deployerPrivateKey}`,
    `RPC_URL=${env.rpcUrl}`,
    `ETH_RPC_URL=${env.ethRpcUrl}`,
    `ENABLE_WEB=true`,
    `WEB_PORT=3001`,
    `AWS_ACCESS_KEY_ID=${env.awsAccessKeyId}`,
    `AWS_SECRET_ACCESS_KEY=${env.awsSecretAccessKey}`,
    `AWS_REGION=${env.awsRegion}`,
    `BEDROCK_MODEL=${env.bedrockModel}`,
    `SHELL_ALLOWLIST=${env.shellAllowlist}`,
    `HEARTBEAT_INTERVAL=${env.heartbeatInterval}`,
    `ENABLE_WHATSAPP=${env.enableWhatsApp}`,
  ];

  if (env.telegramBotToken) {
    vars.push(`TELEGRAM_BOT_TOKEN=${env.telegramBotToken}`);
  }
  if (env.discordBotToken) {
    vars.push(`DISCORD_BOT_TOKEN=${env.discordBotToken}`);
  }

  return vars;
}

export async function buildAgentImage(
  agentDir: string,
  imageName: string
): Promise<void> {
  const stream = await docker.buildImage(
    { context: agentDir, src: ["."] },
    { t: imageName, rm: true }
  );

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function imageExists(imageName: string): Promise<boolean> {
  try {
    await docker.getImage(imageName).inspect();
    return true;
  } catch {
    return false;
  }
}

export async function createAndStartContainer(
  imageName: string,
  env: ResolvedAgentEnv,
  hostPort: number,
  volumePath: string,
  network?: string
): Promise<string> {
  const container = await docker.createContainer({
    Image: imageName,
    name: `caas-${env.agentName}`,
    Env: buildEnvArray(env),
    ExposedPorts: {
      "3001/tcp": {},
    },
    HostConfig: {
      PortBindings: {
        "3001/tcp": [{ HostPort: hostPort.toString() }],
      },
      Binds: [
        `${path.resolve(volumePath)}/data:/app/data`,
        `${path.resolve(volumePath)}/skills:/app/skills`,
      ],
      RestartPolicy: { Name: "unless-stopped" },
      NetworkMode: network,
    },
    Labels: {
      "caas.managed": "true",
      "caas.agent": env.agentName,
    },
  });

  await container.start();
  return container.id;
}

export async function stopAndRemoveContainer(
  containerId: string
): Promise<void> {
  const container = docker.getContainer(containerId);
  try {
    await container.stop();
  } catch {
    // container may already be stopped
  }
  await container.remove();
}

export async function restartContainer(containerId: string): Promise<void> {
  await docker.getContainer(containerId).restart();
}

export async function getContainerStatus(
  containerId: string
): Promise<"running" | "stopped" | "error"> {
  try {
    const info = await docker.getContainer(containerId).inspect();
    const state = info.State.Status;
    if (state === "running") return "running";
    if (state === "exited" || state === "stopped" || state === "created" || state === "paused") {
      return "stopped";
    }
    return "error";
  } catch {
    return "error";
  }
}

export async function getContainerLogs(
  containerId: string,
  tail = 100
): Promise<string> {
  const buffer = await docker.getContainer(containerId).logs({
    stdout: true,
    stderr: true,
    tail,
  });
  return buffer.toString("utf8");
}

export async function execInContainer(
  containerId: string,
  cmd: string[],
): Promise<{ stream: NodeJS.ReadableStream; inspect: () => Promise<{ ExitCode: number }> }> {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  return {
    stream,
    inspect: () => exec.inspect().then((info) => ({ ExitCode: info.ExitCode ?? -1 })),
  };
}

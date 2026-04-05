import fs from "node:fs";
import path from "node:path";
import type { AgentRecord } from "./types.js";

export class AgentStore {
  private filePath: string;
  private agents: AgentRecord[] = [];

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, "agents.json");
    this.load();
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      this.agents = JSON.parse(raw);
    } catch {
      this.agents = [];
    }
  }

  private flush(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.agents, null, 2));
  }

  list(): AgentRecord[] {
    return [...this.agents];
  }

  findByName(name: string): AgentRecord | undefined {
    return this.agents.find((a) => a.agentName === name);
  }

  findById(id: string): AgentRecord | undefined {
    return this.agents.find((a) => a.id === id);
  }

  save(record: AgentRecord): void {
    const idx = this.agents.findIndex((a) => a.id === record.id);
    if (idx >= 0) {
      this.agents[idx] = record;
    } else {
      this.agents.push(record);
    }
    this.flush();
  }

  remove(id: string): void {
    this.agents = this.agents.filter((a) => a.id !== id);
    this.flush();
  }

  nextPort(startPort: number): number {
    const usedPorts = new Set(this.agents.map((a) => a.hostPort));
    let port = startPort;
    while (usedPorts.has(port)) port++;
    return port;
  }

  updateStatus(id: string, status: AgentRecord["status"]): void {
    const agent = this.findById(id);
    if (agent) {
      agent.status = status;
      this.save(agent);
    }
  }
}

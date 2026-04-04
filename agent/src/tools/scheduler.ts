import cron from "node-cron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { RegisteredTool } from "../core/tools.js";

export interface ScheduledTask {
  id: string;
  cronExpr: string;
  action: string;
  paused: boolean;
  createdAt: string;
}

export class Scheduler {
  private tasks = new Map<string, ScheduledTask>();
  private cronJobs = new Map<string, cron.ScheduledTask>();
  private dataDir: string;
  private onTrigger: (action: string) => void;

  constructor(dataDir: string, onTrigger: (action: string) => void) {
    this.dataDir = dataDir;
    this.onTrigger = onTrigger;
    this.loadFromDisk();
  }

  private get filePath(): string {
    return path.join(this.dataDir, "schedules.json");
  }

  private loadFromDisk(): void {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const tasks: ScheduledTask[] = JSON.parse(data);
      for (const task of tasks) {
        this.tasks.set(task.id, task);
        if (!task.paused) this.startCron(task);
      }
    } catch {}
  }

  private saveToDisk(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const data = JSON.stringify(Array.from(this.tasks.values()), null, 2);
    fs.writeFileSync(this.filePath, data, "utf-8");
  }

  private startCron(task: ScheduledTask): void {
    const job = cron.schedule(task.cronExpr, () => { this.onTrigger(task.action); });
    this.cronJobs.set(task.id, job);
  }

  create(cronExpr: string, action: string): string {
    const id = crypto.randomUUID().slice(0, 8);
    const task: ScheduledTask = { id, cronExpr, action, paused: false, createdAt: new Date().toISOString() };
    this.tasks.set(id, task);
    this.startCron(task);
    this.saveToDisk();
    return id;
  }

  list(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  pause(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.paused = true;
    this.cronJobs.get(id)?.stop();
    this.saveToDisk();
  }

  resume(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.paused = false;
    this.cronJobs.get(id)?.start();
    this.saveToDisk();
  }

  remove(id: string): void {
    this.cronJobs.get(id)?.stop();
    this.cronJobs.delete(id);
    this.tasks.delete(id);
    this.saveToDisk();
  }

  stopAll(): void {
    for (const job of this.cronJobs.values()) job.stop();
    this.cronJobs.clear();
  }

  static naturalToCron(text: string): string {
    const lower = text.toLowerCase().trim();
    const everyNMin = lower.match(/every\s+(\d+)\s+minutes?/);
    if (everyNMin) return `*/${everyNMin[1]} * * * *`;
    if (lower === "every hour") return "0 * * * *";
    const dailyAt = lower.match(/every\s+day\s+at\s+(\d{1,2})\s*(am|pm)?/);
    if (dailyAt) {
      let hour = parseInt(dailyAt[1], 10);
      if (dailyAt[2] === "pm" && hour < 12) hour += 12;
      if (dailyAt[2] === "am" && hour === 12) hour = 0;
      return `0 ${hour} * * *`;
    }
    if (lower === "every minute") return "* * * * *";
    return text;
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "schedule-create",
        description: 'Create a scheduled task. Accepts cron expression or natural language like "every day at 9am".',
        parameters: {
          type: "object",
          properties: {
            schedule: { type: "string", description: "Cron expression or natural language" },
            action: { type: "string", description: "What to do when triggered" },
          },
          required: ["schedule", "action"],
        },
        handler: async (args: any) => {
          const cronExpr = Scheduler.naturalToCron(args.schedule);
          if (!cron.validate(cronExpr)) return `Invalid schedule: "${args.schedule}" -> "${cronExpr}"`;
          const id = this.create(cronExpr, args.action);
          return `Created schedule ${id}: "${cronExpr}" -> "${args.action}"`;
        },
      },
      {
        name: "schedule-list",
        description: "List all scheduled tasks.",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          const tasks = this.list();
          if (tasks.length === 0) return "No scheduled tasks.";
          return tasks.map((t) => `- ${t.id}: ${t.cronExpr} -> "${t.action}" ${t.paused ? "(paused)" : ""}`).join("\n");
        },
      },
      {
        name: "schedule-delete",
        description: "Delete a scheduled task by ID.",
        parameters: {
          type: "object",
          properties: { id: { type: "string", description: "Task ID to delete" } },
          required: ["id"],
        },
        handler: async (args: any) => { this.remove(args.id); return `Deleted schedule: ${args.id}`; },
      },
    ];
  }
}

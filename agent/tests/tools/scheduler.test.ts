import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Scheduler } from "../../src/tools/scheduler.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Scheduler", () => {
  let dataDir: string;
  let scheduler: Scheduler;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-sched-"));
    scheduler = new Scheduler(dataDir, () => {});
  });

  afterEach(() => {
    scheduler.stopAll();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates a scheduled task", () => {
    const id = scheduler.create("0 9 * * *", "Good morning check");
    expect(id).toBeTruthy();
    const tasks = scheduler.list();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].action).toBe("Good morning check");
  });

  it("pauses and resumes a task", () => {
    const id = scheduler.create("*/5 * * * *", "Ping");
    scheduler.pause(id);
    expect(scheduler.list()[0].paused).toBe(true);
    scheduler.resume(id);
    expect(scheduler.list()[0].paused).toBe(false);
  });

  it("deletes a task", () => {
    const id = scheduler.create("0 * * * *", "Hourly");
    scheduler.remove(id);
    expect(scheduler.list()).toHaveLength(0);
  });

  it("parses natural language to cron", () => {
    expect(Scheduler.naturalToCron("every day at 9am")).toBe("0 9 * * *");
    expect(Scheduler.naturalToCron("every hour")).toBe("0 * * * *");
    expect(Scheduler.naturalToCron("every 5 minutes")).toBe("*/5 * * * *");
  });
});

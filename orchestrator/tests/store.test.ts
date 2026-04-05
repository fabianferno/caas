import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentStore } from "../src/store.js";
import type { AgentRecord } from "../src/types.js";

function makeRecord(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    id: "agent-1",
    agentName: "test-agent",
    agentEnsName: "test-agent.caas.eth",
    status: "stopped",
    hostPort: 5000,
    createdAt: new Date().toISOString(),
    containerId: "container-abc",
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    ...overrides,
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("AgentStore", () => {
  it("returns empty list when no agents have been saved", () => {
    const store = new AgentStore(tmpDir);
    expect(store.list()).toEqual([]);
  });

  it("saves and retrieves an agent", () => {
    const store = new AgentStore(tmpDir);
    const record = makeRecord();
    store.save(record);
    const list = store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(record);
  });

  it("list returns a copy, not the internal array", () => {
    const store = new AgentStore(tmpDir);
    store.save(makeRecord());
    const list = store.list();
    list.pop();
    expect(store.list()).toHaveLength(1);
  });

  describe("findByName", () => {
    it("finds an agent by name", () => {
      const store = new AgentStore(tmpDir);
      const record = makeRecord({ agentName: "my-agent" });
      store.save(record);
      expect(store.findByName("my-agent")).toEqual(record);
    });

    it("returns undefined when name does not match", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ agentName: "my-agent" }));
      expect(store.findByName("other-agent")).toBeUndefined();
    });
  });

  describe("findById", () => {
    it("finds an agent by id", () => {
      const store = new AgentStore(tmpDir);
      const record = makeRecord({ id: "xyz-123" });
      store.save(record);
      expect(store.findById("xyz-123")).toEqual(record);
    });

    it("returns undefined when id does not match", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "xyz-123" }));
      expect(store.findById("does-not-exist")).toBeUndefined();
    });
  });

  describe("remove", () => {
    it("removes an agent by id", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "a1" }));
      store.save(makeRecord({ id: "a2", agentName: "agent-2", hostPort: 5001 }));
      store.remove("a1");
      const list = store.list();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("a2");
    });

    it("is a no-op when id does not exist", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord());
      store.remove("no-such-id");
      expect(store.list()).toHaveLength(1);
    });
  });

  describe("nextPort", () => {
    it("returns startPort when no agents exist", () => {
      const store = new AgentStore(tmpDir);
      expect(store.nextPort(5000)).toBe(5000);
    });

    it("skips ports already in use", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "a1", hostPort: 5000 }));
      store.save(makeRecord({ id: "a2", agentName: "agent-2", hostPort: 5001 }));
      expect(store.nextPort(5000)).toBe(5002);
    });

    it("handles gaps in port allocation", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "a1", hostPort: 5000 }));
      store.save(makeRecord({ id: "a2", agentName: "agent-2", hostPort: 5002 }));
      expect(store.nextPort(5000)).toBe(5001);
    });
  });

  describe("updateStatus", () => {
    it("updates the status of an existing agent", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "a1", status: "stopped" }));
      store.updateStatus("a1", "running");
      expect(store.findById("a1")?.status).toBe("running");
    });

    it("is a no-op when id does not exist", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "a1", status: "stopped" }));
      store.updateStatus("no-such-id", "running");
      expect(store.findById("a1")?.status).toBe("stopped");
    });
  });

  describe("persistence", () => {
    it("survives across store instances (same data dir)", () => {
      const store1 = new AgentStore(tmpDir);
      const record = makeRecord({ id: "persist-1", agentName: "persist-agent" });
      store1.save(record);

      const store2 = new AgentStore(tmpDir);
      const loaded = store2.findById("persist-1");
      expect(loaded).toEqual(record);
    });

    it("persists multiple agents and removal across instances", () => {
      const store1 = new AgentStore(tmpDir);
      store1.save(makeRecord({ id: "p1", agentName: "agent-p1", hostPort: 5000 }));
      store1.save(makeRecord({ id: "p2", agentName: "agent-p2", hostPort: 5001 }));
      store1.remove("p1");

      const store2 = new AgentStore(tmpDir);
      expect(store2.list()).toHaveLength(1);
      expect(store2.findById("p2")).toBeDefined();
      expect(store2.findById("p1")).toBeUndefined();
    });
  });

  describe("upsert behavior", () => {
    it("overwrites existing record when saving same id", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "u1", status: "stopped", hostPort: 5000 }));
      store.save(makeRecord({ id: "u1", status: "running", hostPort: 5000 }));
      expect(store.list()).toHaveLength(1);
      expect(store.findById("u1")?.status).toBe("running");
    });

    it("adds a new record when id is different", () => {
      const store = new AgentStore(tmpDir);
      store.save(makeRecord({ id: "u1", agentName: "agent-1", hostPort: 5000 }));
      store.save(makeRecord({ id: "u2", agentName: "agent-2", hostPort: 5001 }));
      expect(store.list()).toHaveLength(2);
    });
  });

  it("creates data directory if it does not exist", () => {
    const nested = path.join(tmpDir, "deeply", "nested", "dir");
    expect(fs.existsSync(nested)).toBe(false);
    new AgentStore(nested);
    expect(fs.existsSync(nested)).toBe(true);
  });
});

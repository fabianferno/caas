import fs from "node:fs";
import path from "node:path";
import { Router } from "express";

export interface Guardrail {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export class GuardrailStore {
  private filePath: string;
  private guardrails: Guardrail[] = [];
  private onChange: () => void;

  constructor(dataDir: string, onChange: () => void) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, "guardrails.json");
    this.onChange = onChange;
    this.load();
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      this.guardrails = JSON.parse(raw);
    } catch {
      this.guardrails = [];
    }
  }

  private flush(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.guardrails, null, 2));
    this.onChange();
  }

  list(): Guardrail[] {
    return [...this.guardrails];
  }

  get(key: string): Guardrail | undefined {
    return this.guardrails.find((g) => g.key === key);
  }

  set(key: string, value: string): Guardrail {
    const now = new Date().toISOString();
    const existing = this.guardrails.find((g) => g.key === key);
    if (existing) {
      existing.value = value;
      existing.updatedAt = now;
      this.flush();
      return existing;
    }
    const guardrail: Guardrail = { key, value, createdAt: now, updatedAt: now };
    this.guardrails.push(guardrail);
    this.flush();
    return guardrail;
  }

  remove(key: string): boolean {
    const idx = this.guardrails.findIndex((g) => g.key === key);
    if (idx < 0) return false;
    this.guardrails.splice(idx, 1);
    this.flush();
    return true;
  }

  toPromptBlock(): string {
    if (this.guardrails.length === 0) return "";
    const rules = this.guardrails
      .map((g) => `- **${g.key}**: ${g.value}`)
      .join("\n");
    return `\n## Critical Rules\n\nYou MUST follow these rules at all times. They override any other instructions.\n\n${rules}`;
  }
}

export function createGuardrailRouter(store: GuardrailStore): Router {
  const router = Router();

  router.get("/guardrails", (_req, res) => {
    res.json(store.list());
  });

  router.get("/guardrails/:key", (req, res) => {
    const guardrail = store.get(req.params.key);
    if (!guardrail) {
      res.status(404).json({ error: "guardrail not found" });
      return;
    }
    res.json(guardrail);
  });

  router.post("/guardrails", (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) {
      res.status(400).json({ error: "key and value are required" });
      return;
    }
    const guardrail = store.set(key, value);
    res.status(201).json(guardrail);
  });

  router.put("/guardrails/:key", (req, res) => {
    const { value } = req.body;
    if (!value) {
      res.status(400).json({ error: "value is required" });
      return;
    }
    const existing = store.get(req.params.key);
    if (!existing) {
      res.status(404).json({ error: "guardrail not found" });
      return;
    }
    const guardrail = store.set(req.params.key, value);
    res.json(guardrail);
  });

  router.delete("/guardrails/:key", (req, res) => {
    const removed = store.remove(req.params.key);
    if (!removed) {
      res.status(404).json({ error: "guardrail not found" });
      return;
    }
    res.status(204).end();
  });

  return router;
}

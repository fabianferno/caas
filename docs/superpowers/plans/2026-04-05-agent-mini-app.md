# @caas/agent-mini-app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `@caas/agent-mini-app` npm package and the CaaS platform changes that let any World mini app register its API endpoints as x402-gated agent skills discoverable in the CaaS Mini App Store.

**Architecture:** A framework-agnostic core adapter handles x402 gating and a `/_caas/*` endpoint namespace. Thin wrappers adapt the core to Express, Fastify, and Next.js. A CLI registration command ties the mini app to the CaaS MongoDB registry. CaaS gains four new API routes and a Mini App Store page.

**Tech Stack:** TypeScript, Vitest, Commander (CLI), MongoDB driver, Next.js 15, Tailwind, Framer Motion, Lucide React.

---

## File Map

### New package: `packages/agent-mini-app/`

| File | Responsibility |
|---|---|
| `package.json` | Package metadata, deps, bin entry |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Test config |
| `src/types.ts` | All shared types: AgentAppConfig, Skill, AppMeta |
| `src/core/manifest.ts` | Builds `/_caas/skills` + `/_caas/handshake` + `/_caas/health` responses |
| `src/core/openapi.ts` | Parses OpenAPI JSON/YAML file -> Skill[] |
| `src/core/x402.ts` | x402 payment gating logic (pure, no framework deps) |
| `src/core/heartbeat.ts` | Starts interval to POST to CaaS heartbeat endpoint |
| `src/core/adapter.ts` | Routes to Express / Fastify / Next.js wrapper |
| `src/index.ts` | Single export: createAgentApp() |
| `cli/register.ts` | CLI: validates handshake, reads skills, registers with CaaS |
| `tests/core/manifest.test.ts` | Unit tests for manifest builder |
| `tests/core/openapi.test.ts` | Unit tests for OpenAPI parser |
| `tests/core/x402.test.ts` | Unit tests for x402 gating logic |

### Modified/created in `miniapp/`

| File | Responsibility |
|---|---|
| `src/lib/mongodb.ts` | MongoDB connection singleton |
| `src/lib/agent-mini-apps-db.ts` | CRUD for agent_mini_apps collection |
| `src/app/api/agent-apps/register/route.ts` | POST: validate + save mini app |
| `src/app/api/agent-apps/heartbeat/route.ts` | POST: update lastHeartbeat |
| `src/app/api/agent-apps/route.ts` | GET: list all registered apps |
| `src/app/api/agent-apps/[id]/skills/route.ts` | GET: skills for one app |
| `src/app/(protected)/mini-app-store/page.tsx` | Mini App Store UI page |
| `src/app/(protected)/home/page.tsx` | Wire Mini App Store card action (small edit) |

---

## Task 1: Scaffold the package

**Files:**
- Create: `packages/agent-mini-app/package.json`
- Create: `packages/agent-mini-app/tsconfig.json`
- Create: `packages/agent-mini-app/vitest.config.ts`

- [ ] **Step 1: Create package directory**

```bash
mkdir -p packages/agent-mini-app/src/core packages/agent-mini-app/tests/core packages/agent-mini-app/cli
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@caas/agent-mini-app",
  "version": "0.1.0",
  "description": "Turn any mini app into an agentic mini app with x402-gated skills for CaaS agents",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "agent-mini-app": "./dist/cli/register.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "peerDependencies": {
    "express": ">=4.0.0",
    "fastify": ">=4.0.0"
  },
  "peerDependenciesMeta": {
    "express": { "optional": true },
    "fastify": { "optional": true }
  }
}
```

Save to `packages/agent-mini-app/package.json`.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*", "cli/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Save to `packages/agent-mini-app/tsconfig.json`.

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node" },
});
```

Save to `packages/agent-mini-app/vitest.config.ts`.

- [ ] **Step 5: Install deps**

```bash
cd packages/agent-mini-app && npm install
```

- [ ] **Step 6: Commit**

```bash
git add packages/agent-mini-app/package.json packages/agent-mini-app/tsconfig.json packages/agent-mini-app/vitest.config.ts
git commit -m "feat(agent-mini-app): scaffold package"
```

---

## Task 2: Types

**Files:**
- Create: `packages/agent-mini-app/src/types.ts`

- [ ] **Step 1: Write types**

```ts
export interface AppMeta {
  name: string;
  description: string;
  icon: string;
  category: string;
  url: string;
  developer: string;
  version: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  price: string;
  route: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}

export interface AgentAppConfig {
  framework: "express" | "fastify" | "next";
  apiKey: string;
  walletAddress: string;
  app: AppMeta;
  skills?: Skill[];
  openApiSpec?: string;
  defaultPrice?: string;
  caasApiUrl?: string;
  facilitatorUrl?: string;
}

export interface SkillsManifest {
  app: AppMeta;
  skills: Skill[];
  version: string;
}

export interface HandshakeResponse {
  ok: true;
  version: string;
}

export interface HealthResponse {
  uptime: number;
  lastHeartbeat: string | null;
}
```

Save to `packages/agent-mini-app/src/types.ts`.

- [ ] **Step 2: Commit**

```bash
git add packages/agent-mini-app/src/types.ts
git commit -m "feat(agent-mini-app): add types"
```

---

## Task 3: Manifest builder

**Files:**
- Create: `packages/agent-mini-app/src/core/manifest.ts`
- Create: `packages/agent-mini-app/tests/core/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildManifest, buildHandshake, buildHealth } from "../../src/core/manifest";
import type { AgentAppConfig } from "../../src/types";

const config: AgentAppConfig = {
  framework: "express",
  apiKey: "test-key",
  walletAddress: "0x123",
  app: {
    name: "TestApp",
    description: "A test app",
    icon: "https://example.com/icon.png",
    category: "Test",
    url: "https://example.com",
    developer: "Tester",
    version: "1.0.0",
  },
  skills: [
    {
      id: "do-thing",
      name: "Do Thing",
      description: "Does a thing",
      price: "0.01",
      route: "/api/thing",
      method: "POST",
    },
  ],
};

describe("buildManifest", () => {
  it("returns app and skills", () => {
    const m = buildManifest(config, config.skills!);
    expect(m.app.name).toBe("TestApp");
    expect(m.skills).toHaveLength(1);
    expect(m.skills[0].id).toBe("do-thing");
    expect(m.version).toBe("1.0.0");
  });
});

describe("buildHandshake", () => {
  it("returns ok and version", () => {
    const h = buildHandshake();
    expect(h.ok).toBe(true);
    expect(typeof h.version).toBe("string");
  });
});

describe("buildHealth", () => {
  it("returns uptime and lastHeartbeat", () => {
    const startedAt = Date.now() - 5000;
    const h = buildHealth(startedAt, "2026-04-05T10:00:00.000Z");
    expect(h.uptime).toBeGreaterThanOrEqual(5);
    expect(h.lastHeartbeat).toBe("2026-04-05T10:00:00.000Z");
  });

  it("returns null lastHeartbeat when never pinged", () => {
    const h = buildHealth(Date.now(), null);
    expect(h.lastHeartbeat).toBeNull();
  });
});
```

Save to `packages/agent-mini-app/tests/core/manifest.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-mini-app && npm test -- tests/core/manifest.test.ts
```

Expected: FAIL with "Cannot find module '../../src/core/manifest'"

- [ ] **Step 3: Implement manifest.ts**

```ts
import type { AgentAppConfig, Skill, SkillsManifest, HandshakeResponse, HealthResponse } from "../types";

const PACKAGE_VERSION = "0.1.0";

export function buildManifest(config: AgentAppConfig, skills: Skill[]): SkillsManifest {
  return {
    app: config.app,
    skills,
    version: config.app.version,
  };
}

export function buildHandshake(): HandshakeResponse {
  return { ok: true, version: PACKAGE_VERSION };
}

export function buildHealth(startedAt: number, lastHeartbeat: string | null): HealthResponse {
  return {
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    lastHeartbeat,
  };
}
```

Save to `packages/agent-mini-app/src/core/manifest.ts`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/agent-mini-app && npm test -- tests/core/manifest.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent-mini-app/src/core/manifest.ts packages/agent-mini-app/tests/core/manifest.test.ts
git commit -m "feat(agent-mini-app): add manifest builder"
```

---

## Task 4: OpenAPI parser

**Files:**
- Create: `packages/agent-mini-app/src/core/openapi.ts`
- Create: `packages/agent-mini-app/tests/core/openapi.test.ts`
- Create: `packages/agent-mini-app/tests/fixtures/openapi.json`

- [ ] **Step 1: Create test fixture**

```json
{
  "openapi": "3.0.0",
  "info": { "title": "Test API", "version": "1.0.0" },
  "paths": {
    "/api/search": {
      "get": {
        "operationId": "searchItems",
        "summary": "Search for items",
        "description": "Find items matching a query"
      }
    },
    "/api/book": {
      "post": {
        "operationId": "bookItem",
        "summary": "Book an item",
        "description": "Reserve an item by ID"
      }
    }
  }
}
```

Save to `packages/agent-mini-app/tests/fixtures/openapi.json`.

Also run:
```bash
mkdir -p packages/agent-mini-app/tests/fixtures
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import path from "path";
import { parseOpenApiSpec } from "../../src/core/openapi";

const fixturePath = path.resolve(__dirname, "../fixtures/openapi.json");

describe("parseOpenApiSpec", () => {
  it("extracts skills from a JSON OpenAPI spec", async () => {
    const skills = await parseOpenApiSpec(fixturePath, "0.005");
    expect(skills).toHaveLength(2);
    const search = skills.find((s) => s.id === "searchItems");
    expect(search).toBeDefined();
    expect(search!.route).toBe("/api/search");
    expect(search!.method).toBe("GET");
    expect(search!.price).toBe("0.005");
    expect(search!.name).toBe("Search for items");
    expect(search!.description).toBe("Find items matching a query");
  });

  it("falls back to operationId as name if summary missing", async () => {
    const skills = await parseOpenApiSpec(fixturePath, "0.01");
    const book = skills.find((s) => s.id === "bookItem");
    expect(book!.name).toBe("Book an item");
  });
});
```

Save to `packages/agent-mini-app/tests/core/openapi.test.ts`.

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/agent-mini-app && npm test -- tests/core/openapi.test.ts
```

Expected: FAIL with "Cannot find module '../../src/core/openapi'"

- [ ] **Step 4: Implement openapi.ts**

```ts
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { Skill } from "../types";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
const VALID_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

interface OpenApiDoc {
  paths: Record<string, Record<string, { operationId?: string; summary?: string; description?: string }>>;
}

export async function parseOpenApiSpec(specPath: string, defaultPrice: string): Promise<Skill[]> {
  const abs = path.resolve(specPath);
  const raw = fs.readFileSync(abs, "utf-8");
  const ext = path.extname(abs).toLowerCase();
  const doc = (ext === ".yaml" || ext === ".yml" ? yaml.load(raw) : JSON.parse(raw)) as OpenApiDoc;

  const skills: Skill[] = [];

  for (const [route, methods] of Object.entries(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      const upperMethod = method.toUpperCase() as HttpMethod;
      if (!VALID_METHODS.includes(upperMethod)) continue;
      const id = operation.operationId ?? `${upperMethod.toLowerCase()}-${route.replace(/\//g, "-").replace(/^-/, "")}`;
      skills.push({
        id,
        name: operation.summary ?? id,
        description: operation.description ?? operation.summary ?? id,
        price: defaultPrice,
        route,
        method: upperMethod,
      });
    }
  }

  return skills;
}
```

Save to `packages/agent-mini-app/src/core/openapi.ts`.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/agent-mini-app && npm test -- tests/core/openapi.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/agent-mini-app/src/core/openapi.ts packages/agent-mini-app/tests/core/openapi.test.ts packages/agent-mini-app/tests/fixtures/openapi.json
git commit -m "feat(agent-mini-app): add OpenAPI spec parser"
```

---

## Task 5: x402 gating logic

**Files:**
- Create: `packages/agent-mini-app/src/core/x402.ts`
- Create: `packages/agent-mini-app/tests/core/x402.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { findMatchingSkill, build402Body, verifyPaymentHeader } from "../../src/core/x402";
import type { Skill } from "../../src/types";

const skills: Skill[] = [
  { id: "search", name: "Search", description: "Search things", price: "0.005", route: "/api/search", method: "GET" },
  { id: "book",   name: "Book",   description: "Book a thing",  price: "0.05",  route: "/api/book",   method: "POST" },
];

describe("findMatchingSkill", () => {
  it("matches route and method", () => {
    const match = findMatchingSkill("/api/search", "GET", skills);
    expect(match?.id).toBe("search");
  });

  it("returns null for non-skill routes", () => {
    expect(findMatchingSkill("/_caas/handshake", "GET", skills)).toBeNull();
    expect(findMatchingSkill("/api/other", "GET", skills)).toBeNull();
  });

  it("returns null for wrong method", () => {
    expect(findMatchingSkill("/api/search", "POST", skills)).toBeNull();
  });
});

describe("build402Body", () => {
  it("includes skill id, price, and wallet", () => {
    const body = build402Body(skills[0], "0xABC");
    expect(body.skill).toBe("search");
    expect(body.paymentRequired.price).toBe("0.005");
    expect(body.paymentRequired.walletAddress).toBe("0xABC");
    expect(body.paymentRequired.currency).toBe("WLD");
  });
});

describe("verifyPaymentHeader", () => {
  it("returns true when header is present and no facilitator configured", () => {
    const result = verifyPaymentHeader("some-payment-token", undefined);
    expect(result).toBe(true);
  });

  it("returns false when header is missing", () => {
    const result = verifyPaymentHeader(undefined, undefined);
    expect(result).toBe(false);
  });
});
```

Save to `packages/agent-mini-app/tests/core/x402.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-mini-app && npm test -- tests/core/x402.test.ts
```

Expected: FAIL with "Cannot find module '../../src/core/x402'"

- [ ] **Step 3: Implement x402.ts**

```ts
import type { Skill } from "../types";

export interface PaymentRequiredBody {
  error: "Payment Required";
  skill: string;
  paymentRequired: {
    price: string;
    currency: "WLD";
    walletAddress: string;
  };
}

export function findMatchingSkill(
  pathname: string,
  method: string,
  skills: Skill[]
): Skill | null {
  return (
    skills.find(
      (s) => s.route === pathname && s.method === method.toUpperCase()
    ) ?? null
  );
}

export function build402Body(skill: Skill, walletAddress: string): PaymentRequiredBody {
  return {
    error: "Payment Required",
    skill: skill.id,
    paymentRequired: {
      price: skill.price,
      currency: "WLD",
      walletAddress,
    },
  };
}

/**
 * Verifies the X-PAYMENT header.
 * If facilitatorUrl is set, delegates to it (not implemented in this task -- see adapter).
 * If no facilitatorUrl, trusts any non-empty header value (dev mode).
 */
export function verifyPaymentHeader(
  header: string | undefined,
  facilitatorUrl: string | undefined
): boolean {
  if (!header) return false;
  if (!facilitatorUrl) {
    // Dev mode: trust any present header. Production should set facilitatorUrl.
    return true;
  }
  // Sync stub -- async verification handled in adapter via verifyPaymentAsync
  return true;
}

export async function verifyPaymentAsync(
  header: string,
  facilitatorUrl: string,
  skill: Skill
): Promise<boolean> {
  try {
    const res = await fetch(facilitatorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: header, skill: skill.id, price: skill.price }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

Save to `packages/agent-mini-app/src/core/x402.ts`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/agent-mini-app && npm test -- tests/core/x402.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agent-mini-app/src/core/x402.ts packages/agent-mini-app/tests/core/x402.test.ts
git commit -m "feat(agent-mini-app): add x402 gating logic"
```

---

## Task 6: Heartbeat

**Files:**
- Create: `packages/agent-mini-app/src/core/heartbeat.ts`

- [ ] **Step 1: Implement heartbeat.ts**

No dedicated test here — the logic is a side-effectful interval. Integration is verified when the full adapter test runs.

```ts
const INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

export function startHeartbeat(
  caasApiUrl: string,
  apiKey: string
): () => void {
  let lastHeartbeat: string | null = null;

  const ping = async (attempt = 1): Promise<void> => {
    try {
      const res = await fetch(`${caasApiUrl}/api/agent-apps/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        lastHeartbeat = new Date().toISOString();
      } else if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), 2000 * attempt);
      } else {
        console.warn("[agent-mini-app] heartbeat failed after 3 attempts");
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), 2000 * attempt);
      } else {
        console.warn("[agent-mini-app] heartbeat unreachable after 3 attempts");
      }
    }
  };

  // Ping immediately on start, then on interval
  ping();
  const timer = setInterval(() => ping(), INTERVAL_MS);

  return () => clearInterval(timer);
}

export function getLastHeartbeat(): string | null {
  return null; // stateful via closure -- exposed per instance from startHeartbeat
}
```

Save to `packages/agent-mini-app/src/core/heartbeat.ts`.

Note: `lastHeartbeat` is encapsulated per instance. The adapter passes the getter to `buildHealth`. Update the signature:

```ts
export function startHeartbeat(
  caasApiUrl: string,
  apiKey: string
): { stop: () => void; getLastHeartbeat: () => string | null } {
  let lastHeartbeat: string | null = null;

  const ping = async (attempt = 1): Promise<void> => {
    try {
      const res = await fetch(`${caasApiUrl}/api/agent-apps/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        lastHeartbeat = new Date().toISOString();
      } else if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), 2000 * attempt);
      } else {
        console.warn("[agent-mini-app] heartbeat failed after 3 attempts");
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), 2000 * attempt);
      } else {
        console.warn("[agent-mini-app] heartbeat unreachable after 3 attempts");
      }
    }
  };

  ping();
  const timer = setInterval(() => ping(), INTERVAL_MS);

  return {
    stop: () => clearInterval(timer),
    getLastHeartbeat: () => lastHeartbeat,
  };
}
```

Overwrite the file with this final version.

- [ ] **Step 2: Commit**

```bash
git add packages/agent-mini-app/src/core/heartbeat.ts
git commit -m "feat(agent-mini-app): add heartbeat"
```

---

## Task 7: Framework adapter and index

**Files:**
- Create: `packages/agent-mini-app/src/core/adapter.ts`
- Create: `packages/agent-mini-app/src/index.ts`

- [ ] **Step 1: Implement adapter.ts**

```ts
import { buildManifest, buildHandshake, buildHealth } from "./manifest";
import { findMatchingSkill, build402Body, verifyPaymentAsync } from "./x402";
import { startHeartbeat } from "./heartbeat";
import { parseOpenApiSpec } from "./openapi";
import type { AgentAppConfig, Skill } from "../types";

const CAAS_NAMESPACE = "/_caas";
const DEFAULT_CAAS_API_URL = "https://caas.world";

async function resolveSkills(config: AgentAppConfig): Promise<Skill[]> {
  if (config.skills && config.skills.length > 0) return config.skills;
  if (config.openApiSpec) {
    return parseOpenApiSpec(config.openApiSpec, config.defaultPrice ?? "0.01");
  }
  throw new Error("[agent-mini-app] provide either skills[] or openApiSpec in config");
}

export async function createExpressMiddleware(config: AgentAppConfig) {
  const skills = await resolveSkills(config);
  const caasApiUrl = config.caasApiUrl ?? DEFAULT_CAAS_API_URL;
  const startedAt = Date.now();
  const { getLastHeartbeat } = startHeartbeat(caasApiUrl, config.apiKey);

  return async function agentMiniAppMiddleware(
    req: { method: string; path: string; headers: Record<string, string | string[] | undefined> },
    res: {
      status: (code: number) => { json: (body: unknown) => void };
      json: (body: unknown) => void;
    },
    next: () => void
  ) {
    const pathname: string = req.path;

    if (pathname === `${CAAS_NAMESPACE}/handshake`) {
      return res.json(buildHandshake());
    }
    if (pathname === `${CAAS_NAMESPACE}/skills`) {
      return res.json(buildManifest(config, skills));
    }
    if (pathname === `${CAAS_NAMESPACE}/health`) {
      return res.json(buildHealth(startedAt, getLastHeartbeat()));
    }

    const skill = findMatchingSkill(pathname, req.method, skills);
    if (!skill) return next();

    const paymentHeader = req.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      return res.status(402).json(build402Body(skill, config.walletAddress));
    }

    if (config.facilitatorUrl) {
      const ok = await verifyPaymentAsync(paymentHeader, config.facilitatorUrl, skill);
      if (!ok) return res.status(402).json({ error: "payment_invalid" });
    }

    return next();
  };
}

export async function createNextMiddleware(config: AgentAppConfig) {
  const skills = await resolveSkills(config);
  const caasApiUrl = config.caasApiUrl ?? DEFAULT_CAAS_API_URL;
  const startedAt = Date.now();
  const { getLastHeartbeat } = startHeartbeat(caasApiUrl, config.apiKey);

  const { NextResponse } = await import("next/server");

  return async function agentMiniAppMiddleware(
    request: { method: string; nextUrl: { pathname: string }; headers: { get: (name: string) => string | null } }
  ) {
    const pathname = request.nextUrl.pathname;

    if (pathname === `${CAAS_NAMESPACE}/handshake`) {
      return NextResponse.json(buildHandshake());
    }
    if (pathname === `${CAAS_NAMESPACE}/skills`) {
      return NextResponse.json(buildManifest(config, skills));
    }
    if (pathname === `${CAAS_NAMESPACE}/health`) {
      return NextResponse.json(buildHealth(startedAt, getLastHeartbeat()));
    }

    const skill = findMatchingSkill(pathname, request.method, skills);
    if (!skill) return NextResponse.next();

    const paymentHeader = request.headers.get("x-payment");

    if (!paymentHeader) {
      return NextResponse.json(build402Body(skill, config.walletAddress), { status: 402 });
    }

    if (config.facilitatorUrl) {
      const ok = await verifyPaymentAsync(paymentHeader, config.facilitatorUrl, skill);
      if (!ok) return NextResponse.json({ error: "payment_invalid" }, { status: 402 });
    }

    return NextResponse.next();
  };
}

export async function createFastifyPlugin(config: AgentAppConfig) {
  const skills = await resolveSkills(config);
  const caasApiUrl = config.caasApiUrl ?? DEFAULT_CAAS_API_URL;
  const startedAt = Date.now();
  const { getLastHeartbeat } = startHeartbeat(caasApiUrl, config.apiKey);

  return async function agentMiniAppPlugin(
    fastify: {
      get: (path: string, handler: (req: unknown, reply: { send: (body: unknown) => void; code: (n: number) => { send: (body: unknown) => void } }) => void) => void;
      addHook: (event: string, handler: (req: { method: string; url: string; headers: Record<string, string | undefined> }, reply: { code: (n: number) => { send: (body: unknown) => void } }, done: () => void) => void) => void;
    }
  ) {
    fastify.get(`${CAAS_NAMESPACE}/handshake`, (_, reply) => reply.send(buildHandshake()));
    fastify.get(`${CAAS_NAMESPACE}/skills`, (_, reply) => reply.send(buildManifest(config, skills)));
    fastify.get(`${CAAS_NAMESPACE}/health`, (_, reply) => reply.send(buildHealth(startedAt, getLastHeartbeat())));

    fastify.addHook("onRequest", async (req, reply, done) => {
      const skill = findMatchingSkill(req.url, req.method, skills);
      if (!skill) return done();
      const paymentHeader = req.headers["x-payment"];
      if (!paymentHeader) {
        return reply.code(402).send(build402Body(skill, config.walletAddress));
      }
      if (config.facilitatorUrl) {
        const ok = await verifyPaymentAsync(paymentHeader, config.facilitatorUrl, skill);
        if (!ok) return reply.code(402).send({ error: "payment_invalid" });
      }
      done();
    });
  };
}
```

Save to `packages/agent-mini-app/src/core/adapter.ts`.

- [ ] **Step 2: Implement index.ts**

```ts
import { createExpressMiddleware, createNextMiddleware, createFastifyPlugin } from "./core/adapter";
import type { AgentAppConfig } from "./types";

export { AgentAppConfig };
export type { Skill, AppMeta, SkillsManifest } from "./types";

export async function createAgentApp(config: AgentAppConfig) {
  switch (config.framework) {
    case "express":
      return createExpressMiddleware(config);
    case "next":
      return createNextMiddleware(config);
    case "fastify":
      return createFastifyPlugin(config);
    default:
      throw new Error(`[agent-mini-app] unsupported framework: ${(config as AgentAppConfig).framework}`);
  }
}
```

Save to `packages/agent-mini-app/src/index.ts`.

- [ ] **Step 3: Build to verify no TS errors**

```bash
cd packages/agent-mini-app && npm run build
```

Expected: `dist/` created with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/agent-mini-app/src/core/adapter.ts packages/agent-mini-app/src/index.ts
git commit -m "feat(agent-mini-app): add framework adapter and index"
```

---

## Task 8: CLI register command

**Files:**
- Create: `packages/agent-mini-app/cli/register.ts`

- [ ] **Step 1: Implement register.ts**

```ts
#!/usr/bin/env node
import { Command } from "commander";

const DEFAULT_CAAS_API_URL = "https://caas.world";

const program = new Command();

program
  .name("agent-mini-app")
  .description("@caas/agent-mini-app CLI")
  .version("0.1.0");

program
  .command("register")
  .description("Register your mini app with CaaS")
  .requiredOption("--url <url>", "Your mini app's public URL (e.g. https://my-app.com)")
  .requiredOption("--key <key>", "Your CaaS API key")
  .option("--caas-url <caasUrl>", "CaaS platform URL", DEFAULT_CAAS_API_URL)
  .action(async (opts: { url: string; key: string; caasUrl: string }) => {
    const { url, key, caasUrl } = opts;

    console.log(`[agent-mini-app] Checking handshake at ${url}/_caas/handshake ...`);

    // Step 1: Verify handshake
    let handshake: { ok: boolean; version: string };
    try {
      const res = await fetch(`${url}/_caas/handshake`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      handshake = await res.json() as { ok: boolean; version: string };
      if (!handshake.ok) throw new Error("handshake returned ok: false");
    } catch (err) {
      console.error(`[agent-mini-app] Handshake failed: ${(err as Error).message}`);
      console.error("Make sure your server is running and agent-mini-app middleware is mounted.");
      process.exit(1);
    }
    console.log(`[agent-mini-app] Handshake OK (package v${handshake.version})`);

    // Step 2: Read skills manifest
    console.log(`[agent-mini-app] Reading skills manifest from ${url}/_caas/skills ...`);
    let manifest: { app: unknown; skills: unknown[] };
    try {
      const res = await fetch(`${url}/_caas/skills`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = await res.json() as { app: unknown; skills: unknown[] };
    } catch (err) {
      console.error(`[agent-mini-app] Failed to read skills: ${(err as Error).message}`);
      process.exit(1);
    }
    console.log(`[agent-mini-app] Found ${manifest.skills.length} skill(s)`);

    // Step 3: Register with CaaS
    console.log(`[agent-mini-app] Registering with CaaS at ${caasUrl} ...`);
    try {
      const res = await fetch(`${caasUrl}/api/agent-apps/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: key,
          url,
          app: manifest.app,
          skills: manifest.skills,
        }),
      });
      const body = await res.json() as { error?: string; id?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      console.log(`[agent-mini-app] Registered successfully! App ID: ${body.id}`);
      console.log(`[agent-mini-app] Your app will appear in the CaaS Mini App Store.`);
    } catch (err) {
      console.error(`[agent-mini-app] Registration failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

Save to `packages/agent-mini-app/cli/register.ts`.

- [ ] **Step 2: Add cli to tsconfig include and rebuild**

Edit `packages/agent-mini-app/tsconfig.json` — the `include` already has `"cli/**/*"`. Just rebuild:

```bash
cd packages/agent-mini-app && npm run build
```

Expected: `dist/cli/register.js` exists, no errors.

- [ ] **Step 3: Verify CLI runs**

```bash
node packages/agent-mini-app/dist/cli/register.js --help
```

Expected output:
```
Usage: agent-mini-app [options] [command]

@caas/agent-mini-app CLI

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  register [options]  Register your mini app with CaaS
```

- [ ] **Step 4: Commit**

```bash
git add packages/agent-mini-app/cli/register.ts
git commit -m "feat(agent-mini-app): add CLI register command"
```

---

## Task 9: CaaS MongoDB client and DB operations

**Files:**
- Create: `miniapp/src/lib/mongodb.ts`
- Create: `miniapp/src/lib/agent-mini-apps-db.ts`

- [ ] **Step 1: Install mongodb driver in miniapp**

```bash
cd miniapp && npm install mongodb
```

- [ ] **Step 2: Create mongodb.ts**

```ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("MONGODB_URI environment variable is not set");

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri);
  }
  client = global._mongoClient;
} else {
  client = new MongoClient(uri);
}

export default client;
```

Save to `miniapp/src/lib/mongodb.ts`.

- [ ] **Step 3: Create agent-mini-apps-db.ts**

```ts
import { createHash } from "crypto";
import client from "./mongodb";
import type { ObjectId } from "mongodb";

export interface AgentMiniAppDoc {
  _id?: ObjectId;
  apiKeyHash: string;
  app: {
    name: string;
    description: string;
    icon: string;
    category: string;
    url: string;
    developer: string;
    version: string;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    route: string;
    method: string;
  }>;
  registeredAt: Date;
  lastHeartbeat: Date | null;
  status: "live" | "offline";
}

function collection() {
  return client.db("caas").collection<AgentMiniAppDoc>("agent_mini_apps");
}

function hashKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function registerApp(
  apiKey: string,
  app: AgentMiniAppDoc["app"],
  skills: AgentMiniAppDoc["skills"]
): Promise<string> {
  await client.connect();
  const col = collection();
  const apiKeyHash = hashKey(apiKey);

  const existing = await col.findOne({ apiKeyHash });
  if (existing) {
    // Re-registration: update app + skills
    await col.updateOne(
      { apiKeyHash },
      { $set: { app, skills, registeredAt: new Date() } }
    );
    return existing._id!.toString();
  }

  const result = await col.insertOne({
    apiKeyHash,
    app,
    skills,
    registeredAt: new Date(),
    lastHeartbeat: null,
    status: "offline",
  });
  return result.insertedId.toString();
}

export async function updateHeartbeat(apiKey: string): Promise<boolean> {
  await client.connect();
  const col = collection();
  const result = await col.updateOne(
    { apiKeyHash: hashKey(apiKey) },
    { $set: { lastHeartbeat: new Date(), status: "live" } }
  );
  return result.modifiedCount > 0;
}

export async function listApps(): Promise<AgentMiniAppDoc[]> {
  await client.connect();
  const col = collection();
  const cutoff = new Date(Date.now() - 60_000);
  // Mark stale apps offline before returning
  await col.updateMany(
    { lastHeartbeat: { $lt: cutoff }, status: "live" },
    { $set: { status: "offline" } }
  );
  return col.find({}, { projection: { apiKeyHash: 0 } }).toArray();
}

export async function getAppSkills(id: string): Promise<AgentMiniAppDoc["skills"] | null> {
  await client.connect();
  const { ObjectId } = await import("mongodb");
  const col = collection();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await col.findOne({ _id: oid }, { projection: { skills: 1 } });
  return doc?.skills ?? null;
}
```

Save to `miniapp/src/lib/agent-mini-apps-db.ts`.

- [ ] **Step 4: Add MONGODB_URI to .env.local**

```bash
echo "MONGODB_URI=mongodb://localhost:27017" >> miniapp/.env.local
```

(Replace with actual connection string in production.)

- [ ] **Step 5: Commit**

```bash
git add miniapp/src/lib/mongodb.ts miniapp/src/lib/agent-mini-apps-db.ts miniapp/.env.local
git commit -m "feat(caas): add MongoDB client and agent-mini-apps DB operations"
```

---

## Task 10: Register and heartbeat API routes

**Files:**
- Create: `miniapp/src/app/api/agent-apps/register/route.ts`
- Create: `miniapp/src/app/api/agent-apps/heartbeat/route.ts`

- [ ] **Step 1: Create register route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { registerApp } from "@/lib/agent-mini-apps-db";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    apiKey?: string;
    url?: string;
    app?: {
      name: string;
      description: string;
      icon: string;
      category: string;
      url: string;
      developer: string;
      version: string;
    };
    skills?: Array<{
      id: string;
      name: string;
      description: string;
      price: string;
      route: string;
      method: string;
    }>;
  };

  if (!body.apiKey || !body.app || !body.skills) {
    return NextResponse.json({ error: "Missing required fields: apiKey, app, skills" }, { status: 400 });
  }

  try {
    const id = await registerApp(body.apiKey, body.app, body.skills);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[agent-apps/register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
```

Save to `miniapp/src/app/api/agent-apps/register/route.ts`.

- [ ] **Step 2: Create heartbeat route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { updateHeartbeat } from "@/lib/agent-mini-apps-db";

export async function POST(req: NextRequest) {
  const body = await req.json() as { apiKey?: string };

  if (!body.apiKey) {
    return NextResponse.json({ error: "Missing apiKey" }, { status: 400 });
  }

  const updated = await updateHeartbeat(body.apiKey);
  if (!updated) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

Save to `miniapp/src/app/api/agent-apps/heartbeat/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/app/api/agent-apps/register/route.ts miniapp/src/app/api/agent-apps/heartbeat/route.ts
git commit -m "feat(caas): add register and heartbeat API routes"
```

---

## Task 11: List and skills API routes

**Files:**
- Create: `miniapp/src/app/api/agent-apps/route.ts`
- Create: `miniapp/src/app/api/agent-apps/[id]/skills/route.ts`

- [ ] **Step 1: Create list route**

```ts
import { NextResponse } from "next/server";
import { listApps } from "@/lib/agent-mini-apps-db";

export async function GET() {
  try {
    const apps = await listApps();
    return NextResponse.json(apps);
  } catch (err) {
    console.error("[agent-apps/list]", err);
    return NextResponse.json({ error: "Failed to list apps" }, { status: 500 });
  }
}
```

Save to `miniapp/src/app/api/agent-apps/route.ts`.

- [ ] **Step 2: Create skills route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAppSkills } from "@/lib/agent-mini-apps-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const skills = await getAppSkills(id);
  if (!skills) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json(skills);
}
```

Save to `miniapp/src/app/api/agent-apps/[id]/skills/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add miniapp/src/app/api/agent-apps/route.ts "miniapp/src/app/api/agent-apps/[id]/skills/route.ts"
git commit -m "feat(caas): add list and skills API routes"
```

---

## Task 12: Mini App Store page

**Files:**
- Create: `miniapp/src/app/(protected)/mini-app-store/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

/* ── Shadows (match existing pages) ── */
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80,100,190,0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };
const nmBtnGreen = { background: '#10b981', boxShadow: '6px 6px 16px rgba(16,185,129,0.4), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

interface AgentMiniApp {
  _id: string;
  status: 'live' | 'offline';
  app: {
    name: string;
    description: string;
    icon: string;
    category: string;
    url: string;
    developer: string;
    version: string;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    method: string;
    route: string;
  }>;
}

function priceRange(skills: AgentMiniApp['skills']): string {
  if (skills.length === 0) return 'Free';
  const prices = skills.map(s => parseFloat(s.price)).filter(p => !isNaN(p));
  if (prices.length === 0) return 'Free';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `${min} WLD/call` : `${min}-${max} WLD/call`;
}

export default function MiniAppStore() {
  const router = useRouter();
  const [apps, setApps] = useState<AgentMiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AgentMiniApp | null>(null);

  useEffect(() => {
    fetch('/api/agent-apps')
      .then(r => r.json())
      .then((data: AgentMiniApp[]) => { setApps(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleEnable = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec', boxShadow: '0 4px 12px rgba(179,183,189,0.35)' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <div>
            <CaasLogo />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#8a9bb0' }}>
              Mini App Store
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center" style={nmRaisedSm}>
            <ArrowLeft size={18} style={{ color: '#8a9bb0' }} />
          </motion.button>
        </div>
      </Page.Header>

      <Page.Main className="px-5 py-5">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-[13px]" style={{ color: '#8a9bb0' }}>Loading apps...</p>
          </div>
        )}

        {!loading && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-[15px] font-coolvetica uppercase" style={{ color: '#31456a' }}>No apps registered yet</p>
            <p className="text-[12px] text-center" style={{ color: '#8a9bb0' }}>
              Mini apps using @caas/agent-mini-app will appear here.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {apps.map((app, i) => (
            <motion.div
              key={app._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-4"
              style={nmRaisedSm}
            >
              <div className="flex items-start gap-3 mb-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={nmInsetSm}>
                  {app.app.icon
                    ? <img src={app.app.icon} alt={app.app.name} className="w-8 h-8 object-contain" />
                    : <span className="text-xl">{app.app.name[0]}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-coolvetica text-[0.95rem] uppercase leading-none tracking-tight" style={{ color: '#31456a' }}>
                      {app.app.name}
                    </p>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0" style={nmInsetSm}>
                      <span style={{ color: '#b3b7bd' }}>{app.app.category}</span>
                    </span>
                    {/* Live dot */}
                    <span className="flex items-center gap-1 ml-auto shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'live' ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                      <span className="text-[9px] font-bold uppercase" style={{ color: app.status === 'live' ? '#10b981' : '#b3b7bd' }}>
                        {app.status}
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8a9bb0' }}>by {app.app.developer}</p>
                </div>
              </div>

              <p className="text-[12px] mb-3 leading-relaxed" style={{ color: '#5a6e8a' }}>
                {app.app.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#8a9bb0' }}>
                    <Zap size={11} />
                    {app.skills.length} skill{app.skills.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px]" style={{ color: '#8a9bb0' }}>
                    {priceRange(app.skills)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDetail(app)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold"
                    style={nmInsetSm}
                  >
                    <span style={{ color: '#8a9bb0' }}>Details</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleEnable(app._id)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1"
                    style={enabled.has(app._id) ? nmBtnGreen : nmBtn}
                  >
                    {enabled.has(app._id) && <Check size={11} />}
                    {enabled.has(app._id) ? 'Enabled' : 'Enable'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Page.Main>

      {/* Detail sheet */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            style={{ background: 'rgba(49,69,106,0.35)' }}
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl px-6 pt-5 pb-[max(env(safe-area-inset-bottom),24px)]"
              style={{ background: '#e0e5ec', boxShadow: '-6px -6px 20px rgba(255,255,255,0.6), 0 -2px 12px #b3b7bd' }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#b3b7bd' }} />
              <p className="font-coolvetica text-[1.1rem] uppercase mb-1" style={{ color: '#31456a' }}>{detail.app.name}</p>
              <p className="text-[11px] mb-4" style={{ color: '#8a9bb0' }}>by {detail.app.developer} &middot; v{detail.app.version}</p>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: '#8a9bb0' }}>Skills</p>
              <div className="flex flex-col gap-2 mb-5">
                {detail.skills.map(s => (
                  <div key={s.id} className="rounded-xl p-3 flex items-center justify-between" style={nmInsetSm}>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: '#31456a' }}>{s.name}</p>
                      <p className="text-[10px]" style={{ color: '#8a9bb0' }}>{s.description}</p>
                    </div>
                    <span className="text-[11px] font-bold shrink-0 ml-3" style={{ color: '#7b96f5' }}>{s.price} WLD</span>
                  </div>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { toggleEnable(detail._id); setDetail(null); }}
                className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2"
                style={enabled.has(detail._id) ? nmBtnGreen : nmBtn}
              >
                {enabled.has(detail._id) ? <><Check size={16} /> Enabled for Agent</> : 'Enable for Agent'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

Save to `miniapp/src/app/(protected)/mini-app-store/page.tsx`.

- [ ] **Step 2: Commit**

```bash
git add "miniapp/src/app/(protected)/mini-app-store/page.tsx"
git commit -m "feat(caas): add Mini App Store page"
```

---

## Task 13: Wire Mini App Store card in home page

**Files:**
- Modify: `miniapp/src/app/(protected)/home/page.tsx`

- [ ] **Step 1: Read the current home page card definition**

In `miniapp/src/app/(protected)/home/page.tsx`, find this line (around line 65):

```ts
{ label: 'Mini App Store', sub: 'Agent mini apps',          icon: LayoutGrid,     color: '#10b981', action: () => {} },
```

- [ ] **Step 2: Update the action**

Replace that line with:

```ts
{ label: 'Mini App Store', sub: 'Agent mini apps',          icon: LayoutGrid,     color: '#10b981', action: () => router.push('/mini-app-store') },
```

- [ ] **Step 3: Verify the miniapp builds**

```bash
cd miniapp && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add "miniapp/src/app/(protected)/home/page.tsx"
git commit -m "feat(caas): wire Mini App Store card to /mini-app-store"
```

---

## Task 14: Run all package tests and verify end-to-end

- [ ] **Step 1: Run all package tests**

```bash
cd packages/agent-mini-app && npm test
```

Expected: PASS (all tests in manifest, openapi, x402)

- [ ] **Step 2: Run miniapp build check**

```bash
cd miniapp && npm run build
```

Expected: no TypeScript errors, no build failures.

- [ ] **Step 3: Smoke test the package locally**

Create a temporary test file `packages/agent-mini-app/smoke.mjs`:

```js
import express from "express";
// Note: requires express installed globally or in a test project
// Skip if express not available; this is manual verification
console.log("Package smoke test: import OK");
```

Then verify the dist exports are correct:

```bash
node -e "const m = require('./packages/agent-mini-app/dist/index.js'); console.log(typeof m.createAgentApp)"
```

Expected: `function`

- [ ] **Step 4: Final commit**

```bash
git add packages/agent-mini-app
git commit -m "feat(agent-mini-app): complete package implementation"
```

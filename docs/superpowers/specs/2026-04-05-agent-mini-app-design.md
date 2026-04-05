# @caas/agent-mini-app — Design Spec

**Date:** 2026-04-05
**Status:** Approved

---

## Summary

`@caas/agent-mini-app` is an npm package that wraps any existing World mini app server
and turns it into an agentic mini app in 5 lines of code. It:

1. Mounts x402 payment gating on declared skill routes
2. Exposes a `/_caas/*` namespace for CaaS to discover, register, and monitor the app
3. Heartbeats to CaaS every 30s for live/offline status in the Mini App Store
4. Registers via CLI — one command ties the app to the CaaS registry

The migration pitch: drop in the package, run `npx @caas/agent-mini-app register`, and
your app appears in the CaaS Mini App Store. Any openclaw agent can enable your skills
and call them autonomously via x402 micropayments.

---

## Package

**Name:** `@caas/agent-mini-app`
**Location:** `packages/agent-mini-app/` (new monorepo package)
**CLI bin:** `agent-mini-app` (invoked via `npx @caas/agent-mini-app`)

---

## Developer Experience

### Install

```bash
npm install @caas/agent-mini-app
```

### Integration (Express example)

```ts
import { createAgentApp } from "@caas/agent-mini-app";

app.use(createAgentApp({
  framework: "express",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,

  app: {
    name: "FlightBook",
    description: "Search and book flights worldwide with AI-powered routing",
    icon: "https://my-mini-app.com/icon.png",
    category: "Travel",
    url: "https://my-mini-app.com",
    developer: "Acme Labs",
    version: "1.0.0",
  },

  skills: [
    {
      id: "search-flights",
      name: "Search Flights",
      description: "Find available flights between two airports",
      price: "0.005",
      route: "/api/flights/search",
      method: "GET",
    },
    {
      id: "book-flight",
      name: "Book Flight",
      description: "Book a specific flight and return a confirmation",
      price: "0.05",
      route: "/api/flights/book",
      method: "POST",
    }
  ]
}));
```

### Integration (Next.js example)

```ts
import { createAgentApp } from "@caas/agent-mini-app";

export const middleware = createAgentApp({
  framework: "next",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,
  app: { ... },
  skills: [ ... ],
});
```

### OpenAPI spec instead of manual skills

```ts
createAgentApp({
  framework: "express",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,
  app: { ... },
  openApiSpec: "./openapi.json",
  defaultPrice: "0.005",
})
```

### Registration CLI

```bash
npx @caas/agent-mini-app register --url https://my-mini-app.com --key <caas-api-key>
```

Steps performed by CLI:
1. GET `https://my-mini-app.com/_caas/handshake` — verifies app is live and package is running
2. GET `https://my-mini-app.com/_caas/skills` — reads skills manifest and app metadata
3. POST `https://caas.eth/api/agent-apps/register` — saves to CaaS MongoDB registry

---

## Package Internals

```
packages/agent-mini-app/
  src/
    core/
      adapter.ts      # createAgentApp() — routes to correct framework adapter
      x402.ts         # x402 payment verification per skill call
      heartbeat.ts    # pings CaaS /api/agent-apps/heartbeat every 30s
      manifest.ts     # builds /_caas/skills JSON from config or OpenAPI spec
      openapi.ts      # parses OpenAPI spec -> Skill[]
    types.ts          # AgentAppConfig, Skill, AppMeta types
    index.ts          # single export: createAgentApp
  cli/
    register.ts       # npx @caas/agent-mini-app register
  package.json
  tsconfig.json
```

### Framework adapters

`adapter.ts` reads `config.framework` and returns the appropriate middleware:

| `framework` value | Output type |
|---|---|
| `"express"` | Express `RequestHandler` (3-arg middleware) |
| `"fastify"` | Fastify plugin |
| `"next"` | Next.js middleware function |

### `/_caas/*` endpoints mounted on the mini app server

| Route | Purpose |
|---|---|
| `GET /_caas/handshake` | Returns `{ ok: true, version: string }` |
| `GET /_caas/skills` | Returns full skills manifest + app metadata |
| `GET /_caas/health` | Returns `{ uptime: number, lastHeartbeat: string }` |

### x402 gating flow (per skill call)

1. Incoming request matches a declared skill route
2. No `X-Payment` header present: respond `402` with `{ price, walletAddress, skill }`
3. `X-Payment` header present: verify via x402 facilitator
4. Verified: forward request to the actual route handler
5. Unverified: respond `402` with `{ error: "payment_invalid" }`

Non-skill routes pass through without gating.

### Heartbeat

`heartbeat.ts` starts a `setInterval` at adapter init time:
- Every 30s: POST `https://caas.eth/api/agent-apps/heartbeat` with `{ apiKey }`
- On failure: retries with exponential backoff, max 3 attempts, then logs warning
- No crash on heartbeat failure — app continues operating

---

## CaaS Platform Changes

### MongoDB schema — `agent_mini_apps` collection

```ts
{
  _id: ObjectId,
  apiKey: string,           // SHA-256 hashed
  ownerWorldId: string,     // from CLI registration flow
  app: {
    name: string,
    description: string,
    icon: string,
    category: string,
    url: string,
    developer: string,
    version: string,
  },
  skills: Array<{
    id: string,
    name: string,
    description: string,
    price: string,          // WLD per call
    route: string,
    method: string,
  }>,
  registeredAt: Date,
  lastHeartbeat: Date,
  status: "live" | "offline",  // derived: offline if lastHeartbeat > 60s ago
}
```

### New API routes in CaaS miniapp (`/api/agent-apps/`)

| Method + Route | Purpose | Auth |
|---|---|---|
| `POST /api/agent-apps/register` | CLI registration — validates handshake, reads skills, saves doc | CAAS_API_KEY |
| `POST /api/agent-apps/heartbeat` | Package calls every 30s — updates `lastHeartbeat` | CAAS_API_KEY |
| `GET /api/agent-apps` | Mini App Store page — returns all registered apps | Session |
| `GET /api/agent-apps/:id/skills` | Returns skills for a specific app | Session |

### Mini App Store UI (`/mini-app-store` page)

New protected page wired to the existing "Mini App Store" card in `home/page.tsx`
(currently `action: () => {}`).

Displays registered apps as cards:

```
+----------------------------------+
| [icon] FlightBook          LIVE  |
|        by Acme Labs   [Travel]   |
|                                  |
| Search and book flights          |
| worldwide with AI-powered routing|
|                                  |
| 2 skills   0.005-0.05 WLD/call  |
|                                  |
|          [Enable for Agent]      |
+----------------------------------+
```

"Enable for Agent" appends the app's `/_caas/skills` URL to the user's agent ENS
`caas.skills` text record, making the skills available to their openclaw agent.

---

## Agent Skill Resolution Flow

When an openclaw agent receives a task:

1. Reads `caas.skills` ENS text record — list of `/_caas/skills` URLs
2. Fetches each skills manifest
3. Reasons about which skills apply to the task
4. Calls the skill endpoint (triggers 402)
5. Pays via x402 from agent wallet
6. Receives response, continues reasoning

---

## Supported Frameworks

| Framework | Adapter |
|---|---|
| Express | `framework: "express"` |
| Fastify | `framework: "fastify"` |
| Next.js | `framework: "next"` |

---

## Types

```ts
interface AppMeta {
  name: string;
  description: string;
  icon: string;
  category: string;
  url: string;
  developer: string;
  version: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  price: string;           // WLD amount as string, e.g. "0.01"
  route: string;           // e.g. "/api/flights/search"
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}

interface AgentAppConfig {
  framework: "express" | "fastify" | "next";
  apiKey: string;
  walletAddress: string;
  app: AppMeta;
  skills?: Skill[];
  openApiSpec?: string;    // path to OpenAPI JSON/YAML — mutually exclusive with skills[]
  defaultPrice?: string;   // required when openApiSpec is set, used as price for all discovered endpoints
}
```

---

## Out of Scope

- WhatsApp / Telegram channel integration
- Per-call analytics dashboard (heartbeat/uptime only for now)
- Skill marketplace with community ratings
- Multi-agent skill sharing
- Automatic API key rotation

# @caas/agent-mini-app

Turn any World mini app into an agentic mini app in 5 lines of code.

Your existing API endpoints become x402-gated skills that show up in the CaaS Mini App Store. Any openclaw agent can enable your app and call your skills autonomously via micropayments.

---

## Install

```bash
npm install @caas/agent-mini-app
```

---

## Usage

### Express

```ts
import express from "express";
import { createAgentApp } from "@caas/agent-mini-app";

const app = express();

app.use(await createAgentApp({
  framework: "express",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,

  app: {
    name: "FlightBook",
    description: "Search and book flights worldwide with AI-powered routing",
    icon: "https://my-app.com/icon.png",
    category: "Travel",
    url: "https://my-app.com",
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
    },
  ],
}));

app.listen(3000);
```

### Next.js

```ts
// middleware.ts
import { createAgentApp } from "@caas/agent-mini-app";

export default await createAgentApp({
  framework: "next",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,
  app: { ... },
  skills: [ ... ],
});

export const config = {
  matcher: ["/_caas/:path*", "/api/:path*"],
};
```

### Fastify

```ts
import Fastify from "fastify";
import { createAgentApp } from "@caas/agent-mini-app";

const fastify = Fastify();

fastify.register(await createAgentApp({
  framework: "fastify",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,
  app: { ... },
  skills: [ ... ],
}));

fastify.listen({ port: 3000 });
```

---

## OpenAPI spec instead of manual skills

Point at your existing OpenAPI/Swagger spec and skills are auto-discovered:

```ts
createAgentApp({
  framework: "express",
  apiKey: process.env.CAAS_API_KEY,
  walletAddress: process.env.AGENT_WALLET,
  app: { ... },
  openApiSpec: "./openapi.json",
  defaultPrice: "0.005",
});
```

Supports both `.json` and `.yaml` specs. `defaultPrice` is the WLD per-call price applied to all discovered endpoints.

> Note: `skills` and `openApiSpec` are mutually exclusive. Providing both will use `skills` and ignore the spec.

---

## Register with CaaS

Once your server is running, register it with one command:

```bash
npx @caas/agent-mini-app register \
  --url https://my-app.com \
  --key <your-caas-api-key>
```

This will:
1. Check your server is reachable at `/_caas/handshake`
2. Read your skills manifest from `/_caas/skills`
3. Register your app in the CaaS Mini App Store

Your app will appear in the CaaS Mini App Store immediately. Users can enable it for their openclaw agents.

---

## How it works

The package mounts a `/_caas/*` namespace on your server:

| Endpoint | Purpose |
|---|---|
| `GET /_caas/handshake` | Liveness check used by the CLI and CaaS |
| `GET /_caas/skills` | Returns your app metadata and skills manifest |
| `GET /_caas/health` | Returns uptime and last heartbeat timestamp |

It also wraps your declared skill routes with x402 payment gating:

1. Agent sends request to your skill route (e.g. `POST /api/flights/book`)
2. No payment header: your server responds `402` with price and wallet address
3. Agent pays via x402 and retries with `X-PAYMENT` header
4. Payment verified: request passes through to your handler
5. Your handler responds normally

The package heartbeats to CaaS every 30 seconds so your app shows a live/offline status dot in the Mini App Store.

---

## Config reference

```ts
interface AgentAppConfig {
  // Required
  framework: "express" | "fastify" | "next";
  apiKey: string;           // Your CaaS API key
  walletAddress: string;    // Your wallet address to receive WLD payments
  app: AppMeta;             // App details shown in the Mini App Store

  // Skills (one of these is required)
  skills?: Skill[];         // Manual skill declarations
  openApiSpec?: string;     // Path to OpenAPI JSON/YAML (alternative to skills)
  defaultPrice?: string;    // Required when using openApiSpec

  // Optional
  caasApiUrl?: string;      // Override CaaS platform URL (default: https://caas.world)
  facilitatorUrl?: string;  // x402 facilitator for payment verification
}

interface AppMeta {
  name: string;
  description: string;
  icon: string;             // URL to your app icon
  category: string;         // e.g. "Travel", "Finance", "Productivity"
  url: string;              // Your app's public URL
  developer: string;
  version: string;
}

interface Skill {
  id: string;               // Unique identifier, e.g. "search-flights"
  name: string;             // Human-readable name shown in CaaS
  description: string;      // What the skill does
  price: string;            // WLD per call, e.g. "0.005"
  route: string;            // Your API route, e.g. "/api/flights/search"
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}
```

---

## Payment flow

By default (no `facilitatorUrl`), the package trusts any non-empty `X-PAYMENT` header. This is fine for development.

For production, set `facilitatorUrl` to your x402 facilitator endpoint. The package will POST the payment proof to the facilitator before letting requests through:

```ts
createAgentApp({
  ...
  facilitatorUrl: "https://facilitator.x402.org/verify",
});
```

---

## Environment variables

```bash
CAAS_API_KEY=your-api-key-here
AGENT_WALLET=0xYourWalletAddress
```

---

## License

MIT

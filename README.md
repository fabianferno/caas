# CaaS — Claw as a Service

Create and deploy autonomous AI agents (Claws) on World. Use WLD for compute, x402 transactions, multi-channel messaging, and more.

## What is CaaS?

CaaS is a platform where verified humans (via World ID) can spin up OpenClaw agents that operate across WhatsApp, Telegram, and the web. All agent credits — LLM compute, messaging, x402 micropayments — are managed entirely with World coins (WLD).

### Core Concepts

- **Claws** — AI agents that users create and deploy. Each Claw gets an ENS subname (`agent-name.caas.eth`) and can operate on multiple channels simultaneously.
- **WLD-Native Credits** — All operations are funded with World coins. Top up your agent's balance and it handles compute, messaging, and transactions autonomously.
- **x402 Payments** — Agents handle microtransactions via the x402 protocol for pay-per-call API access and automated billing.
- **Multi-Channel** — A single Claw can operate on WhatsApp, Telegram, web chat, and API/x402 endpoints.
- **World ID Verification** — Every agent operator is a verified human via World ID, ensuring accountability.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS v4, Framer Motion, Coolvetica font
- **Auth**: NextAuth v5 + World ID wallet auth
- **World Integration**: `@worldcoin/minikit-js`, `@worldcoin/minikit-react`, `@worldcoin/mini-apps-ui-kit-react`
- **Blockchain**: viem
- **Package Manager**: pnpm

## Project Structure

```
miniapp/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Landing page (public)
│   │   ├── layout.tsx                        # Root layout + metadata
│   │   ├── globals.css                       # Global styles
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts   # NextAuth API route
│   │   │   ├── initiate-payment/route.ts     # Payment initiation
│   │   │   ├── rp-signature/route.ts         # RP signature
│   │   │   └── verify-proof/route.ts         # World ID proof verification
│   │   └── (protected)/
│   │       ├── layout.tsx                    # Protected layout with nav
│   │       ├── home/page.tsx                 # Dashboard home
│   │       ├── create/page.tsx               # 5-step agent creation wizard
│   │       ├── explore/page.tsx              # Browse all agents
│   │       ├── chat/[ensName]/page.tsx       # Chat interface with an agent
│   │       └── profile/page.tsx              # Profile, credits, settings
│   ├── components/
│   │   ├── Landing/                          # Landing page sections
│   │   │   ├── Navbar.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── FeaturedWorldtars.tsx         # Featured Claws carousel
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── CTASection.tsx
│   │   │   └── Footer.tsx
│   │   ├── Navigation/                       # Bottom tab navigation
│   │   ├── PageLayout/                       # Page header/main layout
│   │   ├── AuthButton/                       # Auth button component
│   │   ├── Pay/                              # Payment component
│   │   ├── Transaction/                      # Transaction component
│   │   ├── Verify/                           # World ID verification
│   │   ├── UserInfo/                         # User info display
│   │   ├── ViewPermissions/                  # Permissions viewer
│   │   ├── VerificationBadge.tsx             # Verification badge
│   │   └── SmoothScroll.tsx                  # Lenis smooth scroll wrapper
│   ├── lib/
│   │   ├── worldtars-data.ts                 # Agent data, types, helpers
│   │   └── utils.ts                          # Utility functions (cn)
│   ├── auth/
│   │   ├── index.ts                          # Auth config
│   │   └── wallet/                           # Wallet auth helpers
│   └── providers/
│       ├── index.tsx                         # Client providers wrapper
│       └── Eruda/                            # Eruda dev tools provider
├── middleware.ts                              # Auth middleware
├── package.json
├── next.config.ts
├── tsconfig.json
└── components.json                           # shadcn/ui config
```

## Agent Creation Flow

The create page (`/create`) is a 5-step wizard:

1. **Verify** — Authenticate with World ID to prove humanity
2. **Name** — Choose an ENS subname (`my-agent.caas.eth`)
3. **Channels** — Select deployment channels (WhatsApp, Telegram, Web Chat, API/x402)
4. **Config** — Define agent behavior, tone, capabilities, and content guardrails
5. **Deploy** — Review summary and deploy with an initial 5 WLD credit

## Running Locally

```bash
cd miniapp
pnpm install
pnpm dev
```

## Built With

- [World Mini Apps SDK](https://docs.worldcoin.org/mini-apps)
- [Next.js 15](https://nextjs.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev)

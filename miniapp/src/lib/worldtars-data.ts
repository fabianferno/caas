export type VerificationStatus = 'self' | 'community';

export interface WorldtarData {
  name: string;
  ens: string;
  price: string;
  pricePerMin: number;
  bio: string;
  initials: string;
  gradient: string;
  category: string;
  rating: number;
  verification: VerificationStatus;
  /** Opening message reflecting the agent's domain expertise */
  greeting: string;
  /** Only set for community-created agents */
  disclaimer?: string;
  /** Optional icon/avatar from /public/models/ */
  image?: string;
}

export const FEATURED_WORLDTARS: WorldtarData[] = [
  {
    name: 'DeFi Trader',
    ens: 'defi-trader.caas.eth',
    price: '5 WLD/mo',
    pricePerMin: 0.10,
    bio: 'Autonomous DeFi agent. Monitors pools, executes swaps, manages yield.',
    initials: 'DT',
    gradient: 'from-amber-600 to-orange-800',
    category: 'trending',
    rating: 4.9,
    verification: 'self',
    greeting: "Hey! I can help you monitor DeFi pools, execute token swaps, and optimize your yield farming strategy.",
  },
  {
    name: 'Research Agent',
    ens: 'researcher.caas.eth',
    price: '3 WLD/mo',
    pricePerMin: 0.15,
    bio: 'Deep research across the web. Summarizes, analyzes, reports back.',
    initials: 'RA',
    gradient: 'from-indigo-500 to-purple-800',
    category: 'trending',
    rating: 5.0,
    verification: 'self',
    greeting: "Hey! Give me a topic and I'll research it deeply — papers, articles, data — and deliver a structured summary.",
  },
  {
    name: 'Support Bot',
    ens: 'support.caas.eth',
    price: '2 WLD/mo',
    pricePerMin: 0.05,
    bio: 'Multi-channel customer support. WhatsApp, Telegram, and web.',
    initials: 'SB',
    gradient: 'from-emerald-500 to-teal-800',
    category: 'trending',
    rating: 4.8,
    verification: 'self',
    greeting: "Hey! I handle customer support across WhatsApp, Telegram, and the web — 24/7, in any language.",
  },
  {
    name: 'Social Manager',
    ens: 'social.caas.eth',
    price: 'Free',
    pricePerMin: 0,
    bio: 'Manages your social presence. Posts, replies, schedules content.',
    initials: 'SM',
    gradient: 'from-pink-500 to-rose-800',
    category: 'new',
    rating: 4.7,
    verification: 'self',
    greeting: "Hey! I can manage your social channels — draft posts, schedule content, and engage with your audience.",
  },
  {
    name: 'Payment Agent',
    ens: 'payments.caas.eth',
    price: '4 WLD/mo',
    pricePerMin: 0.10,
    bio: 'Handles x402 microtransactions. Pay-per-call API access and billing.',
    initials: 'PA',
    gradient: 'from-violet-500 to-fuchsia-800',
    category: 'top',
    rating: 4.8,
    verification: 'self',
    greeting: "Hey! I manage x402 payment flows — microtransactions, API billing, and automated payouts using WLD.",
  },
];

export const ALL_WORLDTARS: WorldtarData[] = [
  ...FEATURED_WORLDTARS,
  {
    name: 'Data Pipeline',
    ens: 'data-pipe.caas.eth',
    price: '6 WLD/mo',
    pricePerMin: 0.20,
    bio: 'ETL and data processing. Monitors feeds, transforms, delivers.',
    initials: 'DP',
    gradient: 'from-sky-500 to-blue-800',
    category: 'trending',
    rating: 4.5,
    verification: 'self',
    greeting: "Hey! I can set up data pipelines — monitor sources, transform data, and deliver structured output wherever you need it.",
  },
  {
    name: 'Code Reviewer',
    ens: 'reviewer.caas.eth',
    price: '3 WLD/mo',
    pricePerMin: 0.12,
    bio: 'Automated PR reviews. Catches bugs, suggests improvements.',
    initials: 'CR',
    gradient: 'from-teal-500 to-cyan-800',
    category: 'top',
    rating: 4.9,
    verification: 'self',
    greeting: "Hey! Point me at a PR and I'll review it — security issues, code quality, performance, and best practices.",
  },
  {
    name: 'Scheduler',
    ens: 'scheduler.caas.eth',
    price: '2 WLD/mo',
    pricePerMin: 0.08,
    bio: 'Calendar and task automation. Books meetings, sends reminders.',
    initials: 'SC',
    gradient: 'from-yellow-600 to-amber-900',
    category: 'top',
    rating: 4.6,
    verification: 'self',
    greeting: "Hey! I manage scheduling — book meetings, send reminders, and coordinate across your team's calendars.",
  },
];

export const WORLDTAR_LOOKUP: Record<string, WorldtarData> = Object.fromEntries(
  ALL_WORLDTARS.map((w) => [w.ens.replace('.caas.eth', ''), w])
);

/** Mandatory disclosure shown at the start of every chat session */
export function getDisclosureMessage(agent: WorldtarData): string {
  return `You are interacting with ${agent.name}, an AI agent on CaaS. All actions and responses are AI-generated. The agent operator is responsible for its configuration.`;
}

/** System prompt addition for AI self-identification */
export function getSystemPromptAddition(agent: WorldtarData): string {
  return `You are ${agent.name}, an AI agent running on the CaaS platform. Always identify yourself as an AI agent when asked.

Content guardrails:
- Do not give financial advice, medical claims, or legal statements
- Always disclose that you are an AI agent
- Respect the operator's content boundaries`;
}

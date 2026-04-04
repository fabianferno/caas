---
name: ens-documentation
description: >-
  Guides integration and answers about the Ethereum Name Service using official
  ENS documentation. Use when working with ENS, .eth names, resolvers, reverse
  resolution, primary names, text records, multichain ENS, CCIP Read, Name
  Wrapper, ENSIPs, SIWE with ENS, subgraphs, or ENS DAO governance docs.
---

# ENS documentation

## Canonical source

Official docs live at [https://docs.ens.domains](https://docs.ens.domains). The machine-readable sitemap and short descriptions for every page are at [https://docs.ens.domains/llms.txt](https://docs.ens.domains/llms.txt). When implementation details, API shapes, or normative behavior matter, **open the relevant doc page** (or `llms.txt` to pick a path) instead of guessing.

Base URL for paths below: `https://docs.ens.domains`

## Quick routing (developers)

| Task | Start here |
|------|------------|
| First-time dApp integration | `/web/quickstart`, `/web` |
| Resolve name → address | `/web/resolution` |
| Address → primary / reverse name | `/web/reverse`, ENSIP-19 for multichain |
| Text records (profile, arbitrary keys) | `/web/records`, ENSIP-5 |
| Avatar / profile standards | `/web/avatars`, ENSIP-12, ENSIP-18 |
| Libraries and tooling | `/web/libraries` |
| L2 and cross-chain resolution | `/web/multichain`, `/learn/ccip-read` |
| Offchain / L2 data via resolver | `/resolvers/ccip-read` (EIP-3668) |
| Resolver concepts and contracts | `/resolvers/quickstart`, `/resolvers/interfaces`, `/resolvers/public` |
| Universal Resolver (single entrypoint) | `/resolvers/universal`, ENSIP-23 |
| Name normalization | `/resolution/names`, ENSIP-15 |
| Subnames / subdomains | `/web/subdomains`, Name Wrapper docs under `/wrapper/*` |
| List names owned by an address | `/web/enumerate`, `/web/subgraph` |
| Contract addresses (manual integration) | `/learn/deployments` |
| ENSv2 readiness | `/web/ensv2-readiness`, `/contracts/ensv2/overview` |
| AI / agent ↔ ENS (e.g. registry verification) | `/building-with-ai`, ENSIP-25 |
| UI/UX for ENS | `/web/design` |

## Facts to keep straight

- **Resolution bootstraps on Ethereum Mainnet (or testnet)**; L2/offchain data often uses **CCIP Read** ([EIP-3668](https://eips.ethereum.org/EIPS/eip-3668)) and **wildcard resolution** (ENSIP-10).
- **Primary names** (reverse) have **multichain** semantics; see ENSIP-19 and `/web/reverse`.
- **ENSIPs** are the normative specs: `/ensip` index, individual `/ensip/N` pages.
- **Name Wrapper**: fuses, expiry, and wrapped states are contract-level rules—use `/wrapper/overview` and linked pages before changing permissions or custody assumptions.

## Governance and DAO

DAO process, constitution, and proposals live under `/dao/*`. For proposal text and history, prefer the docs site or linked governance tools referenced there. **Do not** treat social channels as authoritative over published specs.

## When detail is missing here

1. Check [llms.txt](https://docs.ens.domains/llms.txt) for the best path and one-line summary.
2. Open that path on `docs.ens.domains` for full content.
3. For standards, read the cited **ENSIP** page.

## Local sitemap copy

For offline search or quick grep, see [reference-llms-txt.md](reference-llms-txt.md) (snapshot of [llms.txt](https://docs.ens.domains/llms.txt); refresh that file when docs structure changes).

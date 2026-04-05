---
name: 0g-inft
description: Build INFTs (Intelligent NFTs) with ERC-7857 for tokenizing AI agents. Use when creating, transferring, or integrating AI agent NFTs with encrypted intelligence.
---

# 0G INFTs (Intelligent NFTs)

Tokenize AI agents with their complete intelligence using ERC-7857 — encrypted metadata, secure transfers, and decentralized storage.

## When to Use

- Building AI agent marketplaces
- Tokenizing AI models/agents as NFTs
- Implementing ERC-7857 standard
- Creating transferable AI agents with encrypted intelligence
- Building AI-as-a-Service with NFT ownership

## What Are INFTs?

INFTs solve the problem of AI agent ownership. Traditional NFTs only point to metadata — INFTs contain the actual encrypted AI intelligence that transfers with ownership.

**ERC-7857** extends ERC-721 with:
- Encrypted metadata storage for AI intelligence
- Secure re-encryption on ownership transfer (via TEE oracles)
- Oracle verification for transfer integrity
- Authorized usage for AI-as-a-Service models
- Clone function for agent templates

## Transfer Flow

1. **Encrypt & Commit** — AI agent metadata encrypted, hash commitment created
2. **Oracle Processing** — Trusted oracle (TEE) decrypts original metadata
3. **Re-encrypt for Receiver** — New encryption key generated, metadata re-encrypted
4. **Key Delivery** — New key encrypted with receiver's public key
5. **Verify & Finalize** — Smart contract verifies proofs, ownership transfers
6. **Access Granted** — Receiver decrypts metadata key, gets full agent access

## Capabilities

- **Transfer**: Both ownership AND encrypted AI intelligence transfer together
- **Clone**: Create copies with same AI metadata (for templates)
- **Authorized Usage**: Grant usage rights without ownership transfer (AI-as-a-Service)

## Integration with 0G Stack

| Component | Role | Benefit |
|-----------|------|---------|
| 0G Storage | Encrypted AI storage | Permanent, decentralized availability |
| 0G Chain | Smart contract execution | Fast, low-cost INFT operations |
| 0G Compute | Secure AI inference | Private execution environment |
| 0G DA | Transfer verification | Guaranteed data availability |

## Use Cases

- AI trading bots with proven track records
- Personal AI assistants trained on user preferences
- Game NPCs with unique personalities
- AI art models trained on specific styles
- Enterprise AI agents for clients
- AI agent marketplaces

## Resources

- Integration Guide: https://docs.0g.ai/developer-hub/building-on-0g/inft/integration
- ERC-7857 Standard: https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857
- GitHub: https://github.com/0gfoundation/0g-agent-nft/tree/eip-7857-draft
- Concept: https://docs.0g.ai/concepts/inft

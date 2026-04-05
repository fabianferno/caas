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

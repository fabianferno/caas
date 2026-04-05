import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../src/memory/ens.js";

describe("buildSystemPrompt", () => {
  it("builds prompt from soul and personality", () => {
    const prompt = buildSystemPrompt({
      soul: "You are a helpful trading assistant.",
      personality: { tone: "friendly", style: "concise" },
      skills: [],
    });
    expect(prompt).toContain("You are a helpful trading assistant.");
    expect(prompt).toContain("friendly");
    expect(prompt).toContain("concise");
  });

  it("includes skill instructions when provided", () => {
    const prompt = buildSystemPrompt({
      soul: "Base soul.",
      personality: null,
      skills: ["When asked about weather, check the forecast tool first."],
    });
    expect(prompt).toContain("Base soul.");
    expect(prompt).toContain("weather");
  });

  it("returns default prompt when no soul is set", () => {
    const prompt = buildSystemPrompt({ soul: null, personality: null, skills: [] });
    expect(prompt).toContain("helpful");
  });
});

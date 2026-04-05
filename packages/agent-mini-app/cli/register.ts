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
      handshake = (await res.json()) as { ok: boolean; version: string };
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
      manifest = (await res.json()) as { app: unknown; skills: unknown[] };
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
      const body = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      console.log(`[agent-mini-app] Registered successfully! App ID: ${body.id}`);
      console.log(`[agent-mini-app] Your app will appear in the CaaS Mini App Store.`);
    } catch (err) {
      console.error(`[agent-mini-app] Registration failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

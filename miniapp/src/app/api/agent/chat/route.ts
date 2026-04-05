import { NextRequest, NextResponse } from "next/server";

const ORCHESTRATOR_URL = (
  process.env.ORCHESTRATOR_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  let body: { ensName?: string; conversationId?: string; userId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ensName, conversationId, userId, text } = body;

  if (!ensName || !conversationId || !userId || !text) {
    return NextResponse.json(
      { error: "ensName, conversationId, userId, and text are required" },
      { status: 400 }
    );
  }

  // 1. Resolve agent port from orchestrator
  let agentRecord: { hostPort: number; status: string };
  try {
    const orchRes = await fetch(`${ORCHESTRATOR_URL}/agents/${encodeURIComponent(ensName)}`);
    if (orchRes.status === 404) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (!orchRes.ok) {
      return NextResponse.json({ error: "Failed to resolve agent" }, { status: 502 });
    }
    agentRecord = await orchRes.json();
  } catch {
    return NextResponse.json({ error: "Orchestrator unreachable" }, { status: 502 });
  }

  if (!Number.isInteger(agentRecord.hostPort) || agentRecord.hostPort < 1024 || agentRecord.hostPort > 65535) {
    return NextResponse.json({ error: "Invalid agent port" }, { status: 502 });
  }

  if (agentRecord.status !== "running") {
    return NextResponse.json(
      { error: `Agent is not running (status: ${agentRecord.status})` },
      { status: 503 }
    );
  }

  // 2. Forward message to agent container
  try {
    const agentRes = await fetch(`http://localhost:${agentRecord.hostPort}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, userId, text }),
    });

    if (!agentRes.ok) {
      const errBody = await agentRes.json().catch(() => ({ error: "Agent error" }));
      return NextResponse.json(
        { error: errBody.error || "Agent returned an error" },
        { status: 502 }
      );
    }

    const result = await agentRes.json();
    return NextResponse.json({ text: result.text });
  } catch {
    return NextResponse.json({ error: "Agent unreachable" }, { status: 504 });
  }
}

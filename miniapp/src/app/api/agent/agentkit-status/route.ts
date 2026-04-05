import { NextRequest } from "next/server";

const ORCHESTRATOR_URL = (process.env.ORCHESTRATOR_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return Response.json({ error: "agentId is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/agents/${agentId}/agentkit-status`);
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: "Failed to reach orchestrator" }, { status: 502 });
  }
}

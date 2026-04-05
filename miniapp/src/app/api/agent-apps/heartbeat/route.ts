import { NextRequest, NextResponse } from "next/server";
import { updateHeartbeat } from "@/lib/agent-mini-apps-db";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { apiKey?: string };

  if (!body.apiKey) {
    return NextResponse.json({ error: "Missing apiKey" }, { status: 400 });
  }

  const updated = await updateHeartbeat(body.apiKey);
  if (!updated) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

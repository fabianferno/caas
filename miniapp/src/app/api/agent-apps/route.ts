import { NextResponse } from "next/server";
import { listApps } from "@/lib/agent-mini-apps-db";

export async function GET() {
  try {
    const apps = await listApps();
    return NextResponse.json(apps);
  } catch (err) {
    console.error("[agent-apps/list]", err);
    return NextResponse.json({ error: "Failed to list apps" }, { status: 500 });
  }
}

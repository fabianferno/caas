import { NextRequest, NextResponse } from "next/server";
import { getAppSkills } from "@/lib/agent-mini-apps-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const skills = await getAppSkills(id);
  if (!skills) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json(skills);
}

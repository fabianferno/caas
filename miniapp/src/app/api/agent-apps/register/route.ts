import { NextRequest, NextResponse } from "next/server";
import { registerApp } from "@/lib/agent-mini-apps-db";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    apiKey?: string;
    url?: string;
    app?: {
      name: string;
      description: string;
      icon: string;
      category: string;
      url: string;
      developer: string;
      version: string;
    };
    skills?: Array<{
      id: string;
      name: string;
      description: string;
      price: string;
      route: string;
      method: string;
    }>;
  };

  if (!body.apiKey || !body.app || !body.skills) {
    return NextResponse.json(
      { error: "Missing required fields: apiKey, app, skills" },
      { status: 400 }
    );
  }

  try {
    const id = await registerApp(body.apiKey, body.app, body.skills);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[agent-apps/register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

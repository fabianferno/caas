const ORCHESTRATOR_URL = (process.env.ORCHESTRATOR_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET() {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/agents`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json([], { status: 200 });
    }
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json([], { status: 200 });
  }
}

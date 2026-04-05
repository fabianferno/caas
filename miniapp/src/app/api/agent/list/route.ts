import { auth } from '@/auth';

const ORCHESTRATOR_URL = (process.env.ORCHESTRATOR_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET() {
  try {
    const session = await auth();
    const userWallet = session?.user?.id;

    const res = await fetch(`${ORCHESTRATOR_URL}/agents`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json([], { status: 200 });
    }
    const data = await res.json();

    // Filter to only the current user's agents if we have a wallet and agents have ownerAddress
    if (userWallet && Array.isArray(data)) {
      const owned = data.filter(
        (a: Record<string, unknown>) =>
          typeof a.ownerAddress === 'string' &&
          a.ownerAddress.toLowerCase() === userWallet.toLowerCase()
      );
      // If ownerAddress field exists in the data, return filtered. Otherwise return all (legacy).
      const hasOwnerField = data.length === 0 || data.some((a: Record<string, unknown>) => 'ownerAddress' in a);
      return Response.json(hasOwnerField ? owned : data);
    }

    return Response.json(Array.isArray(data) ? data : []);
  } catch {
    return Response.json([], { status: 200 });
  }
}

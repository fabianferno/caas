const INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

export function startHeartbeat(
  caasApiUrl: string,
  apiKey: string
): { stop: () => void; getLastHeartbeat: () => string | null } {
  let lastHeartbeat: string | null = null;

  const ping = async (attempt = 1): Promise<void> => {
    try {
      const res = await fetch(`${caasApiUrl}/api/agent-apps/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        lastHeartbeat = new Date().toISOString();
      } else if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), 2000 * attempt);
      } else {
        console.warn("[agent-mini-app] heartbeat failed after 3 attempts");
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), 2000 * attempt);
      } else {
        console.warn("[agent-mini-app] heartbeat unreachable after 3 attempts");
      }
    }
  };

  ping();
  const timer = setInterval(() => ping(), INTERVAL_MS);

  return {
    stop: () => clearInterval(timer),
    getLastHeartbeat: () => lastHeartbeat,
  };
}

import { buildManifest, buildHandshake, buildHealth } from "./manifest";
import { findMatchingSkill, build402Body, verifyPaymentAsync } from "./x402";
import { startHeartbeat } from "./heartbeat";
import { parseOpenApiSpec } from "./openapi";
import type { AgentAppConfig, Skill } from "../types";

const CAAS_NAMESPACE = "/_caas";
const DEFAULT_CAAS_API_URL = "https://caas.world";

async function resolveSkills(config: AgentAppConfig): Promise<Skill[]> {
  if (config.skills && config.skills.length > 0) return config.skills;
  if (config.openApiSpec) {
    return parseOpenApiSpec(config.openApiSpec, config.defaultPrice ?? "0.01");
  }
  throw new Error("[agent-mini-app] provide either skills[] or openApiSpec in config");
}

export async function createExpressMiddleware(config: AgentAppConfig) {
  const skills = await resolveSkills(config);
  const caasApiUrl = config.caasApiUrl ?? DEFAULT_CAAS_API_URL;
  const startedAt = Date.now();
  const { getLastHeartbeat } = startHeartbeat(caasApiUrl, config.apiKey);

  return async function agentMiniAppMiddleware(
    req: { method: string; path: string; headers: Record<string, string | string[] | undefined> },
    res: {
      status: (code: number) => { json: (body: unknown) => void };
      json: (body: unknown) => void;
    },
    next: () => void
  ) {
    const pathname: string = req.path;

    if (pathname === `${CAAS_NAMESPACE}/handshake`) {
      return res.json(buildHandshake());
    }
    if (pathname === `${CAAS_NAMESPACE}/skills`) {
      return res.json(buildManifest(config, skills));
    }
    if (pathname === `${CAAS_NAMESPACE}/health`) {
      return res.json(buildHealth(startedAt, getLastHeartbeat()));
    }

    const skill = findMatchingSkill(pathname, req.method, skills);
    if (!skill) return next();

    const paymentHeader = req.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      return res.status(402).json(build402Body(skill, config.walletAddress));
    }

    if (config.facilitatorUrl) {
      const ok = await verifyPaymentAsync(paymentHeader, config.facilitatorUrl, skill);
      if (!ok) return res.status(402).json({ error: "payment_invalid" });
    }

    return next();
  };
}

export async function createNextMiddleware(config: AgentAppConfig) {
  const skills = await resolveSkills(config);
  const caasApiUrl = config.caasApiUrl ?? DEFAULT_CAAS_API_URL;
  const startedAt = Date.now();
  const { getLastHeartbeat } = startHeartbeat(caasApiUrl, config.apiKey);

  function jsonRes(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  return async function agentMiniAppMiddleware(
    request: { method: string; nextUrl: { pathname: string }; headers: { get: (name: string) => string | null } }
  ) {
    const pathname = request.nextUrl.pathname;

    if (pathname === `${CAAS_NAMESPACE}/handshake`) return jsonRes(buildHandshake());
    if (pathname === `${CAAS_NAMESPACE}/skills`)    return jsonRes(buildManifest(config, skills));
    if (pathname === `${CAAS_NAMESPACE}/health`)    return jsonRes(buildHealth(startedAt, getLastHeartbeat()));

    // next() — pass through to actual route handler
    const nextRes = () => new Response(null, { headers: { "x-middleware-next": "1" } });

    const skill = findMatchingSkill(pathname, request.method, skills);
    if (!skill) return nextRes();

    const paymentHeader = request.headers.get("x-payment");
    if (!paymentHeader) return jsonRes(build402Body(skill, config.walletAddress), 402);

    if (config.facilitatorUrl) {
      const ok = await verifyPaymentAsync(paymentHeader, config.facilitatorUrl, skill);
      if (!ok) return jsonRes({ error: "payment_invalid" }, 402);
    }

    return nextRes();
  };
}

export async function createFastifyPlugin(config: AgentAppConfig) {
  const skills = await resolveSkills(config);
  const caasApiUrl = config.caasApiUrl ?? DEFAULT_CAAS_API_URL;
  const startedAt = Date.now();
  const { getLastHeartbeat } = startHeartbeat(caasApiUrl, config.apiKey);

  type FastifyReply = {
    send: (body: unknown) => void;
    code: (n: number) => { send: (body: unknown) => void };
  };
  type FastifyRequest = {
    method: string;
    url: string;
    headers: Record<string, string | undefined>;
  };

  return async function agentMiniAppPlugin(fastify: {
    get: (path: string, handler: (req: FastifyRequest, reply: FastifyReply) => void) => void;
    addHook: (
      event: string,
      handler: (req: FastifyRequest, reply: FastifyReply, done: () => void) => void
    ) => void;
  }) {
    fastify.get(`${CAAS_NAMESPACE}/handshake`, (_, reply) => reply.send(buildHandshake()));
    fastify.get(`${CAAS_NAMESPACE}/skills`, (_, reply) => reply.send(buildManifest(config, skills)));
    fastify.get(`${CAAS_NAMESPACE}/health`, (_, reply) => reply.send(buildHealth(startedAt, getLastHeartbeat())));

    fastify.addHook("onRequest", async (req, reply, done) => {
      const skill = findMatchingSkill(req.url, req.method, skills);
      if (!skill) return done();
      const paymentHeader = req.headers["x-payment"];
      if (!paymentHeader) {
        return reply.code(402).send(build402Body(skill, config.walletAddress));
      }
      if (config.facilitatorUrl) {
        const ok = await verifyPaymentAsync(paymentHeader, config.facilitatorUrl, skill);
        if (!ok) return reply.code(402).send({ error: "payment_invalid" });
      }
      done();
    });
  };
}

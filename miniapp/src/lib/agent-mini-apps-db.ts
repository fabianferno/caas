import { createHash } from "crypto";
import { getMongoClient } from "./mongodb";
import type { ObjectId } from "mongodb";

export interface AgentMiniAppDoc {
  _id?: ObjectId;
  apiKeyHash: string;
  app: {
    name: string;
    description: string;
    icon: string;
    category: string;
    url: string;
    developer: string;
    version: string;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    route: string;
    method: string;
  }>;
  registeredAt: Date;
  lastHeartbeat: Date | null;
  status: "live" | "offline";
}

function collection() {
  return getMongoClient().db("caas").collection<AgentMiniAppDoc>("agent_mini_apps");
}

function hashKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function registerApp(
  apiKey: string,
  app: AgentMiniAppDoc["app"],
  skills: AgentMiniAppDoc["skills"]
): Promise<string> {
  await getMongoClient().connect();
  const col = collection();
  const apiKeyHash = hashKey(apiKey);

  const existing = await col.findOne({ apiKeyHash });
  if (existing) {
    await col.updateOne(
      { apiKeyHash },
      { $set: { app, skills, registeredAt: new Date() } }
    );
    return existing._id!.toString();
  }

  const result = await col.insertOne({
    apiKeyHash,
    app,
    skills,
    registeredAt: new Date(),
    lastHeartbeat: null,
    status: "offline",
  });
  return result.insertedId.toString();
}

export async function updateHeartbeat(apiKey: string): Promise<boolean> {
  await getMongoClient().connect();
  const col = collection();
  const result = await col.updateOne(
    { apiKeyHash: hashKey(apiKey) },
    { $set: { lastHeartbeat: new Date(), status: "live" } }
  );
  return result.modifiedCount > 0;
}

export async function listApps(): Promise<AgentMiniAppDoc[]> {
  await getMongoClient().connect();
  const col = collection();
  const cutoff = new Date(Date.now() - 60_000);
  await col.updateMany(
    { lastHeartbeat: { $lt: cutoff }, status: "live" },
    { $set: { status: "offline" } }
  );
  return col.find({}, { projection: { apiKeyHash: 0 } }).toArray();
}

export async function getAppSkills(id: string): Promise<AgentMiniAppDoc["skills"] | null> {
  await getMongoClient().connect();
  const { ObjectId } = await import("mongodb");
  const col = collection();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await col.findOne({ _id: oid }, { projection: { skills: 1 } });
  return doc?.skills ?? null;
}

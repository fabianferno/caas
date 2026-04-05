import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { Skill } from "../types";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
const VALID_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

interface OpenApiDoc {
  paths: Record<string, Record<string, { operationId?: string; summary?: string; description?: string }>>;
}

export async function parseOpenApiSpec(specPath: string, defaultPrice: string): Promise<Skill[]> {
  const abs = path.resolve(specPath);
  const raw = fs.readFileSync(abs, "utf-8");
  const ext = path.extname(abs).toLowerCase();
  const doc = (ext === ".yaml" || ext === ".yml" ? yaml.load(raw) : JSON.parse(raw)) as OpenApiDoc;

  const skills: Skill[] = [];

  for (const [route, methods] of Object.entries(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      const upperMethod = method.toUpperCase() as HttpMethod;
      if (!VALID_METHODS.includes(upperMethod)) continue;
      const id = operation.operationId ?? `${upperMethod.toLowerCase()}-${route.replace(/\//g, "-").replace(/^-/, "")}`;
      skills.push({
        id,
        name: operation.summary ?? id,
        description: operation.description ?? operation.summary ?? id,
        price: defaultPrice,
        route,
        method: upperMethod,
      });
    }
  }

  return skills;
}

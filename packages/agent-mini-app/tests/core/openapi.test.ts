import { describe, it, expect } from "vitest";
import path from "path";
import { parseOpenApiSpec } from "../../src/core/openapi";

const fixturePath = path.resolve(__dirname, "../fixtures/openapi.json");

describe("parseOpenApiSpec", () => {
  it("extracts skills from a JSON OpenAPI spec", async () => {
    const skills = await parseOpenApiSpec(fixturePath, "0.005");
    expect(skills).toHaveLength(2);
    const search = skills.find((s) => s.id === "searchItems");
    expect(search).toBeDefined();
    expect(search!.route).toBe("/api/search");
    expect(search!.method).toBe("GET");
    expect(search!.price).toBe("0.005");
    expect(search!.name).toBe("Search for items");
    expect(search!.description).toBe("Find items matching a query");
  });

  it("falls back to operationId as name if summary missing", async () => {
    const skills = await parseOpenApiSpec(fixturePath, "0.01");
    const book = skills.find((s) => s.id === "bookItem");
    expect(book!.name).toBe("Book an item");
  });
});

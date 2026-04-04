import type { RegisteredTool } from "../core/tools.js";

export class WebSearchTool {
  registerTool(): RegisteredTool {
    return {
      name: "web-search",
      description: "Search the web using DuckDuckGo. Returns top results with title, URL, and snippet.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          numResults: { type: "number", description: "Number of results (default 5)" },
        },
        required: ["query"],
      },
      handler: async (args: any): Promise<string> => {
        const query = args.query as string;
        const numResults = (args.numResults as number) || 5;
        try {
          const { search } = await import("duckduckgo-search");
          const results = await search(query, { maxResults: numResults });
          if (!results || results.length === 0) return "No results found.";
          return results
            .map((r: any, i: number) => `${i + 1}. **${r.title}**\n   ${r.href}\n   ${r.body}`)
            .join("\n\n");
        } catch (err) {
          return `Search error: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    };
  }
}

declare module "duckduckgo-search" {
  export interface SearchResult {
    title: string;
    href: string;
    body: string;
  }

  export function search(
    query: string,
    options?: { maxResults?: number }
  ): Promise<SearchResult[]>;
}

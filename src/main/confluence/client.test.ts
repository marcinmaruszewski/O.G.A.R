import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfluenceClient, ConfluenceAuthError, ConfluenceClientError, type ConfluencePage } from "./client.js";

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("ConfluenceClient.searchPages", () => {
  const baseUrl = "https://example.atlassian.net";
  const email = "user@example.com";
  const token = "tok-abc123";
  const expectedAuth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

  let fetcher: ReturnType<typeof vi.fn>;
  let client: ConfluenceClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new ConfluenceClient(baseUrl, email, token, fetcher);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends GET to /wiki/rest/api/search with encoded CQL and Basic auth header", async () => {
    const cql = 'space = "DEV" AND type = page';
    fetcher.mockResolvedValue(makeResponse(200, { results: [] }));

    await client.searchPages(cql);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`${baseUrl}/wiki/rest/api/search`);
    expect(url).toContain(encodeURIComponent(cql));
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(expectedAuth);
  });

  it("returns ConfluencePage[] parsed from the response body", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        results: [
          {
            content: { id: "12345", title: "Design Doc", type: "page" },
            resultGlobalContainer: { displayUrl: "", title: "DEV" },
            space: { key: "DEV" },
            excerpt: "This is the design...",
          },
          {
            content: { id: "67890", title: "Sprint Notes", type: "page" },
            space: { key: "TEAM" },
            excerpt: "Notes from the sprint",
          },
        ],
      })
    );

    const pages = await client.searchPages('type = page');

    expect(pages).toEqual<ConfluencePage[]>([
      { id: "12345", title: "Design Doc", spaceKey: "DEV", excerpt: "This is the design..." },
      { id: "67890", title: "Sprint Notes", spaceKey: "TEAM", excerpt: "Notes from the sprint" },
    ]);
  });

  it("throws ConfluenceAuthError on 401", async () => {
    fetcher.mockResolvedValue(makeResponse(401, { message: "Unauthorized" }));

    await expect(client.searchPages("type = page")).rejects.toThrow(ConfluenceAuthError);
  });

  it("throws ConfluenceClientError on other non-2xx responses", async () => {
    fetcher.mockResolvedValue(makeResponse(500, { message: "Server error" }));

    await expect(client.searchPages("type = page")).rejects.toThrow(ConfluenceClientError);
  });
});

describe("ConfluenceClient.getPageContent", () => {
  const baseUrl = "https://example.atlassian.net";
  const email = "user@example.com";
  const token = "tok-abc123";
  const expectedAuth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

  let fetcher: ReturnType<typeof vi.fn>;
  let client: ConfluenceClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new ConfluenceClient(baseUrl, email, token, fetcher);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends GET to /wiki/rest/api/content/{id} with storage expand and Basic auth header", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, { id: "12345", title: "Design Doc", body: { storage: { value: "<p>Hello</p>" } } })
    );

    await client.getPageContent("12345");

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${baseUrl}/wiki/rest/api/content/12345?expand=body.storage`);
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(expectedAuth);
  });

  it("returns the storage body value", async () => {
    const storageValue = "<p>This is the page <strong>content</strong>.</p>";
    fetcher.mockResolvedValue(
      makeResponse(200, { id: "12345", title: "Design Doc", body: { storage: { value: storageValue } } })
    );

    const content = await client.getPageContent("12345");

    expect(content).toBe(storageValue);
  });

  it("throws ConfluenceAuthError on 401", async () => {
    fetcher.mockResolvedValue(makeResponse(401, {}));

    await expect(client.getPageContent("12345")).rejects.toThrow(ConfluenceAuthError);
  });

  it("throws ConfluenceClientError on other non-2xx responses", async () => {
    fetcher.mockResolvedValue(makeResponse(404, {}));

    await expect(client.getPageContent("12345")).rejects.toThrow(ConfluenceClientError);
  });
});

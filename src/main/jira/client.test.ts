import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JiraClient, JiraAuthError, JiraClientError } from "./client.js";

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("JiraClient.searchIssues", () => {
  const baseUrl = "https://example.atlassian.net/rest/api/3";
  const email = "user@example.com";
  const token = "tok-abc123";
  const expectedAuth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

  let fetcher: ReturnType<typeof vi.fn>;
  let client: JiraClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new JiraClient(baseUrl, email, token, fetcher);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends GET to /search with encoded JQL and Basic auth header", async () => {
    const jql = "assignee = currentUser() AND sprint in openSprints()";
    fetcher.mockResolvedValue(
      makeResponse(200, { issues: [] })
    );

    await client.searchIssues(jql);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`${baseUrl}/search`);
    expect(url).toContain(encodeURIComponent(jql));
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(expectedAuth);
  });

  it("returns JiraIssue[] parsed from the response body", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        issues: [
          { key: "PROJ-1", id: "10001", fields: { summary: "Fix login bug" } },
          { key: "PROJ-2", id: "10002", fields: { summary: "Add dark mode" } },
        ],
      })
    );

    const issues = await client.searchIssues("project = PROJ");

    expect(issues).toEqual([
      { key: "PROJ-1", id: "10001", summary: "Fix login bug" },
      { key: "PROJ-2", id: "10002", summary: "Add dark mode" },
    ]);
  });

  it("throws JiraAuthError on 401", async () => {
    fetcher.mockResolvedValue(makeResponse(401, { errorMessages: ["Unauthorized"] }));

    await expect(client.searchIssues("project = PROJ")).rejects.toThrow(JiraAuthError);
  });

  it("throws JiraClientError on other non-2xx responses", async () => {
    fetcher.mockResolvedValue(makeResponse(500, { errorMessages: ["Server error"] }));

    await expect(client.searchIssues("project = PROJ")).rejects.toThrow(JiraClientError);
  });
});

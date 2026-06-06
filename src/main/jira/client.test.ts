import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JiraClient, JiraAuthError, JiraClientError, type JiraTransition } from "./client.js";

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

describe("JiraClient.getTransitions", () => {
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

  it("sends GET to /issue/{key}/transitions with Basic auth header", async () => {
    fetcher.mockResolvedValue(makeResponse(200, { transitions: [] }));

    await client.getTransitions("PROJ-1");

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${baseUrl}/issue/PROJ-1/transitions`);
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(expectedAuth);
  });

  it("returns JiraTransition[] parsed from the response body", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        transitions: [
          { id: "21", name: "In Progress" },
          { id: "31", name: "Done" },
        ],
      })
    );

    const transitions = await client.getTransitions("PROJ-1");

    expect(transitions).toEqual<JiraTransition[]>([
      { id: "21", name: "In Progress" },
      { id: "31", name: "Done" },
    ]);
  });

  it("throws JiraAuthError on 401", async () => {
    fetcher.mockResolvedValue(makeResponse(401, {}));
    await expect(client.getTransitions("PROJ-1")).rejects.toThrow(JiraAuthError);
  });

  it("throws JiraClientError on other non-2xx responses", async () => {
    fetcher.mockResolvedValue(makeResponse(500, {}));
    await expect(client.getTransitions("PROJ-1")).rejects.toThrow(JiraClientError);
  });
});

describe("JiraClient.getMyself", () => {
  const baseUrl = "https://example.atlassian.net/rest/api/3";
  const email = "user@example.com";
  const token = "tok-abc123";

  let fetcher: ReturnType<typeof vi.fn>;
  let client: JiraClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new JiraClient(baseUrl, email, token, fetcher);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns accountId from /myself", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, { accountId: "5b10a2844c20165700ede21g", displayName: "Alice" })
    );

    const myself = await client.getMyself();

    expect(myself.accountId).toBe("5b10a2844c20165700ede21g");
    const [url] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${baseUrl}/myself`);
  });

  it("throws JiraAuthError on 401", async () => {
    fetcher.mockResolvedValue(makeResponse(401, {}));
    await expect(client.getMyself()).rejects.toThrow(JiraAuthError);
  });
});

describe("JiraClient.applyTransition", () => {
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

  it("sends POST to /issue/{key}/transitions with transitionId in body", async () => {
    fetcher.mockResolvedValue({ ok: true, status: 204 } as Response);

    await client.applyTransition("PROJ-1", "21");

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${baseUrl}/issue/PROJ-1/transitions`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(expectedAuth);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ transition: { id: "21" } });
  });

  it("resolves without a value on 204", async () => {
    fetcher.mockResolvedValue({ ok: true, status: 204 } as Response);
    await expect(client.applyTransition("PROJ-1", "21")).resolves.toBeUndefined();
  });

  it("throws JiraAuthError on 401", async () => {
    fetcher.mockResolvedValue({ ok: false, status: 401 } as Response);
    await expect(client.applyTransition("PROJ-1", "21")).rejects.toThrow(JiraAuthError);
  });

  it("throws JiraClientError on other non-2xx responses", async () => {
    fetcher.mockResolvedValue({ ok: false, status: 400 } as Response);
    await expect(client.applyTransition("PROJ-1", "21")).rejects.toThrow(JiraClientError);
  });
});

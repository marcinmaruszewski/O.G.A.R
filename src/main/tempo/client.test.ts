import { describe, expect, it, vi } from "vitest";
import { TempoClient, TempoAuthError, TempoClientError, type TempoWorklog } from "./client.js";

function makeFetch(status: number, body: unknown = {}): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

const BASE = "https://api.tempo.io/4";

describe("TempoClient.postWorklog", () => {
  it("posts worklog with correct payload and returns worklog id", async () => {
    const fetcher = makeFetch(200, { tempoWorklogId: 42 });
    const client = new TempoClient("secret-token", BASE, fetcher);

    const id = await client.postWorklog({
      issueId: "10001",
      accountId: "abc-123",
      timeSpentSeconds: 3600,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "Implemented feature X",
    });

    expect(id).toBe(42);

    const [url, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/worklogs`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      issueId: "10001",
      authorAccountId: "abc-123",
      timeSpentSeconds: 3600,
      startDate: "2026-06-06",
      description: "Implemented feature X",
    });
  });

  it("throws TempoAuthError on 401", async () => {
    const client = new TempoClient("bad-token", BASE, makeFetch(401));
    await expect(
      client.postWorklog({
        issueId: "10001",
        accountId: "abc",
        timeSpentSeconds: 1800,
        startedAt: "2026-06-06T10:00:00.000+0000",
        description: "work",
      })
    ).rejects.toThrow(TempoAuthError);
  });

  it("throws TempoClientError on other non-ok status", async () => {
    const client = new TempoClient("token", BASE, makeFetch(500));
    await expect(
      client.postWorklog({
        issueId: "10001",
        accountId: "abc",
        timeSpentSeconds: 1800,
        startedAt: "2026-06-06T10:00:00.000+0000",
        description: "work",
      })
    ).rejects.toThrow(TempoClientError);
  });
});

describe("TempoClient.listWorklogs", () => {
  const existingWorklogs: TempoWorklog[] = [
    { tempoWorklogId: 10, issueId: "10001", timeSpentSeconds: 3600, startDate: "2026-06-06" },
    { tempoWorklogId: 11, issueId: "10002", timeSpentSeconds: 1800, startDate: "2026-06-06" },
  ];

  it("fetches worklogs for author+date with correct request", async () => {
    const fetcher = makeFetch(200, { results: existingWorklogs });
    const client = new TempoClient("secret-token", BASE, fetcher);

    const results = await client.listWorklogs("abc-123", "2026-06-06");

    expect(results).toEqual(existingWorklogs);

    const [url, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`${BASE}/worklogs`);
    expect(url).toContain("authorAccountId=abc-123");
    expect(url).toContain("from=2026-06-06");
    expect(url).toContain("to=2026-06-06");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer secret-token");
  });

  it("returns empty array when no worklogs exist", async () => {
    const client = new TempoClient("token", BASE, makeFetch(200, { results: [] }));
    const results = await client.listWorklogs("abc-123", "2026-06-06");
    expect(results).toEqual([]);
  });

  it("throws TempoAuthError on 401", async () => {
    const client = new TempoClient("bad-token", BASE, makeFetch(401));
    await expect(client.listWorklogs("abc-123", "2026-06-06")).rejects.toThrow(TempoAuthError);
  });

  it("throws TempoClientError on other non-ok status", async () => {
    const client = new TempoClient("token", BASE, makeFetch(500));
    await expect(client.listWorklogs("abc-123", "2026-06-06")).rejects.toThrow(TempoClientError);
  });
});

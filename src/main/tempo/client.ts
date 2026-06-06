export class TempoAuthError extends Error {
  constructor(message = "Tempo authentication failed — check tempoToken") {
    super(message);
    this.name = "TempoAuthError";
  }
}

export class TempoClientError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "TempoClientError";
  }
}

export interface WorklogPayload {
  issueId: string;
  accountId: string;
  timeSpentSeconds: number;
  /** ISO datetime string, e.g. "2026-06-06T09:00:00.000+0000" */
  startedAt: string;
  description: string;
}

export interface TempoWorklog {
  tempoWorklogId: number;
  issueId: string;
  timeSpentSeconds: number;
  startDate: string;
}

type Fetcher = typeof fetch;

export class TempoClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl: string,
    private readonly fetcher: Fetcher = fetch
  ) {}

  async postWorklog(payload: WorklogPayload): Promise<number> {
    const startDate = payload.startedAt.slice(0, 10);

    const response = await this.fetcher(`${this.baseUrl}/worklogs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        issueId: payload.issueId,
        authorAccountId: payload.accountId,
        timeSpentSeconds: payload.timeSpentSeconds,
        startDate,
        description: payload.description,
      }),
    });

    if (response.status === 401) throw new TempoAuthError();
    if (!response.ok) throw new TempoClientError(response.status, `Tempo API error: ${response.status}`);

    const body = (await response.json()) as { tempoWorklogId: number };
    return body.tempoWorklogId;
  }

  async listWorklogs(accountId: string, date: string): Promise<TempoWorklog[]> {
    const url = `${this.baseUrl}/worklogs?from=${date}&to=${date}&authorAccountId=${accountId}`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) throw new TempoAuthError();
    if (!response.ok) throw new TempoClientError(response.status, `Tempo API error: ${response.status}`);

    const body = (await response.json()) as { results: TempoWorklog[] };
    return body.results;
  }
}

export interface JiraIssue {
  key: string;
  id: string;
  summary: string;
}

export interface JiraTransition {
  id: string;
  name: string;
}

export class JiraAuthError extends Error {
  constructor(message = "Jira authentication failed — check jiraEmail and jiraToken") {
    super(message);
    this.name = "JiraAuthError";
  }
}

export class JiraClientError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "JiraClientError";
  }
}

type Fetcher = typeof fetch;

export class JiraClient {
  private readonly auth: string;

  constructor(
    private readonly baseUrl: string,
    email: string,
    token: string,
    private readonly fetcher: Fetcher = fetch
  ) {
    this.auth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  }

  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const url = `${this.baseUrl}/issue/${issueKey}/transitions`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: this.auth,
        Accept: "application/json",
      },
    });

    if (response.status === 401) throw new JiraAuthError();
    if (!response.ok) throw new JiraClientError(response.status, `Jira API error: ${response.status}`);

    const body = (await response.json()) as { transitions: Array<{ id: string; name: string }> };
    return body.transitions.map((t) => ({ id: t.id, name: t.name }));
  }

  async applyTransition(issueKey: string, transitionId: string): Promise<void> {
    const url = `${this.baseUrl}/issue/${issueKey}/transitions`;
    const response = await this.fetcher(url, {
      method: "POST",
      headers: {
        Authorization: this.auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ transition: { id: transitionId } }),
    });

    if (response.status === 401) throw new JiraAuthError();
    if (!response.ok) throw new JiraClientError(response.status, `Jira API error: ${response.status}`);
  }

  async getMyself(): Promise<{ accountId: string }> {
    const url = `${this.baseUrl}/myself`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: this.auth,
        Accept: "application/json",
      },
    });

    if (response.status === 401) throw new JiraAuthError();
    if (!response.ok) throw new JiraClientError(response.status, `Jira API error: ${response.status}`);

    const body = (await response.json()) as { accountId: string };
    return { accountId: body.accountId };
  }

  async postComment(issueKey: string, text: string): Promise<void> {
    const url = `${this.baseUrl}/issue/${issueKey}/comment`;
    const body = {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text }],
          },
        ],
      },
    };
    const response = await this.fetcher(url, {
      method: "POST",
      headers: {
        Authorization: this.auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) throw new JiraAuthError();
    if (!response.ok) throw new JiraClientError(response.status, `Jira API error: ${response.status}`);
  }

  async searchIssues(jql: string): Promise<JiraIssue[]> {
    const url = `${this.baseUrl}/search?jql=${encodeURIComponent(jql)}&fields=id,key,summary`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: this.auth,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      throw new JiraAuthError();
    }

    if (!response.ok) {
      throw new JiraClientError(response.status, `Jira API error: ${response.status}`);
    }

    const body = (await response.json()) as {
      issues: Array<{ key: string; id: string; fields: { summary: string } }>;
    };

    return body.issues.map((issue) => ({
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
    }));
  }
}

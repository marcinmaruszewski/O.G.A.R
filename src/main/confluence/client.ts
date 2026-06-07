export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  excerpt: string;
}

export class ConfluenceAuthError extends Error {
  constructor(message = "Confluence authentication failed — check confluenceEmail and confluenceToken") {
    super(message);
    this.name = "ConfluenceAuthError";
  }
}

export class ConfluenceClientError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ConfluenceClientError";
  }
}

type Fetcher = typeof fetch;

export class ConfluenceClient {
  private readonly auth: string;

  constructor(
    private readonly baseUrl: string,
    email: string,
    token: string,
    private readonly fetcher: Fetcher = fetch
  ) {
    this.auth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  }

  async searchPages(cql: string): Promise<ConfluencePage[]> {
    const url = `${this.baseUrl}/wiki/rest/api/search?cql=${encodeURIComponent(cql)}`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: this.auth,
        Accept: "application/json",
      },
    });

    if (response.status === 401) throw new ConfluenceAuthError();
    if (!response.ok) throw new ConfluenceClientError(response.status, `Confluence API error: ${response.status}`);

    const body = (await response.json()) as {
      results: Array<{
        content: { id: string; title: string };
        space: { key: string };
        excerpt: string;
      }>;
    };

    return body.results.map((r) => ({
      id: r.content.id,
      title: r.content.title,
      spaceKey: r.space.key,
      excerpt: r.excerpt,
    }));
  }

  async getPageContent(pageId: string): Promise<string> {
    const url = `${this.baseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage`;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: this.auth,
        Accept: "application/json",
      },
    });

    if (response.status === 401) throw new ConfluenceAuthError();
    if (!response.ok) throw new ConfluenceClientError(response.status, `Confluence API error: ${response.status}`);

    const body = (await response.json()) as { body: { storage: { value: string } } };
    return body.body.storage.value;
  }
}

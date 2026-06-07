export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
}

export interface LlmModel {
  id: string;
}

export interface ChatOptions {
  model: string;
}

export class LlmEndpointUnreachableError extends Error {
  constructor(message = "LLM endpoint is unreachable — ensure Ollama (or your local engine) is running") {
    super(message);
    this.name = "LlmEndpointUnreachableError";
  }
}

export class LlmClientError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "LlmClientError";
  }
}

type Fetcher = typeof fetch;

export class LlmClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: Fetcher = fetch
  ) {}

  async listModels(): Promise<LlmModel[]> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/v1/models`, { method: "GET" });
    } catch {
      throw new LlmEndpointUnreachableError();
    }

    if (!response.ok) throw new LlmClientError(response.status, `LLM API error: ${response.status}`);

    const body = (await response.json()) as { data: Array<{ id: string }> };
    return body.data.map((m) => ({ id: m.id }));
  }

  async health(): Promise<boolean> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/v1/models`, { method: "GET" });
    } catch {
      throw new LlmEndpointUnreachableError();
    }

    if (!response.ok) throw new LlmEndpointUnreachableError(`LLM endpoint returned ${response.status}`);

    return true;
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ model: options.model, messages }),
      });
    } catch {
      throw new LlmEndpointUnreachableError();
    }

    if (!response.ok) throw new LlmClientError(response.status, `LLM API error: ${response.status}`);

    const body = (await response.json()) as {
      choices: Array<{ message: { role: string; content: string } }>;
    };
    const first = body.choices[0];
    if (!first) throw new LlmClientError(response.status, "LLM response contained no choices");
    return { content: first.message.content };
  }
}

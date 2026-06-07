import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LlmClient,
  LlmEndpointUnreachableError,
  LlmClientError,
  type ChatMessage,
  type LlmModel,
} from "./client.js";

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("LlmClient.listModels", () => {
  let fetcher: ReturnType<typeof vi.fn>;
  let client: LlmClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new LlmClient("http://localhost:11434", fetcher);
  });

  afterEach(() => vi.clearAllMocks());

  it("sends GET to /v1/models", async () => {
    fetcher.mockResolvedValue(makeResponse(200, { object: "list", data: [] }));

    await client.listModels();

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/v1/models");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("returns array of model ids from response data", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        object: "list",
        data: [
          { id: "llama3:latest", object: "model" },
          { id: "mistral:7b", object: "model" },
        ],
      })
    );

    const models = await client.listModels();

    expect(models).toEqual<LlmModel[]>([{ id: "llama3:latest" }, { id: "mistral:7b" }]);
  });

  it("throws LlmClientError on non-200 response", async () => {
    fetcher.mockResolvedValue(makeResponse(500, { error: "internal" }));

    await expect(client.listModels()).rejects.toThrow(LlmClientError);
  });

  it("throws LlmEndpointUnreachableError when fetch itself throws (network error)", async () => {
    fetcher.mockRejectedValue(new TypeError("fetch failed"));

    await expect(client.listModels()).rejects.toThrow(LlmEndpointUnreachableError);
  });
});

describe("LlmClient.health", () => {
  let fetcher: ReturnType<typeof vi.fn>;
  let client: LlmClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new LlmClient("http://localhost:11434", fetcher);
  });

  afterEach(() => vi.clearAllMocks());

  it("returns true when the models endpoint responds successfully", async () => {
    fetcher.mockResolvedValue(makeResponse(200, { object: "list", data: [] }));

    const result = await client.health();

    expect(result).toBe(true);
  });

  it("throws LlmEndpointUnreachableError when the endpoint is unreachable", async () => {
    fetcher.mockRejectedValue(new TypeError("fetch failed"));

    await expect(client.health()).rejects.toThrow(LlmEndpointUnreachableError);
  });

  it("throws LlmEndpointUnreachableError when the endpoint returns non-200", async () => {
    fetcher.mockResolvedValue(makeResponse(503, {}));

    await expect(client.health()).rejects.toThrow(LlmEndpointUnreachableError);
  });
});

describe("LlmClient.chat", () => {
  let fetcher: ReturnType<typeof vi.fn>;
  let client: LlmClient;

  beforeEach(() => {
    fetcher = vi.fn();
    client = new LlmClient("http://localhost:11434", fetcher);
  });

  afterEach(() => vi.clearAllMocks());

  const messages: ChatMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What should I do on ABC-123?" },
  ];

  it("sends POST to /v1/chat/completions with messages and model", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        choices: [{ message: { role: "assistant", content: "Work on the task." } }],
      })
    );

    await client.chat(messages, { model: "llama3:latest" });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual(messages);
    expect(body.model).toBe("llama3:latest");
  });

  it("returns the assistant message content from the first choice", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        choices: [{ message: { role: "assistant", content: "Here is your answer." } }],
      })
    );

    const result = await client.chat(messages, { model: "llama3:latest" });

    expect(result.content).toBe("Here is your answer.");
  });

  it("throws LlmEndpointUnreachableError when fetch itself throws", async () => {
    fetcher.mockRejectedValue(new TypeError("fetch failed"));

    await expect(client.chat(messages, { model: "llama3:latest" })).rejects.toThrow(LlmEndpointUnreachableError);
  });

  it("throws LlmClientError on non-200 response", async () => {
    fetcher.mockResolvedValue(makeResponse(400, { error: { message: "invalid model" } }));

    await expect(client.chat(messages, { model: "bad-model" })).rejects.toThrow(LlmClientError);
  });

  it("includes Accept and Content-Type headers", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        choices: [{ message: { role: "assistant", content: "ok" } }],
      })
    );

    await client.chat(messages, { model: "llama3:latest" });

    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Accept"]).toBe("application/json");
  });
});

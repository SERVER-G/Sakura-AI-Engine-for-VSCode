/**
 * NormalizedToOpenAI マッパーのユニットテスト
 */
import { normalizedToOpenAI } from "../../src/mapping/NormalizedToOpenAI";
import { NormalizedMessage } from "../../src/types/normalized";

describe("normalizedToOpenAI", () => {
  test("システムメッセージを変換する", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "system",
        parts: [{ kind: "text", text: "You are a helpful assistant." }],
      },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ role: "system", content: "You are a helpful assistant." });
  });

  test("テキストのみのユーザーメッセージを文字列で変換する", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "user",
        parts: [{ kind: "text", text: "こんにちは" }],
      },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ role: "user", content: "こんにちは" });
  });

  test("画像付きユーザーメッセージを content array で変換する", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "user",
        parts: [
          { kind: "text", text: "この画像は？" },
          { kind: "image", mime: "image/png", dataUrl: "data:image/png;base64,abc" },
        ],
      },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(1);
    const msg = result[0] as { role: string; content: unknown[] };
    expect(msg.role).toBe("user");
    expect(Array.isArray(msg.content)).toBe(true);
    expect(msg.content[0]).toEqual({ type: "text", text: "この画像は？" });
    expect(msg.content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,abc" },
    });
  });

  test("アシスタントメッセージを変換する", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "assistant",
        parts: [{ kind: "text", text: "はい、お答えします。" }],
      },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ role: "assistant", content: "はい、お答えします。" });
  });

  test("tool call を含むアシスタントメッセージを変換する", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "assistant",
        parts: [
          {
            kind: "tool-call",
            callId: "call-1",
            name: "workspace_readFile",
            input: { path: "src/index.ts" },
          },
        ],
      },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(1);
    const msg = result[0] as { role: string; tool_calls: unknown[] };
    expect(msg.role).toBe("assistant");
    expect(msg.tool_calls).toHaveLength(1);
    expect(msg.tool_calls[0]).toMatchObject({
      id: "call-1",
      type: "function",
      function: {
        name: "workspace_readFile",
        arguments: '{"path":"src/index.ts"}',
      },
    });
  });

  test("tool result メッセージを変換する", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "tool",
        parts: [
          {
            kind: "tool-result",
            callId: "call-1",
            content: [{ type: "text", text: "file content here" }],
          },
        ],
      },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      role: "tool",
      tool_call_id: "call-1",
    });
  });

  test("複数のメッセージを正しい順序で変換する", () => {
    const messages: NormalizedMessage[] = [
      { role: "system", parts: [{ kind: "text", text: "System prompt" }] },
      { role: "user", parts: [{ kind: "text", text: "Hello" }] },
      { role: "assistant", parts: [{ kind: "text", text: "Hi there!" }] },
    ];

    const result = normalizedToOpenAI(messages);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ role: "system" });
    expect(result[1]).toMatchObject({ role: "user" });
    expect(result[2]).toMatchObject({ role: "assistant" });
  });
});

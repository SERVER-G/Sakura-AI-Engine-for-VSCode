/**
 * TelemetryRedaction のユニットテスト
 */
import { redactApiKey, redactAuthHeader, redactRequestBody } from "../../src/diagnostics/TelemetryRedaction";

describe("redactApiKey", () => {
  test("UUID:secret 形式の API キーを秘匿化する", () => {
    const apiKey = "12345678-1234-1234-1234-123456789abc:mysecretkey123";
    const text = "Connecting with key: " + apiKey;
    const result = redactApiKey(text);
    expect(result).not.toContain("mysecretkey123");
    expect(result).toContain("[REDACTED]");
  });

  test("API キーを含まないテキストはそのまま返す", () => {
    const text = "通常のテキストメッセージ";
    expect(redactApiKey(text)).toBe(text);
  });

  test("ログメッセージ中の API キーを秘匿化する", () => {
    const apiKey = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:secret123456";
    const text = "Connecting with key: " + apiKey + " to server";
    const result = redactApiKey(text);
    expect(result).not.toContain("secret123456");
    expect(result).toContain("[REDACTED]");
  });
});

describe("redactAuthHeader", () => {
  test("Authorization ヘッダーを秘匿化する", () => {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "******",
    };
    const result = redactAuthHeader(headers);
    expect(result["Authorization"]).not.toContain("my-secret-api-key");
    expect(result["Authorization"]).toContain("[REDACTED]");
    expect(result["Content-Type"]).toBe("application/json");
  });

  test("Authorization ヘッダーがない場合はそのまま返す", () => {
    const headers = { "Content-Type": "application/json" };
    const result = redactAuthHeader(headers);
    expect(result).toEqual(headers);
  });
});

describe("redactRequestBody", () => {
  test("messages の content を秘匿化する", () => {
    const body = {
      model: "preview/Kimi-K2.6",
      messages: [
        { role: "user", content: "秘密のプロンプト" },
      ],
    };
    const result = redactRequestBody(body);
    const messages = result["messages"] as Array<{ content: string }>;
    expect(messages[0].content).toBe("[REDACTED]");
  });

  test("model は秘匿化しない", () => {
    const body = { model: "preview/Kimi-K2.6", messages: [] };
    const result = redactRequestBody(body);
    expect(result["model"]).toBe("preview/Kimi-K2.6");
  });
});

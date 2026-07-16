/**
 * ErrorMapper のユニットテスト
 */
import { mapTransportError, calculateRetryDelayMs, toUserMessage } from "../../src/mapping/ErrorMapper";
import { SakuraError } from "../../src/types/errors";

describe("mapTransportError", () => {
  test("SakuraError をそのまま返す", () => {
    const err = new SakuraError("UpstreamAuthError", "auth error");
    const result = mapTransportError(err);
    expect(result).toBe(err);
  });

  test("AbortError を CancelledError に変換する", () => {
    const err = new Error("abort");
    err.name = "AbortError";
    const result = mapTransportError(err);
    expect(result.kind).toBe("CancelledError");
    expect(result.retryable).toBe(false);
  });

  test("一般的なネットワークエラーを TransportError に変換する", () => {
    const err = new Error("Failed to fetch");
    const result = mapTransportError(err);
    expect(result.kind).toBe("TransportError");
    expect(result.retryable).toBe(true);
  });

  test("非 Error オブジェクトを TransportError に変換する", () => {
    const result = mapTransportError("some string error");
    expect(result.kind).toBe("TransportError");
  });
});

describe("calculateRetryDelayMs", () => {
  test("Retry-After が指定された場合はその値を使用する", () => {
    const delay = calculateRetryDelayMs(0, 30);
    expect(delay).toBe(30_000);
  });

  test("Retry-After がない場合は指数バックオフを使用する", () => {
    const delay0 = calculateRetryDelayMs(0);
    const delay1 = calculateRetryDelayMs(1);
    const delay2 = calculateRetryDelayMs(2);

    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    // 最大 30 秒 + jitter を超えない
    expect(delay2).toBeLessThan(40_000);
  });
});

describe("toUserMessage", () => {
  test("各エラー種別の日本語メッセージを返す", () => {
    expect(toUserMessage("UpstreamBadRequestError")).toContain("リクエスト形式");
    expect(toUserMessage("UpstreamAuthError")).toContain("API キー");
    expect(toUserMessage("UpstreamRateLimitError")).toContain("制限");
    expect(toUserMessage("UpstreamServerError")).toContain("障害");
    expect(toUserMessage("TransportError")).toContain("ネットワーク");
    expect(toUserMessage("CancelledError")).toContain("キャンセル");
    expect(toUserMessage("ConfigurationError")).toContain("設定");
    expect(toUserMessage("UnknownError")).toContain("予期しない");
  });
});

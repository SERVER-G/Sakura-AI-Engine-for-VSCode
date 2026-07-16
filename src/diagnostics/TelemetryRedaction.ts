/**
 * テレメトリ秘匿化
 * ログやデバッグ出力から機密情報を除去する
 */

const REDACTED = "[REDACTED]";

/**
 * API キーを秘匿化する
 */
export function redactApiKey(text: string): string {
  // UUID:secret 形式のトークンを秘匿化
  return text.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[^\s"']+/gi,
    REDACTED
  );
}

/**
 * Authorization ヘッダーを秘匿化する
 */
export function redactAuthHeader(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "authorization") {
      result[key] = "Bearer " + REDACTED;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * リクエストボディから機密データを除去する (デバッグログ用)
 * messages の content、tool arguments は除去される
 */
export function redactRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const result = { ...body };

  if (Array.isArray(result["messages"])) {
    result["messages"] = (result["messages"] as unknown[]).map((msg) => {
      if (typeof msg !== "object" || msg === null) return msg;
      const m = msg as Record<string, unknown>;
      return {
        role: m["role"],
        content: typeof m["content"] === "string"
          ? REDACTED
          : Array.isArray(m["content"])
          ? m["content"].map(() => ({ type: REDACTED }))
          : m["content"],
      };
    });
  }

  if (Array.isArray(result["tools"])) {
    result["tools"] = (result["tools"] as unknown[]).map((tool) => {
      if (typeof tool !== "object" || tool === null) return tool;
      const t = tool as Record<string, unknown>;
      if (typeof t["function"] === "object" && t["function"] !== null) {
        const fn = t["function"] as Record<string, unknown>;
        return {
          ...t,
          function: {
            ...fn,
            description: REDACTED,
          },
        };
      }
      return tool;
    });
  }

  return result;
}

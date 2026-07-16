/**
 * JSON ユーティリティ
 * 安全な JSON パースと変換
 */

/**
 * JSON 文字列を安全にパースする。失敗時は undefined を返す
 */
export function safeJsonParse<T = unknown>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * 値を JSON 文字列に変換する。失敗時は undefined を返す
 */
export function safeJsonStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

/**
 * 文字列が JSON オブジェクトとして妥当かチェックする
 */
export function isValidJsonObject(text: string): boolean {
  const parsed = safeJsonParse(text);
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
}

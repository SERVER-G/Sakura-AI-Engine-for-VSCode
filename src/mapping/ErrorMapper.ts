/**
 * エラーマッパー
 * HTTP ステータスコードと upstream エラーを日本語 UI メッセージに変換する
 */
import { SakuraError, SakuraErrorKind, UpstreamErrorShape } from "../types/errors.js";
import { SakuraErrorResponse } from "../types/sakura.js";
import { safeJsonParse } from "../util/Json.js";

/**
 * HTTP レスポンスから SakuraError を生成する
 */
export async function mapHttpError(response: Response): Promise<SakuraError> {
  const status = response.status;
  const bodyText = await response.text().catch(() => "");
  const errorBody = safeJsonParse<SakuraErrorResponse>(bodyText);
  const upstreamMessage = errorBody?.error?.message ?? errorBody?.message ?? bodyText;

  const retryAfterSec = parseRetryAfter(response.headers.get("Retry-After"));

  const upstream: UpstreamErrorShape = {
    status,
    message: upstreamMessage,
    ...(errorBody?.error?.code !== undefined ? { code: errorBody.error.code } : {}),
    ...(errorBody?.error?.type !== undefined ? { type: errorBody.error.type } : {}),
    ...(retryAfterSec !== undefined ? { retryAfterSec } : {}),
  };

  switch (status) {
    case 400:
      return new SakuraError(
        "UpstreamBadRequestError",
        "リクエスト形式またはモデルが未対応パラメータを含んでいます。設定を確認してください。",
        upstream,
        false
      );
    case 401:
      return new SakuraError(
        "UpstreamAuthError",
        "API キーが無効、失効、または権限が不足しています。「Sakura AI Engine: API キーを設定」で正しいキーを入力してください。",
        upstream,
        false
      );
    case 403:
      return new SakuraError(
        "UpstreamAuthError",
        "このリソースへのアクセスが拒否されました。アカウントの権限を確認してください。",
        upstream,
        false
      );
    case 429:
      return new SakuraError(
        "UpstreamRateLimitError",
        "使いすぎのため一時的に制限されています。しばらく待ってから再試行してください。",
        upstream,
        true
      );
    case 500:
    case 503:
    case 504:
      return new SakuraError(
        "UpstreamServerError",
        `Sakura AI Engine 側で障害またはタイムアウトが発生しています (${status})。しばらく待ってから再試行してください。`,
        upstream,
        true
      );
    default:
      return new SakuraError(
        "UnknownError",
        `予期しないエラーが発生しました (HTTP ${status})。`,
        upstream,
        status >= 500
      );
  }
}

/**
 * ネットワーク / 転送エラーを SakuraError に変換する
 */
export function mapTransportError(err: unknown): SakuraError {
  if (err instanceof SakuraError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const isAbort = err instanceof Error && (err.name === "AbortError" || message.includes("キャンセル"));

  if (isAbort) {
    return new SakuraError(
      "CancelledError",
      "操作がキャンセルされました。",
      { message },
      false
    );
  }

  return new SakuraError(
    "TransportError",
    `ネットワークまたは証明書の問題が発生しました: ${message}`,
    { message },
    true
  );
}

/**
 * Retry-After ヘッダーをパースして秒数を返す
 */
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds > 0) return seconds;
  // HTTP-date 形式の場合
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const diffSec = Math.ceil((date.getTime() - Date.now()) / 1000);
    return diffSec > 0 ? diffSec : undefined;
  }
  return undefined;
}

/**
 * リトライ待機時間を計算する (指数バックオフ + jitter)
 */
export function calculateRetryDelayMs(
  attempt: number,
  retryAfterSec?: number
): number {
  if (retryAfterSec !== undefined) {
    return retryAfterSec * 1000;
  }
  const base = Math.min(1000 * Math.pow(2, attempt), 30_000);
  const jitter = Math.random() * 0.3 * base;
  return Math.floor(base + jitter);
}

export function toUserMessage(kind: SakuraErrorKind): string {
  switch (kind) {
    case "UpstreamBadRequestError":
      return "リクエスト形式またはモデルが未対応パラメータを含んでいます";
    case "UpstreamAuthError":
      return "API キーが無効、失効、または権限が不足しています";
    case "UpstreamRateLimitError":
      return "使いすぎのため一時的に制限されています";
    case "UpstreamServerError":
      return "Sakura AI Engine 側で障害またはタイムアウトが発生しています";
    case "TransportError":
      return "ネットワークまたは証明書の問題が発生しました";
    case "CancelledError":
      return "操作がキャンセルされました";
    case "ConfigurationError":
      return "設定に問題があります";
    default:
      return "予期しないエラーが発生しました";
  }
}

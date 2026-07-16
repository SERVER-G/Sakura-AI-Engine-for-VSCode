/**
 * エラー型定義
 * Sakura API エラーを VS Code 向けに変換するための型
 */

export type SakuraErrorKind =
  | "UpstreamBadRequestError"
  | "UpstreamAuthError"
  | "UpstreamRateLimitError"
  | "UpstreamServerError"
  | "TransportError"
  | "CancelledError"
  | "ConfigurationError"
  | "UnknownError";

export interface UpstreamErrorShape {
  status?: number;
  code?: string;
  type?: string;
  message: string;
  retryAfterSec?: number;
}

export class SakuraError extends Error {
  constructor(
    public readonly kind: SakuraErrorKind,
    message: string,
    public readonly upstream?: UpstreamErrorShape,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "SakuraError";
  }
}

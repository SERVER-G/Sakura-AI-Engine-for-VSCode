/**
 * HTTP クライアント
 * Sakura AI Engine への HTTP リクエストを送信する
 */
import { mapHttpError, mapTransportError, calculateRetryDelayMs } from "../mapping/ErrorMapper.js";
import { SakuraError } from "../types/errors.js";
import { Logger } from "../diagnostics/Logger.js";
import { anySignal, timeoutSignal } from "../util/Abort.js";

export interface HttpRequestOptions {
  method: "POST" | "GET";
  url: string;
  headers: Record<string, string>;
  body?: string;
  signal: AbortSignal;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
  logger: Logger;
}

export interface HttpClientOptions {
  maxRetries?: number;
}

export class HttpClient {
  private readonly maxRetries: number;

  constructor(options: HttpClientOptions = {}) {
    this.maxRetries = options.maxRetries ?? 2;
  }

  /**
   * ストリーミングリクエストを送信して ReadableStream を返す
   */
  async sendStreamRequest(options: HttpRequestOptions): Promise<ReadableStream<Uint8Array>> {
    const { signal: timeoutSig, clear: clearReqTimeout } = timeoutSignal(options.requestTimeoutMs);
    const signal = anySignal([options.signal, timeoutSig]);

    let lastError: SakuraError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (signal.aborted) {
        clearReqTimeout();
        throw new SakuraError("CancelledError", "操作がキャンセルされました。", { message: "aborted" }, false);
      }

      try {
        const response = await this.doFetch(options, signal);

        if (!response.ok) {
          const err = await mapHttpError(response);
          if (!err.retryable || attempt >= this.maxRetries) {
            clearReqTimeout();
            throw err;
          }
          lastError = err;
          const delay = calculateRetryDelayMs(attempt, err.upstream?.retryAfterSec);
          options.logger.warn(`リトライ ${attempt + 1}/${this.maxRetries}: ${delay}ms 後に再試行`);
          await sleep(delay, signal);
          continue;
        }

        if (!response.body) {
          clearReqTimeout();
          throw new SakuraError("TransportError", "レスポンスボディが空です。", { message: "no body" }, false);
        }

        // NOTE: timeoutSig は stream 消費中も有効なので clear しない
        return response.body;
      } catch (err) {
        if (err instanceof SakuraError) {
          if (!err.retryable || attempt >= this.maxRetries) {
            clearReqTimeout();
            throw err;
          }
          lastError = err;
          const delay = calculateRetryDelayMs(attempt, err.upstream?.retryAfterSec);
          options.logger.warn(`リトライ ${attempt + 1}/${this.maxRetries}: ${delay}ms 後に再試行`);
          await sleep(delay, signal);
          continue;
        }
        clearReqTimeout();
        throw mapTransportError(err);
      }
    }

    clearReqTimeout();
    throw lastError ?? new SakuraError("UnknownError", "リクエストが失敗しました。", { message: "max retries exceeded" }, false);
  }

  private async doFetch(
    options: HttpRequestOptions,
    signal: AbortSignal
  ): Promise<Response> {
    const { url, method, headers, body } = options;
    options.logger.debug(`${method} ${url}`);

    try {
      return await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body } : {}),
        signal,
      });
    } catch (err) {
      throw mapTransportError(err);
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SakuraError("CancelledError", "キャンセルされました", { message: "aborted" }, false));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new SakuraError("CancelledError", "キャンセルされました", { message: "aborted" }, false));
    }, { once: true });
  });
}

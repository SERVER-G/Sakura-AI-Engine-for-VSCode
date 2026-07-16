/**
 * 接続テスター
 * Sakura AI Engine への接続を診断する
 */
import * as vscode from "vscode";
import { SakuraError } from "../types/errors.js";
import { Logger } from "./Logger.js";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: string;
}

export class ConnectionTester {
  constructor(
    private readonly logger: Logger
  ) {}

  async test(
    baseUrl: string,
    apiKey: string,
    model: string,
    token: vscode.CancellationToken
  ): Promise<ConnectionTestResult> {
    this.logger.info(`接続テスト開始: ${baseUrl}`);

    const controller = new AbortController();
    const disposable = token.onCancellationRequested(() => controller.abort());

    try {
      const url = `${baseUrl}/v1/chat/completions`;
      const requestBody = {
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (response.ok) {
        this.logger.info("接続テスト成功");
        return {
          success: true,
          message: `接続成功 (HTTP ${response.status})`,
        };
      }

      const errorBody = await response.text().catch(() => "");
      const message = this.interpretStatusCode(response.status, errorBody);

      this.logger.warn(`接続テスト失敗: HTTP ${response.status}`);
      return {
        success: false,
        message,
        details: errorBody,
      };
    } catch (err) {
      if (err instanceof SakuraError) {
        return { success: false, message: err.message };
      }
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, message: "接続テストがキャンセルされました" };
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error("接続テスト例外", err);
      return {
        success: false,
        message: `ネットワークエラー: ${errorMessage}`,
      };
    } finally {
      disposable.dispose();
    }
  }

  private interpretStatusCode(status: number, body: string): string {
    switch (status) {
      case 400:
        return "リクエスト形式またはモデルが未対応パラメータを含んでいます (400 Bad Request)";
      case 401:
        return "API キーが無効、失効、または権限が不足しています (401 Unauthorized)";
      case 403:
        return "このリソースへのアクセスが拒否されました (403 Forbidden)";
      case 404:
        return "エンドポイントが見つかりません。Base URL を確認してください (404 Not Found)";
      case 429:
        return "使いすぎのため一時的に制限されています (429 Rate Limited)";
      case 500:
      case 504:
        return `Sakura 側で障害またはタイムアウトが発生しています (${status} Server Error)`;
      default:
        return `予期しないエラーが発生しました (HTTP ${status}): ${body.slice(0, 200)}`;
    }
  }
}

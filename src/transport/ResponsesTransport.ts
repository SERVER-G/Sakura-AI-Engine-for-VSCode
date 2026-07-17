/**
 * Responses API トランスポート
 * Sakura AI Engine の /v1/responses エンドポイントと通信する
 * Kimi K2.6, gemma-4-31B-it 等の Responses API 対応モデル向け
 */
import * as vscode from "vscode";
import { HttpClient } from "./HttpClient.js";
import { ProviderRequestContext } from "../types/sakura.js";
import { NormalizedMessage } from "../types/normalized.js";
import { Logger } from "../diagnostics/Logger.js";
import {
  SakuraResponsesRequest,
  SakuraResponseInputItem,
  SakuraResponsesChunk,
  SakuraUsage,
} from "../types/sakura.js";
import { readSseStream } from "../stream/SseReader.js";
import { safeJsonParse } from "../util/Json.js";
import { reportUsageToVscode } from "../stream/UsageReporter.js";
export interface ResponsesTransportSendOptions {
  context: ProviderRequestContext;
  normalizedMessages: NormalizedMessage[];
  tools: readonly vscode.LanguageModelChatTool[];
  progress: vscode.Progress<vscode.LanguageModelResponsePart>;
  signal: AbortSignal;
  apiKey: string;
  baseUrl: string;
  logger: Logger;
  onUsage?: (usage: SakuraUsage) => void;
}

export class ResponsesTransport {
  private readonly httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient({ maxRetries: 2 });
  }

  async send(options: ResponsesTransportSendOptions): Promise<void> {
    const {
      context,
      normalizedMessages,
      progress,
      signal,
      apiKey,
      baseUrl,
      logger,
      onUsage,
    } = options;

    const input = this.buildInput(normalizedMessages);

    const requestBody: SakuraResponsesRequest = {
      model: context.model.id,
      input,
      stream: true,
      temperature: context.temperature,
      frequency_penalty: context.frequencyPenalty,
      presence_penalty: context.presencePenalty,
      ...(context.enableToolCalling ? {} : {}),
    };

    logger.debug(`Responses request: model=${context.model.id}, input_items=${input.length}`);

    const url = `${baseUrl}/v1/responses`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
      "X-Request-ID": context.requestId,
    };

    const { stream, clearTimeout } = await this.httpClient.sendStreamRequest({
      method: "POST",
      url,
      headers,
      body: JSON.stringify(requestBody),
      signal,
      connectTimeoutMs: 10_000,
      requestTimeoutMs: context.timeoutMs,
      logger,
    });

    try {
      await this.emitProgress(stream, progress, signal, logger, onUsage);
    } finally {
      clearTimeout();
    }
  }

  /**
   * NormalizedMessage を Responses API の input 形式に変換
   */
  private buildInput(messages: NormalizedMessage[]): SakuraResponseInputItem[] {
    return messages.map((msg): SakuraResponseInputItem => {
      const textParts = msg.parts
        .filter((p): p is { kind: "text"; text: string } => p.kind === "text")
        .map((p) => p.text)
        .join("\n");

       return {
         type: "message",
         role: msg.role === "tool" ? "user" : msg.role === "developer" ? "developer" : msg.role,
         content: textParts,
       };
    });
  }

  /**
   * SSE ストリームを処理して VS Code の progress に報告
   */
  private async emitProgress(
    stream: ReadableStream<Uint8Array>,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    signal: AbortSignal,
    logger: Logger,
    onUsage?: (usage: SakuraUsage) => void
  ): Promise<void> {
    for await (const event of readSseStream(stream, signal)) {
      if (signal.aborted) break;

      const chunk = safeJsonParse<SakuraResponsesChunk>(event.data);
      if (!chunk) {
        continue;
      }

      // usage フィールドがあればコールバックで通知
      if (chunk.usage && onUsage) {
        onUsage(chunk.usage);
      }

      // usage を VS Code に報告してコンテキストウィンドウ表示を更新する
      if (chunk.usage) {
        reportUsageToVscode(progress, chunk.usage);
      }

      // 完了イベント
      if (chunk.object === "response.completed") {
        logger.debug("Responses stream completed");
        break;
      }

      // デルタを処理
      if (chunk.delta) {
        // テキストコンテンツ
        if (chunk.delta.content) {
          progress.report(new vscode.LanguageModelTextPart(chunk.delta.content));
        }

        // reasoning コンテンツ（思考プロセス）
        if (chunk.delta.reasoning) {
          // reasoning は VS Code API で直接サポートされていないため、
          // テキストとして括弧付きで報告
          progress.report(
            new vscode.LanguageModelTextPart(`\n[思考: ${chunk.delta.reasoning}]\n`)
          );
        }
      }

      // output 項目の処理
      if (chunk.output) {
        for (const item of chunk.output) {
          if (item.type === "message" && item.content) {
            progress.report(new vscode.LanguageModelTextPart(item.content));
          }
          if (item.type === "reasoning" && item.reasoning) {
            progress.report(
              new vscode.LanguageModelTextPart(`\n[思考: ${item.reasoning}]\n`)
            );
          }
          if (item.type === "web_search_call") {
            const statusText =
              item.status === "in_progress"
                ? "Web検索実行中..."
                : item.status === "completed"
                ? "Web検索完了"
                : "Web検索失敗";
            progress.report(new vscode.LanguageModelTextPart(`\n[${statusText}]\n`));
          }
        }
      }
    }
  }
}

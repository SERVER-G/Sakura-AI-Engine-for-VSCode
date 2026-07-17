/**
 * プログレスエミッター
 * SSE チャンクを VS Code LanguageModelResponsePart に変換して報告する
 */
import * as vscode from "vscode";
import { ChatCompletionChunkAssembler } from "./ChatCompletionChunkAssembler.js";
import { readSseStream } from "./SseReader.js";
import { SakuraChatCompletionChunk, SakuraUsage } from "../types/sakura.js";
import { safeJsonParse } from "../util/Json.js";
import { Logger } from "../diagnostics/Logger.js";
import { reportUsageToVscode } from "./UsageReporter.js";

export async function emitProgress(
  stream: ReadableStream<Uint8Array>,
  progress: vscode.Progress<vscode.LanguageModelResponsePart>,
  signal: AbortSignal,
  logger: Logger,
  onUsage?: (usage: SakuraUsage) => void
): Promise<void> {
  const assembler = new ChatCompletionChunkAssembler();

  try {
    for await (const event of readSseStream(stream, signal)) {
      if (signal.aborted) {
        logger.debug("Stream aborted by signal");
        break;
      }

      const chunk = safeJsonParse<SakuraChatCompletionChunk>(event.data);
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

      if (!chunk.choices || chunk.choices.length === 0) {
        continue;
      }

      const assembled = assembler.processChunk(chunk);

      // テキストデルタを報告
      if (assembled.textDelta) {
        progress.report(new vscode.LanguageModelTextPart(assembled.textDelta));
      }

      // tool call を報告
      for (const tc of assembled.toolCallDeltas) {
        const input = ChatCompletionChunkAssembler.parseToolArguments(tc.arguments);
        logger.debug(`Tool call: ${tc.name} (${tc.callId})`);
        progress.report(
          new vscode.LanguageModelToolCallPart(tc.callId, tc.name, input)
        );
      }

      // 終了理由のログ
      if (assembled.finishReason) {
        logger.debug(`Stream finished: ${assembled.finishReason}`);
      }
    }
  } catch (err) {
    // SSE ストリーム読み取り中のエラーをログに記録して再スロー
    logger.error("Stream processing error", err);
    throw err;
  } finally {
    // ストリームが finish_reason を伴わずに終端した場合、
    // バッファに残っている tool call を確定して報告する
    const remaining = assembler.flush();
    if (remaining.length > 0) {
      logger.warn(`Flushing ${remaining.length} incomplete tool call(s) on stream end`);
      for (const tc of remaining) {
        const input = ChatCompletionChunkAssembler.parseToolArguments(tc.arguments);
        logger.debug(`Tool call (flush): ${tc.name} (${tc.callId})`);
        progress.report(
          new vscode.LanguageModelToolCallPart(tc.callId, tc.name, input)
        );
      }
    }
  }
}

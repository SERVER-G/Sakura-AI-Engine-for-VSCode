/**
 * プログレスエミッター
 * SSE チャンクを VS Code LanguageModelResponsePart に変換して報告する
 */
import * as vscode from "vscode";
import { ChatCompletionChunkAssembler } from "./ChatCompletionChunkAssembler.js";
import { readSseStream } from "./SseReader.js";
import { SakuraChatCompletionChunk } from "../types/sakura.js";
import { safeJsonParse } from "../util/Json.js";
import { Logger } from "../diagnostics/Logger.js";

export async function emitProgress(
  stream: ReadableStream<Uint8Array>,
  progress: vscode.Progress<vscode.LanguageModelResponsePart>,
  signal: AbortSignal,
  logger: Logger
): Promise<void> {
  const assembler = new ChatCompletionChunkAssembler();

  for await (const event of readSseStream(stream, signal)) {
    if (signal.aborted) break;

    const chunk = safeJsonParse<SakuraChatCompletionChunk>(event.data);
    if (!chunk || !chunk.choices || chunk.choices.length === 0) {
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
}

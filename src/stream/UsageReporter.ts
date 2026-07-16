/**
 * 使用量レポーター
 * さくらのAI Engine が返すトークン使用量を VS Code へ報告する。
 * VS Code / Copilot Chat は mimeType "usage" の LanguageModelDataPart を
 * 実トークン使用量として解釈し、チャットの「コンテキストウィンドウ」表示を更新する。
 * (BYOK プロバイダー実装 CustomDataPartMimeTypes.Usage = "usage" と同一の仕組み)
 */
import * as vscode from "vscode";
import { SakuraUsage } from "../types/sakura.js";

/**
 * VS Code が認識する使用量データパートの mimeType
 */
export const USAGE_MIME_TYPE = "usage";

/**
 * usage を LanguageModelDataPart として progress に報告する。
 * VS Code 側はこれを読み取ってコンテキストウィンドウの消費トークン数を表示する。
 */
export function reportUsageToVscode(
  progress: vscode.Progress<vscode.LanguageModelResponsePart>,
  usage: SakuraUsage
): void {
  try {
    const payload = {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    };
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    progress.report(new vscode.LanguageModelDataPart(encoded, USAGE_MIME_TYPE));
  } catch {
    // 使用量報告の失敗はレスポンス本体に影響させない
  }
}

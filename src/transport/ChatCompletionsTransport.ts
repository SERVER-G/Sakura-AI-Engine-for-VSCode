/**
 * Chat Completions トランスポート
 * Sakura AI Engine の /v1/chat/completions エンドポイントと通信する
 */
import * as vscode from "vscode";
import { HttpClient } from "./HttpClient.js";
import { ProviderRequestContext, SakuraUsage } from "../types/sakura.js";
import { NormalizedMessage } from "../types/normalized.js";
import { normalizedToOpenAI } from "../mapping/NormalizedToOpenAI.js";
import { mapTools, toolModeToChoice } from "../mapping/ToolMapper.js";
import { emitProgress } from "../stream/ProgressEmitter.js";
import { Logger } from "../diagnostics/Logger.js";
import { SakuraChatCompletionRequest } from "../types/sakura.js";
import { SakuraTool } from "../types/sakura.js";

export interface TransportSendOptions {
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

export class ChatCompletionsTransport {
  private readonly httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient({ maxRetries: 2 });
  }

  async send(options: TransportSendOptions): Promise<void> {
    const {
      context,
      normalizedMessages,
      tools,
      progress,
      signal,
      apiKey,
      baseUrl,
      logger,
      onUsage,
    } = options;

    const messages = normalizedToOpenAI(normalizedMessages);

    const sakuraTools: SakuraTool[] | undefined =
      context.enableToolCalling && tools.length > 0
        ? mapTools(tools)
        : undefined;

    const toolChoice = sakuraTools
      ? toolModeToChoice(context.toolMode)
      : undefined;

    const requestBody: SakuraChatCompletionRequest = {
      model: context.model.id,
      messages,
      stream: true,
      // ストリーミング時にトークン使用量を返すよう要求する
      // これがないと OpenAI 互換 API は usage を返さず、使用量が 0 のままになる
      stream_options: { include_usage: true },
      temperature: context.temperature,
      frequency_penalty: context.frequencyPenalty,
      presence_penalty: context.presencePenalty,
      ...(sakuraTools ? { tools: sakuraTools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
    };

    logger.debug(`Request model: ${context.model.id}, messages: ${messages.length}`);

    const url = `${baseUrl}/v1/chat/completions`;
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
      await emitProgress(stream, progress, signal, logger, onUsage);
    } finally {
      clearTimeout();
    }
  }
}

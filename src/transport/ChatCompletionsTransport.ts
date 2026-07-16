/**
 * Chat Completions トランスポート
 * Sakura AI Engine の /v1/chat/completions エンドポイントと通信する
 */
import * as vscode from "vscode";
import { HttpClient } from "./HttpClient.js";
import { ProviderRequestContext } from "../types/sakura.js";
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

    const stream = await this.httpClient.sendStreamRequest({
      method: "POST",
      url,
      headers,
      body: JSON.stringify(requestBody),
      signal,
      connectTimeoutMs: 10_000,
      requestTimeoutMs: context.timeoutMs,
      logger,
    });

    await emitProgress(stream, progress, signal, logger);
  }
}

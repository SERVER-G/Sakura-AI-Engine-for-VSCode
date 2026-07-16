/**
 * Sakura Language Model Provider
 * VS Code の LanguageModelChatProvider を実装する
 */
import * as vscode from "vscode";
import { SakuraModelDescriptor, ProviderRequestContext } from "../types/sakura.js";
import { SakuraModelCatalog } from "./SakuraModelCatalog.js";
import { TokenCountProvider } from "./TokenCountProvider.js";
import { ChatCompletionsTransport } from "../transport/ChatCompletionsTransport.js";
import { ProviderConfigurationManager } from "../config/ProviderConfiguration.js";
import { normalizeMessages } from "../mapping/VscodeToNormalized.js";
import { mapToolMode } from "../mapping/ToolMapper.js";
import { Logger } from "../diagnostics/Logger.js";
import { SakuraError } from "../types/errors.js";
import { cancellationToSignal } from "../util/Abort.js";
import { randomUUID } from "crypto";

/**
 * VS Code の LanguageModelChatInformation を拡張した Sakura 固有のモデル情報
 * Generic パラメーター T として渡すことで provider の型が一致する
 */
export interface SakuraChatModelInfo extends vscode.LanguageModelChatInformation {
  readonly sakuraDescriptor: SakuraModelDescriptor;
}

export class SakuraLanguageModelProvider
  implements vscode.LanguageModelChatProvider<SakuraChatModelInfo> {

  private readonly catalog: SakuraModelCatalog;
  private readonly tokenCounter: TokenCountProvider;
  private readonly transport: ChatCompletionsTransport;

  constructor(
    private readonly configManager: ProviderConfigurationManager,
    private readonly logger: Logger
  ) {
    this.catalog = new SakuraModelCatalog();
    this.tokenCounter = new TokenCountProvider();
    this.transport = new ChatCompletionsTransport();
  }

  async provideLanguageModelChatInformation(
    options: vscode.PrepareLanguageModelChatModelOptions,
    _token: vscode.CancellationToken
  ): Promise<SakuraChatModelInfo[]> {
    if (options.silent) {
      // サイレントモードでは認証チェックをスキップ
      const apiKey = await this.configManager.getApiKey();
      if (!apiKey) {
        return [];
      }
    }

    const models = this.catalog.getEnabledModels();
    const settings = this.configManager.getSettings();

    return models.map((model): SakuraChatModelInfo => ({
      id: model.id,
      name: model.displayName,
      family: model.family,
      version: model.version,
      maxInputTokens: model.maxInputTokens,
      maxOutputTokens: model.maxOutputTokens,
      capabilities: {
        imageInput: model.supportsVision && settings.enableVision,
        toolCalling: model.supportsToolCalling && settings.enableToolCalling,
      },
      sakuraDescriptor: model,
    }));
  }

  async provideLanguageModelChatResponse(
    model: SakuraChatModelInfo,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    const requestId = randomUUID();
    this.logger.info(`Chat request [${requestId}] model=${model.id}`);

    const apiKey = await this.configManager.requireApiKey();
    const settings = this.configManager.getSettings();
    const baseUrl = this.configManager.buildBaseUrl();
    const descriptor = model.sakuraDescriptor;

    const toolMode = mapToolMode(options.toolMode);
    const normalizedMessages = normalizeMessages(messages);

    const context: ProviderRequestContext = {
      model: descriptor,
      requestId,
      toolMode,
      timeoutMs: settings.requestTimeoutMs,
      enableVision: settings.enableVision && descriptor.supportsVision,
      enableToolCalling: settings.enableToolCalling && descriptor.supportsToolCalling,
    };

    const signal = cancellationToSignal(token);

    try {
      await this.transport.send({
        context,
        normalizedMessages,
        tools: options.tools ?? [],
        progress,
        signal,
        apiKey,
        baseUrl,
        logger: this.logger,
      });
      this.logger.info(`Chat request [${requestId}] completed`);
    } catch (err) {
      if (err instanceof SakuraError) {
        this.logger.error(`Chat request [${requestId}] failed: ${err.kind}`, err);
        const lmError = new vscode.LanguageModelError(err.message);
        throw lmError;
      }
      this.logger.error(`Chat request [${requestId}] unexpected error`, err);
      throw err;
    }
  }

  async provideTokenCount(
    _model: SakuraChatModelInfo,
    text: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken
  ): Promise<number> {
    return this.tokenCounter.count(text);
  }

  updateCatalog(customModels: Partial<SakuraModelDescriptor>[]): void {
    this.catalog.setCustomModels(customModels);
  }
}

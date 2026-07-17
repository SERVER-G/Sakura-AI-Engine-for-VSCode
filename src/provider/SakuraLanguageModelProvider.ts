/**
 * Sakura Language Model Provider
 * VS Code の LanguageModelChatProvider を実装する
 */
import * as vscode from "vscode";
import { SakuraModelDescriptor, ProviderRequestContext, SakuraUsage } from "../types/sakura.js";
import { SakuraModelCatalog } from "./SakuraModelCatalog.js";
import { TokenCountProvider } from "./TokenCountProvider.js";
import { ChatCompletionsTransport } from "../transport/ChatCompletionsTransport.js";
import { ResponsesTransport } from "../transport/ResponsesTransport.js";
import { ProviderConfigurationManager } from "../config/ProviderConfiguration.js";
import { normalizeMessages } from "../mapping/VscodeToNormalized.js";
import { NormalizedMessage } from "../types/normalized.js";
import { mapToolMode } from "../mapping/ToolMapper.js";
import { Logger } from "../diagnostics/Logger.js";
import { SakuraError } from "../types/errors.js";
import { cancellationToSignal } from "../util/Abort.js";
import { randomUUID } from "crypto";
import { TokenUsageTracker } from "../usage/TokenUsageTracker.js";
import { UsageStatusBar } from "../usage/UsageStatusBar.js";
import { WorkspaceIndexer } from "../embeddings/WorkspaceIndexer.js";
import { CodeChunk } from "../embeddings/Chunker.js";

/**
 * VS Code の LanguageModelChatInformation を拡張した Sakura 固有のモデル情報
 * Generic パラメーター T として渡すことで provider の型が一致する
 */
export interface SakuraChatModelInfo extends vscode.LanguageModelChatInformation {
  readonly sakuraDescriptor: SakuraModelDescriptor;
}

export class SakuraLanguageModelProvider
  implements vscode.LanguageModelChatProvider<SakuraChatModelInfo>, vscode.Disposable {

  private readonly catalog: SakuraModelCatalog;
  private readonly tokenCounter: TokenCountProvider;
  private readonly chatTransport: ChatCompletionsTransport;
  private readonly responsesTransport: ResponsesTransport;
  private readonly usageTracker: TokenUsageTracker;
  private readonly usageStatusBar: UsageStatusBar;
  private readonly workspaceIndexer: WorkspaceIndexer;
  private disposed = false;

  constructor(
    private readonly configManager: ProviderConfigurationManager,
    private readonly logger: Logger
  ) {
    this.catalog = new SakuraModelCatalog();
    this.tokenCounter = new TokenCountProvider();
    this.chatTransport = new ChatCompletionsTransport();
    this.responsesTransport = new ResponsesTransport();
    this.usageTracker = new TokenUsageTracker(this.catalog, logger);
    this.usageStatusBar = new UsageStatusBar(this.usageTracker);
    this.workspaceIndexer = new WorkspaceIndexer(logger);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.usageStatusBar.dispose();
    this.workspaceIndexer.dispose();
  }

  getUsageTracker(): TokenUsageTracker {
    return this.usageTracker;
  }

  getUsageStatusBar(): UsageStatusBar {
    return this.usageStatusBar;
  }

  getWorkspaceIndexer(): WorkspaceIndexer {
    return this.workspaceIndexer;
  }

  async provideLanguageModelChatInformation(
    _options: vscode.PrepareLanguageModelChatModelOptions,
    _token: vscode.CancellationToken
  ): Promise<SakuraChatModelInfo[]> {
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
    let normalizedMessages = normalizeMessages(messages);

    // RAG: ワークスペースから関連コードを検索してコンテキストに追加
    const enableRag = settings.enableRag ?? false;
    if (enableRag && !this.workspaceIndexer.isEmpty()) {
      const query = this.extractQueryFromMessages(normalizedMessages);
      if (query) {
        try {
          const relatedChunks = await this.workspaceIndexer.search(query, baseUrl, apiKey, 3);
          if (relatedChunks.length > 0) {
            const ragContext = this.buildRagContext(relatedChunks);
            normalizedMessages = this.injectRagContext(normalizedMessages, ragContext);
            this.logger.info(`RAG: ${relatedChunks.length} 件の関連コードを追加`);
          }
        } catch (err) {
          this.logger.warn("RAG 検索に失敗しました", err);
        }
      }
    }

    const context: ProviderRequestContext = {
      model: descriptor,
      requestId,
      toolMode,
      timeoutMs: settings.requestTimeoutMs,
      enableVision: settings.enableVision && descriptor.supportsVision,
      enableToolCalling: settings.enableToolCalling && descriptor.supportsToolCalling,
      temperature: settings.temperature,
      frequencyPenalty: settings.frequencyPenalty,
      presencePenalty: settings.presencePenalty,
    };

    const signal = cancellationToSignal(token);

    try {
      // モデルの transport タイプに応じて使い分け
      if (descriptor.transport === "responses" && descriptor.supportsResponses) {
        await this.responsesTransport.send({
          context,
          normalizedMessages,
          tools: options.tools ?? [],
          progress,
          signal,
          apiKey,
          baseUrl,
          logger: this.logger,
          onUsage: (usage: SakuraUsage) => {
            this.usageTracker.recordUsage(model.id, usage);
            this.usageStatusBar.refresh();
          },
        });
      } else {
        await this.chatTransport.send({
          context,
          normalizedMessages,
          tools: options.tools ?? [],
          progress,
          signal,
          apiKey,
          baseUrl,
          logger: this.logger,
          onUsage: (usage: SakuraUsage) => {
            this.usageTracker.recordUsage(model.id, usage);
            this.usageStatusBar.refresh();
          },
        });
      }
      this.logger.info(`Chat request [${requestId}] completed`);
    } catch (err) {
      let errorMessage: string;
      let errorCode: string | undefined;
      if (err instanceof SakuraError) {
        this.logger.error(`Chat request [${requestId}] failed: ${err.kind}`, err);
        errorMessage = err.message;
        errorCode = err.kind;
      } else if (err instanceof Error) {
        this.logger.error(`Chat request [${requestId}] unexpected error`, err);
        errorMessage = err.message;
      } else {
        this.logger.error(`Chat request [${requestId}] unknown error`, err);
        errorMessage = String(err);
      }
      throw new vscode.LanguageModelError(errorMessage, errorCode);
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

  /**
   * /v1/models API からモデル一覧を更新する
   */
  async refreshModels(baseUrl: string, apiKey: string): Promise<void> {
    await this.catalog.fetchModelsFromApi(baseUrl, apiKey, this.logger);
  }

  /**
   * モデル一覧の API 取得が失敗したか
   */
  didModelFetchFail(): boolean {
    return this.catalog.didApiFetchFail();
  }

  // === RAG ヘルパー ===

  /**
   * メッセージから検索クエリを抽出する
   */
  private extractQueryFromMessages(messages: NormalizedMessage[]): string | null {
    // 最後のユーザーメッセージをクエリとして使用
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user") {
        const textParts = msg.parts
          .filter((p): p is { kind: "text"; text: string } => p.kind === "text")
          .map((p) => p.text);
        return textParts.join(" ").trim();
      }
    }
    return null;
  }

  /**
   * 関連コードチャンクから RAG コンテキスト文字列を構築する
   */
  private buildRagContext(chunks: CodeChunk[]): string {
    const sections = chunks.map((chunk, i) => {
      const fileName = chunk.uri.split("/").pop() ?? "unknown";
      return `## 関連コード ${i + 1}: ${fileName} (${chunk.type}: ${chunk.name})\n\`\`\`${chunk.language}\n${chunk.content}\n\`\`\``;
    });

    return `以下はワークスペース内の関連コードです。必要に応じて参照してください。\n\n${sections.join("\n\n")}`;
  }

  /**
   * システムメッセージとして RAG コンテキストを注入する
   */
  private injectRagContext(
    messages: NormalizedMessage[],
    ragContext: string
  ): NormalizedMessage[] {
    const ragMessage: NormalizedMessage = {
      role: "system",
      parts: [{ kind: "text", text: ragContext }],
    };

    // 先頭に RAG コンテキストを追加
    return [ragMessage, ...messages];
  }
}

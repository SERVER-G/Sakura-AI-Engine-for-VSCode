/**
 * Sakura AI Engine for VS Code - Extension Entry Point
 * さくらのAI Engine を VS Code Copilot Chat のモデルプロバイダーとして統合する
 */
import * as vscode from "vscode";
import { SakuraLanguageModelProvider } from "./provider/SakuraLanguageModelProvider.js";
import { ProviderConfigurationManager } from "./config/ProviderConfiguration.js";
import { SecretStore } from "./config/SecretStore.js";
import { Logger } from "./diagnostics/Logger.js";
import { ConnectionTester } from "./diagnostics/ConnectionTester.js";
import { getSettings } from "./config/Settings.js";
import { UsagePanel } from "./usage/UsagePanel.js";

const PROVIDER_VENDOR = "sakura-ai-engine";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger("Sakura AI Engine");
  const settings = getSettings();
  logger.setDebugEnabled(settings.debugLogging);

  logger.info("Sakura AI Engine 拡張機能を起動しています...");

  const secretStore = new SecretStore(context.secrets);
  const configManager = new ProviderConfigurationManager(secretStore);
  const provider = new SakuraLanguageModelProvider(configManager, logger);
  const connectionTester = new ConnectionTester(logger);

  // トークン使用量追跡を初期化
  provider.getUsageTracker().setGlobalState(context.globalState);

  // 起動時にモデル一覧を API から取得
  const apiKey = await secretStore.getApiKey();
  if (apiKey) {
    try {
      const baseUrl = configManager.buildBaseUrl();
      await provider.refreshModels(baseUrl, apiKey);
      if (provider.didModelFetchFail()) {
        logger.warn("モデル一覧の API 取得に失敗しました。組み込みリストを使用します。");
      }
    } catch {
      logger.warn("モデル一覧の取得中にエラーが発生しました。組み込みリストを使用します。");
    }
  }

  // プロバイダーを登録する
  const providerDisposable = vscode.lm.registerLanguageModelChatProvider(
    PROVIDER_VENDOR,
    provider
  );

  // ステータスバーを登録
  const statusBar = provider.getUsageStatusBar();
  context.subscriptions.push(statusBar);

  // コマンドを登録する
  const setApiKeyCommand = vscode.commands.registerCommand(
    "sakuraAiEngine.setApiKey",
    async () => {
      const apiKey = await secretStore.promptAndSetApiKey();
      if (apiKey) {
        vscode.window.showInformationMessage(
          "Sakura AI Engine: API キーを設定しました"
        );
      }
    }
  );

  const clearApiKeyCommand = vscode.commands.registerCommand(
    "sakuraAiEngine.clearApiKey",
    async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Sakura AI Engine: API キーを削除しますか？",
        { modal: true },
        "削除"
      );
      if (confirm === "削除") {
        await secretStore.deleteApiKey();
        vscode.window.showInformationMessage(
          "Sakura AI Engine: API キーを削除しました"
        );
      }
    }
  );

  const testConnectionCommand = vscode.commands.registerCommand(
    "sakuraAiEngine.testConnection",
    async () => {
      const apiKey = await secretStore.getApiKey();
      if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
          "API キーが設定されていません",
          "API キーを設定"
        );
        if (action === "API キーを設定") {
          await vscode.commands.executeCommand("sakuraAiEngine.setApiKey");
        }
        return;
      }

      const currentSettings = getSettings();
      const defaultModel = "preview/Kimi-K2.6";

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Sakura AI Engine: 接続テスト中...",
          cancellable: true,
        },
        async (_, token) => {
          const result = await connectionTester.test(
            currentSettings.baseUrl,
            apiKey,
            defaultModel,
            token
          );

          if (result.success) {
            vscode.window.showInformationMessage(
              `Sakura AI Engine: ${result.message}`
            );
          } else {
            const action = await vscode.window.showErrorMessage(
              `Sakura AI Engine: ${result.message}`,
              "ログを表示"
            );
            if (action === "ログを表示") {
              logger.show();
            }
          }
        }
      );
    }
  );

  const indexWorkspaceCommand = vscode.commands.registerCommand(
    "sakuraAiEngine.indexWorkspace",
    async () => {
      const apiKey = await secretStore.getApiKey();
      if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
          "API キーが設定されていません",
          "API キーを設定"
        );
        if (action === "API キーを設定") {
          await vscode.commands.executeCommand("sakuraAiEngine.setApiKey");
        }
        return;
      }

      const currentSettings = getSettings();
      const indexer = provider.getWorkspaceIndexer();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Sakura AI Engine: ワークスペースをインデックス化中...",
          cancellable: true,
        },
        async (progress, token) => {
          await indexer.indexWorkspace(
            currentSettings.baseUrl,
            apiKey,
            progress,
            token
          );
          vscode.window.showInformationMessage(
            `Sakura AI Engine: ワークスペースのインデックス化が完了しました (${indexer.size()} チャンク)`
          );
        }
      );
    }
  );

  const clearIndexCommand = vscode.commands.registerCommand(
    "sakuraAiEngine.clearIndex",
    async () => {
      provider.getWorkspaceIndexer().clear();
      vscode.window.showInformationMessage(
        "Sakura AI Engine: ワークスペースインデックスをクリアしました"
      );
    }
  );

  const showUsageDetailsCommand = vscode.commands.registerCommand(
    "sakuraAiEngine.showUsageDetails",
    () => {
      UsagePanel.createOrShow(provider.getUsageTracker());
    }
  );

  // 設定変更を監視してデバッグログの有効/無効を切り替え、
  // baseUrl が変更された場合はモデル一覧を再取得する
  const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (!e.affectsConfiguration("sakuraAiEngine")) {
      return;
    }

    const newSettings = getSettings();
    logger.setDebugEnabled(newSettings.debugLogging);
    logger.info("設定が更新されました");

    if (e.affectsConfiguration("sakuraAiEngine.baseUrl")) {
      const apiKey = await secretStore.getApiKey();
      if (apiKey) {
        try {
          await provider.refreshModels(newSettings.baseUrl, apiKey);
          if (provider.didModelFetchFail()) {
            logger.warn("モデル一覧の API 再取得に失敗しました。組み込みリストを使用します。");
          } else {
            logger.info("モデル一覧を再取得しました");
          }
        } catch (err) {
          logger.warn("モデル一覧の再取得中にエラーが発生しました", err);
        }
      }
    }
  });

  context.subscriptions.push(
    providerDisposable,
    setApiKeyCommand,
    clearApiKeyCommand,
    testConnectionCommand,
    indexWorkspaceCommand,
    clearIndexCommand,
    showUsageDetailsCommand,
    configWatcher,
    logger
  );

  logger.info("Sakura AI Engine 拡張機能が起動しました");
}

export function deactivate(): void {
  // クリーンアップは context.subscriptions で自動的に行われる
}

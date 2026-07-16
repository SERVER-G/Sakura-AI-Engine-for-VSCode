/**
 * シークレット管理
 * VS Code の SecretStorage を使って API キーを安全に保存する
 */
import * as vscode from "vscode";

const API_KEY_SECRET_KEY = "sakuraAiEngine.apiKey";

export class SecretStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getApiKey(): Promise<string | undefined> {
    return this.secrets.get(API_KEY_SECRET_KEY);
  }

  async setApiKey(apiKey: string): Promise<void> {
    await this.secrets.store(API_KEY_SECRET_KEY, apiKey);
  }

  async deleteApiKey(): Promise<void> {
    await this.secrets.delete(API_KEY_SECRET_KEY);
  }

  /**
   * API キーを対話的に入力させる
   */
  async promptAndSetApiKey(): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      title: "Sakura AI Engine API キーを設定",
      prompt:
        "さくらのAI Engine コントロールパネルで発行したトークン (UUID:シークレット 形式) を入力してください",
      password: true,
      placeHolder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API キーを入力してください";
        }
        if (!value.includes(":")) {
          return "API キーは UUID:シークレット 形式で入力してください";
        }
        return undefined;
      },
    });

    if (apiKey) {
      await this.setApiKey(apiKey.trim());
      return apiKey.trim();
    }

    return undefined;
  }
}

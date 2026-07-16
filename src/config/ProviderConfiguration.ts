/**
 * プロバイダー設定
 * 設定とシークレットを統合して提供する
 */
import { SecretStore } from "./SecretStore.js";
import { getSettings, SakuraExtensionSettings } from "./Settings.js";

export interface ProviderConfiguration {
  apiKey: string;
  settings: SakuraExtensionSettings;
}

export class ProviderConfigurationManager {
  constructor(private readonly secretStore: SecretStore) {}

  getSettings(): SakuraExtensionSettings {
    return getSettings();
  }

  async getApiKey(): Promise<string | undefined> {
    return this.secretStore.getApiKey();
  }

  async requireApiKey(): Promise<string> {
    const key = await this.secretStore.getApiKey();
    if (!key) {
      throw new Error("API キーが設定されていません。コマンドパレットから「Sakura AI Engine: API キーを設定」を実行してください。");
    }
    return key;
  }

  async getConfiguration(): Promise<ProviderConfiguration | undefined> {
    const apiKey = await this.secretStore.getApiKey();
    if (!apiKey) {
      return undefined;
    }
    return {
      apiKey,
      settings: getSettings(),
    };
  }

  buildAuthorizationHeader(apiKey: string): string {
    return "Bearer " + apiKey;
  }

  buildBaseUrl(): string {
    const settings = getSettings();
    const url = settings.baseUrl;

    if (!settings.allowInsecureHttpForLocalDev && url.startsWith("http://")) {
      throw new Error(
        "HTTP (非 TLS) は許可されていません。ローカル開発用途の場合は allowInsecureHttpForLocalDev を true に設定してください。"
      );
    }

    return url;
  }
}

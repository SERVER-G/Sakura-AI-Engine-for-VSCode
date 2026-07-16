/**
 * モデルカタログ
 * さくらのAI Engine で利用可能なモデルのレジストリ
 */
import { SakuraModelDescriptor } from "../types/sakura.js";

/**
 * 組み込みモデルレジストリ
 * コントロールパネルの「利用可能なモデル」で確認した後、
 * ここに追加または settings で上書き可能
 */
const BUILTIN_MODELS: SakuraModelDescriptor[] = [
  {
    id: "preview/Kimi-K2.6",
    displayName: "Kimi K2.6 (Preview)",
    family: "Kimi",
    version: "K2.6",
    maxInputTokens: 131_072,
    maxOutputTokens: 16_384,
    supportsVision: false,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Kimi-K2.7",
    displayName: "Kimi K2.7 (Preview)",
    family: "Kimi",
    version: "K2.7",
    maxInputTokens: 131_072,
    maxOutputTokens: 16_384,
    supportsVision: true,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/DeepSeek-R2",
    displayName: "DeepSeek R2 (Preview)",
    family: "DeepSeek",
    version: "R2",
    maxInputTokens: 65_536,
    maxOutputTokens: 8_192,
    supportsVision: false,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
];

export class SakuraModelCatalog {
  private customModels: SakuraModelDescriptor[] = [];

  /**
   * カスタムモデル定義を設定から読み込む
   */
  setCustomModels(models: Partial<SakuraModelDescriptor>[]): void {
    this.customModels = models
      .filter((m) => m.id && m.displayName)
      .map((m) => ({
        ...BUILTIN_MODELS.find((b) => b.id === m.id),
        ...m,
      } as SakuraModelDescriptor));
  }

  /**
   * 有効なモデル一覧を返す
   */
  getEnabledModels(): SakuraModelDescriptor[] {
    const builtinMap = new Map(BUILTIN_MODELS.map((m) => [m.id, m]));

    // カスタムモデルで上書き
    for (const custom of this.customModels) {
      builtinMap.set(custom.id, custom);
    }

    return Array.from(builtinMap.values()).filter((m) => m.enabledByDefault);
  }

  /**
   * モデル ID でモデルを検索する
   */
  findModel(id: string): SakuraModelDescriptor | undefined {
    const enabled = this.getEnabledModels();
    return enabled.find((m) => m.id === id);
  }
}

/**
 * モデルカタログ
 * さくらのAI Engine で利用可能なモデルのレジストリ
 * /v1/models API から動的に取得し、組み込みメタデータで補完する
 */
import {
  SakuraModelDescriptor,
  SakuraModelDescriptorWithPricing,
  SakuraModelsResponse,
  SakuraModelPricing,
} from "../types/sakura.js";
import { Logger } from "../diagnostics/Logger.js";

/**
 * 組み込みモデルメタデータ
 * API から取得したモデル ID に対して、表示名・トークン数・機能フラグを補完する
 * 料金は 2026-07-16 時点のさくらのAI Engine 価格表（税込、10,000トークンあたり）
 */
const BUILTIN_METADATA: Map<string, Partial<SakuraModelDescriptorWithPricing>> = new Map([
  ["Qwen3-Coder-30B-A3B-Instruct", {
    displayName: "Qwen3 Coder 30B A3B Instruct",
    family: "Qwen3-Coder",
    version: "30B-A3B",
    maxInputTokens: 196_608,
    maxOutputTokens: 65_536,
    supportsVision: false,
    supportsToolCalling: true,
    supportsResponses: false,
    pricing: { inputPricePer1kTokens: 0.015, outputPricePer1kTokens: 0.075 },
  }],
  ["Qwen3-Coder-480B-A35B-Instruct-FP8", {
    displayName: "Qwen3 Coder 480B A35B Instruct (FP8)",
    family: "Qwen3-Coder",
    version: "480B-A35B-FP8",
    maxInputTokens: 196_608,
    maxOutputTokens: 65_536,
    supportsVision: false,
    supportsToolCalling: true,
    pricing: { inputPricePer1kTokens: 0.030, outputPricePer1kTokens: 0.250 },
  }],
  ["cotomi", {
    displayName: "cotomi",
    family: "cotomi",
    version: "1",
    maxInputTokens: 129_024,
    maxOutputTokens: 2_048,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.500, outputPricePer1kTokens: 1.800 },
  }],
  ["gpt-oss-120b", {
    displayName: "gpt-oss 120b",
    family: "gpt-oss",
    version: "120b",
    maxInputTokens: 98_304,
    maxOutputTokens: 32_768,
    supportsVision: false,
    supportsToolCalling: true,
    pricing: { inputPricePer1kTokens: 0.015, outputPricePer1kTokens: 0.075 },
  }],
  ["llm-jp-3.1-8x13b-instruct4", {
    displayName: "LLM-jp 3.1 8x13B Instruct4",
    family: "LLM-jp",
    version: "3.1-8x13b-instruct4",
    maxInputTokens: 28_672,
    maxOutputTokens: 4_096,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.015, outputPricePer1kTokens: 0.075 },
  }],
  ["plamo-2.0-31b", {
    displayName: "PLaMo 2.0 31B",
    family: "PLaMo",
    version: "2.0-31b",
    maxInputTokens: 126_976,
    maxOutputTokens: 4_096,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.100, outputPricePer1kTokens: 0.400 },
  }],
  ["preview/Kimi-K2.6", {
    displayName: "Kimi K2.6 (Preview)",
    family: "Kimi",
    version: "K2.6",
    maxInputTokens: 239_616,
    maxOutputTokens: 16_384,
    supportsVision: true,
    supportsToolCalling: true,
    supportsResponses: true,
    transport: "chat-completions",
    pricing: { inputPricePer1kTokens: 0.060, outputPricePer1kTokens: 0.300 },
  }],
  ["preview/Phi-4-mini-instruct-cpu", {
    displayName: "Phi-4 Mini Instruct (CPU, Preview)",
    family: "Phi-4",
    version: "mini-instruct-cpu",
    maxInputTokens: 122_880,
    maxOutputTokens: 8_192,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.001, outputPricePer1kTokens: 0.003 },
  }],
  ["preview/Phi-4-multimodal-instruct", {
    displayName: "Phi-4 Multimodal Instruct (Preview)",
    family: "Phi-4",
    version: "multimodal-instruct",
    maxInputTokens: 122_880,
    maxOutputTokens: 8_192,
    supportsVision: true,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.010, outputPricePer1kTokens: 0.030 },
  }],
  ["preview/Qwen3-0.6B-cpu", {
    displayName: "Qwen3 0.6B (CPU, Preview)",
    family: "Qwen3",
    version: "0.6B-cpu",
    maxInputTokens: 24_576,
    maxOutputTokens: 8_192,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.001, outputPricePer1kTokens: 0.003 },
  }],
  ["preview/Qwen3-VL-30B-A3B-Instruct", {
    displayName: "Qwen3 VL 30B A3B Instruct (Preview)",
    family: "Qwen3-VL",
    version: "30B-A3B-Instruct",
    maxInputTokens: 229_376,
    maxOutputTokens: 32_768,
    supportsVision: true,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.010, outputPricePer1kTokens: 0.030 },
  }],
  ["preview/Qwen3.6-35B-A3B", {
    displayName: "Qwen3.6 35B A3B (Preview)",
    family: "Qwen3.6",
    version: "35B-A3B",
    maxInputTokens: 229_376,
    maxOutputTokens: 32_768,
    supportsVision: true,
    supportsToolCalling: true,
    pricing: { inputPricePer1kTokens: 0.030, outputPricePer1kTokens: 0.150 },
  }],
  ["preview/gemma-4-31B-it", {
    displayName: "Gemma 4 31B IT (Preview)",
    family: "Gemma",
    version: "4-31B-it",
    maxInputTokens: 253_952,
    maxOutputTokens: 8_192,
    supportsVision: true,
    supportsToolCalling: true,
    supportsResponses: true,
    transport: "chat-completions",
    pricing: { inputPricePer1kTokens: 0.024, outputPricePer1kTokens: 0.096 },
  }],
  // Embeddings モデル
  ["multilingual-e5-large", {
    displayName: "multilingual-e5-large (Embeddings)",
    family: "Embeddings",
    version: "e5-large",
    maxInputTokens: 512,
    maxOutputTokens: 0,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.200, outputPricePer1kTokens: 0 },
  }],
  ["preview/Qwen3-Embedding-4B-FP16", {
    displayName: "Qwen3 Embedding 4B FP16 (Preview)",
    family: "Embeddings",
    version: "Qwen3-Embedding-4B-FP16",
    maxInputTokens: 32_768,
    maxOutputTokens: 0,
    supportsVision: false,
    supportsToolCalling: false,
    pricing: { inputPricePer1kTokens: 0.300, outputPricePer1kTokens: 0 },
  }],
]);

export class SakuraModelCatalog {
  private customModels: SakuraModelDescriptor[] = [];
  private apiModels: SakuraModelDescriptor[] = [];
  private apiFetchFailed = false;

  /**
   * /v1/models API からモデル一覧を取得する
   */
  async fetchModelsFromApi(
    baseUrl: string,
    apiKey: string,
    logger: Logger
  ): Promise<boolean> {
    try {
      const url = `${baseUrl}/v1/models`;
      logger.info(`モデル一覧を取得中: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        logger.warn(`モデル一覧取得失敗: HTTP ${response.status}`);
        this.apiFetchFailed = true;
        return false;
      }

      const data = await response.json() as SakuraModelsResponse;
      if (!data.data || !Array.isArray(data.data)) {
        logger.warn("モデル一覧のレスポンス形式が不正です");
        this.apiFetchFailed = true;
        return false;
      }

      this.apiModels = data.data.map((item) => this.buildDescriptorFromApi(item));
      logger.info(`モデル一覧を ${this.apiModels.length} 件取得しました`);
      this.apiFetchFailed = false;
      return true;
    } catch (err) {
      logger.warn("モデル一覧取得でエラーが発生しました", err);
      this.apiFetchFailed = true;
      return false;
    }
  }

  /**
   * API から取得したモデルアイテムを SakuraModelDescriptor に変換
   */
  private buildDescriptorFromApi(item: { id: string }): SakuraModelDescriptor {
    const meta = BUILTIN_METADATA.get(item.id);

    if (meta) {
      return {
        id: item.id,
        displayName: meta.displayName ?? item.id,
        family: meta.family ?? "unknown",
        version: meta.version ?? "1",
        maxInputTokens: meta.maxInputTokens ?? 32_768,
        maxOutputTokens: meta.maxOutputTokens ?? 4_096,
        supportsVision: meta.supportsVision ?? false,
        supportsToolCalling: meta.supportsToolCalling ?? false,
        supportsResponses: meta.supportsResponses ?? false,
        transport: meta.transport ?? "chat-completions",
        enabledByDefault: true,
      };
    }

    // 未知のモデル: ID から推測するフォールバック
    const idLower = item.id.toLowerCase();
    return {
      id: item.id,
      displayName: item.id,
      family: item.id.split("/")[0] ?? "unknown",
      version: "1",
      maxInputTokens: 32_768,
      maxOutputTokens: 4_096,
      supportsVision: idLower.includes("vl") || idLower.includes("multimodal") || idLower.includes("vision"),
      supportsToolCalling: idLower.includes("coder") || idLower.includes("instruct"),
      supportsResponses: false,
      transport: "chat-completions",
      enabledByDefault: true,
    };
  }

  /**
   * カスタムモデル定義を設定から読み込む
   */
  setCustomModels(models: Partial<SakuraModelDescriptor>[]): void {
    this.customModels = models
      .filter((m) => m.id && m.displayName)
      .map((m) => ({
        id: m.id!,
        displayName: m.displayName!,
        family: m.family ?? "custom",
        version: m.version ?? "1",
        maxInputTokens: m.maxInputTokens ?? 32_768,
        maxOutputTokens: m.maxOutputTokens ?? 4_096,
        supportsVision: m.supportsVision ?? false,
        supportsToolCalling: m.supportsToolCalling ?? false,
        supportsResponses: m.supportsResponses ?? false,
        transport: m.transport ?? "chat-completions",
        enabledByDefault: m.enabledByDefault ?? true,
      } as SakuraModelDescriptor));
  }

  /**
   * 有効なモデル一覧を返す
   * API 取得に成功していれば API 結果、失敗していれば組み込みリストを使用
   */
  getEnabledModels(): SakuraModelDescriptor[] {
    const sourceModels = this.apiModels.length > 0 ? this.apiModels : this.getBuiltinModels();
    const modelMap = new Map(sourceModels.map((m) => [m.id, m]));

    // カスタムモデルで上書き
    for (const custom of this.customModels) {
      modelMap.set(custom.id, custom);
    }

    return Array.from(modelMap.values()).filter((m) => m.enabledByDefault);
  }

  /**
   * 組み込みモデル一覧を返す
   */
  private getBuiltinModels(): SakuraModelDescriptor[] {
    return Array.from(BUILTIN_METADATA.entries()).map(([id, meta]) => ({
      id,
      displayName: meta.displayName ?? id,
      family: meta.family ?? "unknown",
      version: meta.version ?? "1",
      maxInputTokens: meta.maxInputTokens ?? 32_768,
      maxOutputTokens: meta.maxOutputTokens ?? 4_096,
      supportsVision: meta.supportsVision ?? false,
      supportsToolCalling: meta.supportsToolCalling ?? false,
      supportsResponses: meta.supportsResponses ?? false,
      transport: meta.transport ?? "chat-completions",
      enabledByDefault: true,
    }));
  }

  /**
   * モデル ID でモデルを検索する
   */
  findModel(id: string): SakuraModelDescriptor | undefined {
    const enabled = this.getEnabledModels();
    return enabled.find((m) => m.id === id);
  }

  /**
   * モデルの料金情報を取得する
   */
  getPricing(id: string): SakuraModelPricing | undefined {
    return BUILTIN_METADATA.get(id)?.pricing;
  }

  /**
   * API 取得が失敗したかどうか
   */
  didApiFetchFail(): boolean {
    return this.apiFetchFailed;
  }
}

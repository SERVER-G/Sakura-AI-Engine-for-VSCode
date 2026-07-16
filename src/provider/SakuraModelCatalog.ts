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
    id: "Qwen3-Coder-30B-A3B-Instruct",
    displayName: "Qwen3 Coder 30B A3B Instruct",
    family: "Qwen3-Coder",
    version: "30B-A3B",
    maxInputTokens: 262_144,
    maxOutputTokens: 65_536,
    supportsVision: false,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "Qwen3-Coder-480B-A35B-Instruct-FP8",
    displayName: "Qwen3 Coder 480B A35B Instruct (FP8)",
    family: "Qwen3-Coder",
    version: "480B-A35B-FP8",
    maxInputTokens: 262_144,
    maxOutputTokens: 65_536,
    supportsVision: false,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "cotomi",
    displayName: "cotomi",
    family: "cotomi",
    version: "1",
    maxInputTokens: 8_192,
    maxOutputTokens: 2_048,
    supportsVision: false,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "gpt-oss-120b",
    displayName: "gpt-oss 120b",
    family: "gpt-oss",
    version: "120b",
    maxInputTokens: 131_072,
    maxOutputTokens: 32_768,
    supportsVision: false,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "llm-jp-3.1-8x13b-instruct4",
    displayName: "LLM-jp 3.1 8x13B Instruct4",
    family: "LLM-jp",
    version: "3.1-8x13b-instruct4",
    maxInputTokens: 32_768,
    maxOutputTokens: 4_096,
    supportsVision: false,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "plamo-2.0-31b",
    displayName: "PLaMo 2.0 31B",
    family: "PLaMo",
    version: "2.0-31b",
    maxInputTokens: 32_768,
    maxOutputTokens: 4_096,
    supportsVision: false,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Kimi-K2.6",
    displayName: "Kimi K2.6 (Preview)",
    family: "Kimi",
    version: "K2.6",
    maxInputTokens: 131_072,
    maxOutputTokens: 16_384,
    supportsVision: true,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Phi-4-mini-instruct-cpu",
    displayName: "Phi-4 Mini Instruct (CPU, Preview)",
    family: "Phi-4",
    version: "mini-instruct-cpu",
    maxInputTokens: 131_072,
    maxOutputTokens: 8_192,
    supportsVision: false,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Phi-4-multimodal-instruct",
    displayName: "Phi-4 Multimodal Instruct (Preview)",
    family: "Phi-4",
    version: "multimodal-instruct",
    maxInputTokens: 131_072,
    maxOutputTokens: 8_192,
    supportsVision: true,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Qwen3-0.6B-cpu",
    displayName: "Qwen3 0.6B (CPU, Preview)",
    family: "Qwen3",
    version: "0.6B-cpu",
    maxInputTokens: 32_768,
    maxOutputTokens: 8_192,
    supportsVision: false,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Qwen3-VL-30B-A3B-Instruct",
    displayName: "Qwen3 VL 30B A3B Instruct (Preview)",
    family: "Qwen3-VL",
    version: "30B-A3B-Instruct",
    maxInputTokens: 262_144,
    maxOutputTokens: 32_768,
    supportsVision: true,
    supportsToolCalling: false,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/Qwen3.6-35B-A3B",
    displayName: "Qwen3.6 35B A3B (Preview)",
    family: "Qwen3.6",
    version: "35B-A3B",
    maxInputTokens: 131_072,
    maxOutputTokens: 32_768,
    supportsVision: true,
    supportsToolCalling: true,
    transport: "chat-completions",
    enabledByDefault: true,
  },
  {
    id: "preview/gemma-4-31B-it",
    displayName: "Gemma 4 31B IT (Preview)",
    family: "Gemma",
    version: "4-31B-it",
    maxInputTokens: 131_072,
    maxOutputTokens: 8_192,
    supportsVision: true,
    supportsToolCalling: true,
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

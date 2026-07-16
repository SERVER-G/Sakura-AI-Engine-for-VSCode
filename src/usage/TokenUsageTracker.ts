/**
 * トークン使用量・コスト追跡
 * リクエストごとおよび累計のトークン使用量と推定コストを管理する
 */
import * as vscode from "vscode";
import { SakuraUsage } from "../types/sakura.js";
import { SakuraModelCatalog } from "../provider/SakuraModelCatalog.js";
import { Logger } from "../diagnostics/Logger.js";

const GLOBAL_STATE_KEY = "sakuraAiEngine.tokenUsage";

export interface TokenUsageEntry {
  timestamp: number;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // 円
}

export interface MonthlyUsage {
  year: number;
  month: number;
  entries: TokenUsageEntry[];
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCost: number;
}

export class TokenUsageTracker {
  private currentSession: TokenUsageEntry[] = [];
  private globalState: vscode.Memento | undefined;
  private catalog: SakuraModelCatalog;
  private logger: Logger;

  constructor(catalog: SakuraModelCatalog, logger: Logger) {
    this.catalog = catalog;
    this.logger = logger;
  }

  setGlobalState(globalState: vscode.Memento): void {
    this.globalState = globalState;
  }

  /**
   * 使用状況を記録する
   */
  recordUsage(modelId: string, usage: SakuraUsage): void {
    const pricing = this.catalog.getPricing(modelId);
    let estimatedCost = 0;

    if (pricing) {
      const inputCost = (usage.prompt_tokens / 1000) * pricing.inputPricePer1kTokens;
      const outputCost = (usage.completion_tokens / 1000) * pricing.outputPricePer1kTokens;
      estimatedCost = inputCost + outputCost;
    }

    const entry: TokenUsageEntry = {
      timestamp: Date.now(),
      modelId,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost,
    };

    this.currentSession.push(entry);
    this.logger.info(
      `Token usage: ${modelId} | prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens} cost=¥${estimatedCost.toFixed(4)}`
    );

    // 永続化
    this.persistEntry(entry);
  }

  /**
   * 現在のセッションの合計を取得
   */
  getSessionSummary(): { totalTokens: number; totalCost: number } {
    return this.currentSession.reduce(
      (acc, e) => ({
        totalTokens: acc.totalTokens + e.totalTokens,
        totalCost: acc.totalCost + e.estimatedCost,
      }),
      { totalTokens: 0, totalCost: 0 }
    );
  }

  /**
   * 今月の累計を取得
   */
  async getCurrentMonthSummary(): Promise<{ totalTokens: number; totalCost: number }> {
    const monthly = await this.getCurrentMonthData();
    return {
      totalTokens: monthly.totalTokens,
      totalCost: monthly.totalCost,
    };
  }

  /**
   * 今月の詳細データを取得
   */
  async getCurrentMonthData(): Promise<MonthlyUsage> {
    const now = new Date();
    const allData = await this.loadAllData();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return (
      allData[key] ?? {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        entries: [],
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
      }
    );
  }

  /**
   * モデル別の集計を取得
   */
  async getModelBreakdown(): Promise<Map<string, { tokens: number; cost: number; requests: number }>> {
    const monthly = await this.getCurrentMonthData();
    const map = new Map<string, { tokens: number; cost: number; requests: number }>();

    for (const entry of monthly.entries) {
      const existing = map.get(entry.modelId);
      if (existing) {
        existing.tokens += entry.totalTokens;
        existing.cost += entry.estimatedCost;
        existing.requests += 1;
      } else {
        map.set(entry.modelId, {
          tokens: entry.totalTokens,
          cost: entry.estimatedCost,
          requests: 1,
        });
      }
    }

    return map;
  }

  /**
   * 日次の使用量を取得
   */
  async getDailyUsage(): Promise<Map<string, { tokens: number; cost: number }>> {
    const monthly = await this.getCurrentMonthData();
    const map = new Map<string, { tokens: number; cost: number }>();

    for (const entry of monthly.entries) {
      const date = new Date(entry.timestamp);
      const key = `${date.getMonth() + 1}/${date.getDate()}`;
      const existing = map.get(key);
      if (existing) {
        existing.tokens += entry.totalTokens;
        existing.cost += entry.estimatedCost;
      } else {
        map.set(key, { tokens: entry.totalTokens, cost: entry.estimatedCost });
      }
    }

    return map;
  }

  /**
   * 過去6ヶ月のサマリーを取得
   */
  async getMonthlyHistory(): Promise<{ month: string; tokens: number; cost: number }[]> {
    const allData = await this.loadAllData();
    const result: { month: string; tokens: number; cost: number }[] = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthly = allData[key];
      result.push({
        month: `${d.getMonth() + 1}月`,
        tokens: monthly?.totalTokens ?? 0,
        cost: monthly?.totalCost ?? 0,
      });
    }

    return result;
  }

  /**
   * エントリーを永続化
   */
  private async persistEntry(entry: TokenUsageEntry): Promise<void> {
    if (!this.globalState) {
      return;
    }

    const date = new Date(entry.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const allData = await this.loadAllData();
    const monthly = allData[key] ?? {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      entries: [],
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
    };

    monthly.entries.push(entry);
    monthly.totalPromptTokens += entry.promptTokens;
    monthly.totalCompletionTokens += entry.completionTokens;
    monthly.totalTokens += entry.totalTokens;
    monthly.totalCost += entry.estimatedCost;

    allData[key] = monthly;
    await this.globalState.update(GLOBAL_STATE_KEY, allData);
  }

  /**
   * 保存済みデータを読み込み
   */
  private async loadAllData(): Promise<Record<string, MonthlyUsage>> {
    if (!this.globalState) {
      return {};
    }
    return (await this.globalState.get<Record<string, MonthlyUsage>>(GLOBAL_STATE_KEY)) ?? {};
  }

  /**
   * 使用状況をリセット
   */
  async clearAllData(): Promise<void> {
    this.currentSession = [];
    if (this.globalState) {
      await this.globalState.update(GLOBAL_STATE_KEY, undefined);
    }
  }
}

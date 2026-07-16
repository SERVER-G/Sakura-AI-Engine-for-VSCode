/**
 * トークン使用量ステータスバー
 * VS Code のステータスバーに今回のリクエストコストと累計コストを表示する
 */
import * as vscode from "vscode";
import { TokenUsageTracker } from "./TokenUsageTracker.js";

export class UsageStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private tracker: TokenUsageTracker;
  private enabled: boolean;

  constructor(tracker: TokenUsageTracker) {
    this.tracker = tracker;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "sakuraAiEngine.showUsageDetails";
    this.enabled = vscode.workspace
      .getConfiguration("sakuraAiEngine")
      .get<boolean>("showTokenUsage", true);
    this.updateDisplay();
  }

  /**
   * 使用状況を更新して表示
   */
  async refresh(): Promise<void> {
    if (!this.enabled) {
      this.statusBarItem.hide();
      return;
    }

    const session = this.tracker.getSessionSummary();
    const monthly = await this.tracker.getCurrentMonthSummary();

    const sessionText = session.totalCost > 0 ? `今回 ¥${session.totalCost.toFixed(2)}` : "";
    const monthlyText = monthly.totalCost > 0 ? `今月 ¥${monthly.totalCost.toFixed(2)}` : "";

    const parts = [sessionText, monthlyText].filter(Boolean);
    if (parts.length > 0) {
      this.statusBarItem.text = `$(coin) ${parts.join(" / ")}`;
      this.statusBarItem.tooltip = `Sakura AI Engine トークン使用量\n今回: ${session.totalTokens.toLocaleString()} tokens / ¥${session.totalCost.toFixed(4)}\n今月: ${monthly.totalTokens.toLocaleString()} tokens / ¥${monthly.totalCost.toFixed(2)}`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * 表示を更新
   */
  updateDisplay(): void {
    this.enabled = vscode.workspace
      .getConfiguration("sakuraAiEngine")
      .get<boolean>("showTokenUsage", true);
    if (!this.enabled) {
      this.statusBarItem.hide();
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

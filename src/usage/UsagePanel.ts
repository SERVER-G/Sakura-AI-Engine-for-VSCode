/**
 * 使用量ダッシュボード Webview パネル
 * トークン使用量とコストをリッチな UI で表示する
 */
import * as vscode from "vscode";
import { TokenUsageTracker } from "./TokenUsageTracker.js";

export class UsagePanel {
  public static currentPanel: UsagePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly tracker: TokenUsageTracker;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, tracker: TokenUsageTracker) {
    this.panel = panel;
    this.tracker = tracker;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "refresh") {
          await this.update();
        }
      },
      null,
      this.disposables
    );

    this.update();
  }

  static createOrShow(tracker: TokenUsageTracker): void {
    const column = vscode.ViewColumn.One;

    if (UsagePanel.currentPanel) {
      UsagePanel.currentPanel.panel.reveal(column);
      UsagePanel.currentPanel.update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "sakuraAiEngineUsage",
      "Sakura AI Engine - 使用量ダッシュボード",
      column,
      { enableScripts: true }
    );

    UsagePanel.currentPanel = new UsagePanel(panel, tracker);
  }

  async update(): Promise<void> {
    const session = this.tracker.getSessionSummary();
    const monthly = await this.tracker.getCurrentMonthData();
    const modelBreakdown = await this.tracker.getModelBreakdown();
    const dailyUsage = await this.tracker.getDailyUsage();
    const history = await this.tracker.getMonthlyHistory();

    this.panel.webview.html = this.getHtml({
      session,
      monthly,
      modelBreakdown,
      dailyUsage,
      history,
    });
  }

  private getHtml(data: {
    session: { totalTokens: number; totalCost: number };
    monthly: import("./TokenUsageTracker.js").MonthlyUsage;
    modelBreakdown: Map<string, { tokens: number; cost: number; requests: number }>;
    dailyUsage: Map<string, { tokens: number; cost: number }>;
    history: { month: string; tokens: number; cost: number }[];
  }): string {
    const { session, monthly, modelBreakdown, dailyUsage, history } = data;

    const modelRows = Array.from(modelBreakdown.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(
        ([model, stats]) => `
        <tr>
          <td>${model}</td>
          <td class="num">${stats.requests.toLocaleString()}</td>
          <td class="num">${stats.tokens.toLocaleString()}</td>
          <td class="num cost">¥${stats.cost.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const dailyRows = Array.from(dailyUsage.entries())
      .sort((a, b) => {
        const [ma, da] = a[0].split("/").map(Number);
        const [mb, db] = b[0].split("/").map(Number);
        return ma === mb ? da - db : ma - mb;
      })
      .map(
        ([date, stats]) => `
        <tr>
          <td>${date}</td>
          <td class="num">${stats.tokens.toLocaleString()}</td>
          <td class="num cost">¥${stats.cost.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const historyBars = history
      .map((h) => {
        const maxCost = Math.max(...history.map((x) => x.cost), 1);
        const pct = (h.cost / maxCost) * 100;
        return `
        <div class="bar-row">
          <div class="bar-label">${h.month}</div>
          <div class="bar-wrap">
            <div class="bar" style="width:${pct}%"></div>
          </div>
          <div class="bar-value">¥${h.cost.toFixed(0)}</div>
        </div>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sakura AI Engine 使用量</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --surface-hover: #1c2128;
      --border: #30363d;
      --text: #c9d1d9;
      --text-secondary: #8b949e;
      --accent: #58a6ff;
      --accent-dim: #1f6feb;
      --success: #3fb950;
      --warning: #d29922;
      --danger: #f85149;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 24px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h1::before {
      content: "🌸";
      font-size: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: background 0.2s;
    }
    .card:hover {
      background: var(--surface-hover);
    }
    .card-label {
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
    }
    .card-value.cost {
      color: var(--accent);
    }
    .card-sub {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .section h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: var(--text);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      text-align: left;
      padding: 10px 12px;
      color: var(--text-secondary);
      font-weight: 500;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    tr:hover td {
      background: var(--surface-hover);
    }
    td.num {
      text-align: right;
      font-family: "SF Mono", Monaco, monospace;
    }
    td.cost {
      color: var(--accent);
      font-weight: 600;
    }
    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }
    .bar-label {
      width: 50px;
      font-size: 13px;
      color: var(--text-secondary);
      text-align: right;
    }
    .bar-wrap {
      flex: 1;
      height: 20px;
      background: var(--bg);
      border-radius: 4px;
      overflow: hidden;
    }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-dim), var(--accent));
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    .bar-value {
      width: 70px;
      font-size: 13px;
      color: var(--text);
      text-align: right;
      font-family: "SF Mono", Monaco, monospace;
    }
    .refresh-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .refresh-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }
    .empty {
      color: var(--text-secondary);
      font-style: italic;
      padding: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Sakura AI Engine 使用量ダッシュボード</h1>

  <div class="grid">
    <div class="card">
      <div class="card-label">今回のセッション</div>
      <div class="card-value cost">¥${session.totalCost.toFixed(2)}</div>
      <div class="card-sub">${session.totalTokens.toLocaleString()} tokens</div>
    </div>
    <div class="card">
      <div class="card-label">今月の累計</div>
      <div class="card-value cost">¥${monthly.totalCost.toFixed(2)}</div>
      <div class="card-sub">${monthly.totalTokens.toLocaleString()} tokens</div>
    </div>
    <div class="card">
      <div class="card-label">今月のリクエスト数</div>
      <div class="card-value">${monthly.entries.length.toLocaleString()}</div>
      <div class="card-sub">${monthly.totalPromptTokens.toLocaleString()} prompt / ${monthly.totalCompletionTokens.toLocaleString()} completion</div>
    </div>
  </div>

  <div class="section">
    <h2>📊 過去6ヶ月の推移</h2>
    ${historyBars}
  </div>

  <div class="section">
    <h2>🤖 モデル別使用量</h2>
    ${modelBreakdown.size > 0 ? `
    <table>
      <thead>
        <tr><th>モデル</th><th class="num">リクエスト</th><th class="num">トークン</th><th class="num">コスト</th></tr>
      </thead>
      <tbody>${modelRows}</tbody>
    </table>
    ` : '<div class="empty">データがありません</div>'}
  </div>

  <div class="section">
    <h2>📅 日次使用量</h2>
    ${dailyUsage.size > 0 ? `
    <table>
      <thead>
        <tr><th>日付</th><th class="num">トークン</th><th class="num">コスト</th></tr>
      </thead>
      <tbody>${dailyRows}</tbody>
    </table>
    ` : '<div class="empty">データがありません</div>'}
  </div>

  <button class="refresh-btn" onclick="refresh()" title="更新">↻</button>

  <script>
    const vscode = acquireVsCodeApi();
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
  </script>
</body>
</html>`;
  }

  dispose(): void {
    UsagePanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

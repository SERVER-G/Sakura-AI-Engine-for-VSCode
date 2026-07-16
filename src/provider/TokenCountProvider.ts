/**
 * トークンカウントプロバイダー
 * 近似的なトークン数を計算する
 */
import * as vscode from "vscode";

/**
 * 近似トークンカウント
 * MVP では文字数ベースの近似値を使用する
 * 将来は正確なトークナイザーに切り替え可能
 */
export class TokenCountProvider {
  private readonly cache = new Map<string, number>();
  private readonly maxCacheSize = 1000;

  /**
   * テキストまたはメッセージのトークン数を近似計算する
   * 日本語文字は 1.5 トークン相当として計算
   */
  count(text: string | vscode.LanguageModelChatRequestMessage): number {
    if (typeof text === "string") {
      const cached = this.cache.get(text);
      if (cached !== undefined) {
        return cached;
      }
      const result = this.countText(text);
      this.setCache(text, result);
      return result;
    }

    return this.countMessage(text);
  }

  private setCache(key: string, value: number): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  private countText(text: string): number {
    let tokens = 0;
    for (const char of text) {
      // ASCII 文字は 0.25 トークン (4文字で1トークン近似)
      // 非 ASCII (日本語など) は 1.5 トークン近似
      const code = char.charCodeAt(0);
      if (code < 128) {
        tokens += 0.25;
      } else {
        tokens += 1.5;
      }
    }
    return Math.ceil(tokens);
  }

  private countMessage(msg: vscode.LanguageModelChatRequestMessage): number {
    let total = 4; // role token overhead
    const content = msg.content;

    if (typeof content === "string") {
      total += this.countText(content);
    } else if (Array.isArray(content)) {
      for (const part of content) {
        total += this.countPart(part);
      }
    }

    return total;
  }

  /**
   * メッセージ内の 1 パートのトークン数を計算する
   * テキスト・画像に加え、tool call / tool result も数える。
   * エージェントモードではツール結果 (ファイル内容や検索結果) が
   * コンテキストの大半を占めるため、これを数えないと使用量が極端に過小評価される。
   */
  private countPart(part: unknown): number {
    if (part instanceof vscode.LanguageModelTextPart) {
      return this.countText(part.value);
    }

    if (part instanceof vscode.LanguageModelDataPart) {
      // 画像は概算 765 トークン (low detail) ~ 85 + 170*tiles (high detail)
      return 765;
    }

    if (part instanceof vscode.LanguageModelToolCallPart) {
      // tool 呼び出しはモデルに name + JSON 化した引数として送られる
      let tokens = this.countText(part.name) + 8; // 呼び出し構造のオーバーヘッド
      try {
        tokens += this.countText(JSON.stringify(part.input ?? {}));
      } catch {
        // 循環参照などで stringify 失敗時は無視
      }
      return tokens;
    }

    if (part instanceof vscode.LanguageModelToolResultPart) {
      // tool 結果 (ファイル内容・検索結果など) を再帰的に数える
      let tokens = 4; // 結果構造のオーバーヘッド
      const resultContent = (part as vscode.LanguageModelToolResultPart).content;
      if (Array.isArray(resultContent)) {
        for (const inner of resultContent) {
          tokens += this.countPart(inner);
        }
      }
      return tokens;
    }

    return 0;
  }
}

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
  /**
   * テキストまたはメッセージのトークン数を近似計算する
   * 日本語文字は 1.5 トークン相当として計算
   */
  count(text: string | vscode.LanguageModelChatRequestMessage): number {
    if (typeof text === "string") {
      return this.countText(text);
    }

    return this.countMessage(text);
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
        if (part instanceof vscode.LanguageModelTextPart) {
          total += this.countText(part.value);
        } else if (part instanceof vscode.LanguageModelDataPart) {
          // 画像は概算 765 トークン (low detail) ~ 85 + 170*tiles (high detail)
          total += 765;
        }
      }
    }

    return total;
  }
}

/**
 * TokenCountProvider のユニットテスト
 */
import { TokenCountProvider } from "../../src/provider/TokenCountProvider";

describe("TokenCountProvider", () => {
  let counter: TokenCountProvider;

  beforeEach(() => {
    counter = new TokenCountProvider();
  });

  test("ASCII テキストを概算する", () => {
    const count = counter.count("Hello, World!");
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(20);
  });

  test("日本語テキストは ASCII より多くのトークンを返す", () => {
    const ascii = counter.count("Hello World");
    const japanese = counter.count("こんにちは世界");
    // 日本語は文字あたりのトークン数が多い
    expect(japanese).toBeGreaterThan(ascii);
  });

  test("空文字列で 0 を返す", () => {
    expect(counter.count("")).toBe(0);
  });

  test("長いテキストで一貫した近似値を返す", () => {
    const text = "あ".repeat(1000);
    const count = counter.count(text);
    // 1000 文字 × 1.5 トークン = 1500 トークン前後
    expect(count).toBeGreaterThan(1000);
    expect(count).toBeLessThan(2000);
  });
});

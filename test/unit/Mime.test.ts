/**
 * Mime ユーティリティのユニットテスト
 */
import {
  detectMimeFromBytes,
  isSupportedImageMime,
  bytesToDataUrl,
  mimeFromDataUrl,
} from "../../src/util/Mime";

describe("detectMimeFromBytes", () => {
  test("PNG のマジックバイトを認識する", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectMimeFromBytes(bytes)).toBe("image/png");
  });

  test("JPEG のマジックバイトを認識する", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMimeFromBytes(bytes)).toBe("image/jpeg");
  });

  test("GIF のマジックバイトを認識する", () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38]);
    expect(detectMimeFromBytes(bytes)).toBe("image/gif");
  });

  test("未対応のバイト列では undefined を返す", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeFromBytes(bytes)).toBeUndefined();
  });

  test("バイト列が短すぎる場合は undefined を返す", () => {
    const bytes = new Uint8Array([0x89]);
    expect(detectMimeFromBytes(bytes)).toBeUndefined();
  });
});

describe("isSupportedImageMime", () => {
  test("対応する MIME タイプを認識する", () => {
    expect(isSupportedImageMime("image/png")).toBe(true);
    expect(isSupportedImageMime("image/jpeg")).toBe(true);
    expect(isSupportedImageMime("image/gif")).toBe(true);
    expect(isSupportedImageMime("image/webp")).toBe(true);
  });

  test("対応しない MIME タイプを拒否する", () => {
    expect(isSupportedImageMime("image/bmp")).toBe(false);
    expect(isSupportedImageMime("application/pdf")).toBe(false);
    expect(isSupportedImageMime("text/plain")).toBe(false);
  });

  test("大文字小文字を区別しない", () => {
    expect(isSupportedImageMime("IMAGE/PNG")).toBe(true);
    expect(isSupportedImageMime("Image/Jpeg")).toBe(true);
  });
});

describe("bytesToDataUrl", () => {
  test("bytes を base64 data URL に変換する", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const url = bytesToDataUrl(bytes, "image/png");
    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(url).toContain("SGVsbG8="); // base64 of "Hello"
  });
});

describe("mimeFromDataUrl", () => {
  test("data URL から MIME タイプを取得する", () => {
    expect(mimeFromDataUrl("data:image/png;base64,abc")).toBe("image/png");
    expect(mimeFromDataUrl("data:image/jpeg;base64,abc")).toBe("image/jpeg");
  });

  test("無効な data URL では undefined を返す", () => {
    expect(mimeFromDataUrl("https://example.com/image.png")).toBeUndefined();
    expect(mimeFromDataUrl("")).toBeUndefined();
  });
});

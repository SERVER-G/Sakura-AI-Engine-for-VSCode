/**
 * Vision マッパー
 * 画像データのバリデーションと変換
 */
import { detectMimeFromBytes, isSupportedImageMime, bytesToDataUrl } from "../util/Mime.js";

export interface ImageConversionResult {
  dataUrl: string;
  mime: string;
}

export interface ImageConversionError {
  reason: string;
}

/**
 * 画像バイト列を data URL に変換する
 * MIME タイプを自動検出または検証する
 */
export function convertImageBytes(
  bytes: Uint8Array,
  hintMime?: string
): ImageConversionResult | ImageConversionError {
  if (bytes.length === 0) {
    return { reason: "画像データが空です" };
  }

  let mime = hintMime;

  if (!mime || !isSupportedImageMime(mime)) {
    const detected = detectMimeFromBytes(bytes);
    if (!detected) {
      return { reason: `対応していない画像形式です (MIME: ${hintMime ?? "不明"})` };
    }
    mime = detected;
  }

  if (!isSupportedImageMime(mime)) {
    return { reason: `対応していない画像 MIME タイプです: ${mime}` };
  }

  const dataUrl = bytesToDataUrl(bytes, mime);
  return { dataUrl, mime };
}

export function isConversionError(
  result: ImageConversionResult | ImageConversionError
): result is ImageConversionError {
  return "reason" in result;
}

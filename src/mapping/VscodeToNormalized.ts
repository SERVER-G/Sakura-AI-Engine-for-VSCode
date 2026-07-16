/**
 * VS Code → 正規化形式 変換
 * LanguageModelChatRequestMessage を NormalizedMessage に変換する
 */
import * as vscode from "vscode";
import { NormalizedMessage, NormalizedContentPart } from "../types/normalized.js";
import { bytesToDataUrl, detectMimeFromBytes, isSupportedImageMime } from "../util/Mime.js";

export function normalizeMessages(
  messages: readonly vscode.LanguageModelChatRequestMessage[]
): NormalizedMessage[] {
  return messages.map(normalizeMessage);
}

function normalizeMessage(
  msg: vscode.LanguageModelChatRequestMessage
): NormalizedMessage {
  const parts = normalizeParts(msg.content);

  return {
    role: mapRole(msg.role),
    parts,
    ...(msg.name ? { name: msg.name } : {}),
  };
}

function mapRole(role: vscode.LanguageModelChatMessageRole): NormalizedMessage["role"] {
  if (role === vscode.LanguageModelChatMessageRole.User) return "user";
  if (role === vscode.LanguageModelChatMessageRole.Assistant) return "assistant";
  return "user";
}

function normalizeParts(
  content: ReadonlyArray<vscode.LanguageModelInputPart | unknown>
): NormalizedContentPart[] {
  const parts: NormalizedContentPart[] = [];

  for (const part of content) {
    if (part instanceof vscode.LanguageModelTextPart) {
      parts.push({ kind: "text", text: part.value });
    } else if (part instanceof vscode.LanguageModelToolCallPart) {
      parts.push({
        kind: "tool-call",
        callId: part.callId,
        name: part.name,
        input: part.input as Record<string, unknown>,
      });
    } else if (part instanceof vscode.LanguageModelToolResultPart) {
      const resultContent = normalizeToolResultContent(
        part.content as (vscode.LanguageModelTextPart | vscode.LanguageModelDataPart | unknown)[]
      );
      parts.push({
        kind: "tool-result",
        callId: part.callId,
        content: resultContent,
      });
    } else if (part instanceof vscode.LanguageModelDataPart) {
      const imagePart = tryConvertImagePart(part);
      if (imagePart) {
        parts.push(imagePart);
      }
    }
  }

  return parts;
}

function normalizeToolResultContent(
  content: (vscode.LanguageModelTextPart | vscode.LanguageModelDataPart | unknown)[]
): unknown[] {
  return content.map((part) => {
    if (part instanceof vscode.LanguageModelTextPart) {
      return { type: "text", text: part.value };
    }
    return { type: "data" };
  });
}

function tryConvertImagePart(
  part: vscode.LanguageModelDataPart
): NormalizedContentPart | null {
  try {
    const data = part.data;
    const bytes = new Uint8Array(data);

    let mime = part.mimeType;
    if (!mime || !isSupportedImageMime(mime)) {
      const detected = detectMimeFromBytes(bytes);
      if (!detected) return null;
      mime = detected;
    }

    if (!isSupportedImageMime(mime)) return null;

    const dataUrl = bytesToDataUrl(bytes, mime);
    return { kind: "image", mime, dataUrl };
  } catch {
    return null;
  }
}

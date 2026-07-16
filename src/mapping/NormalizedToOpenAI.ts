/**
 * 正規化形式 → OpenAI 互換 変換
 * NormalizedMessage を Sakura Chat Completions のメッセージ形式に変換する
 */
import {
  SakuraChatMessage,
  SakuraUserContentPart,
  SakuraAssistantMessage,
  SakuraToolCall,
} from "../types/sakura.js";
import { NormalizedMessage, NormalizedContentPart } from "../types/normalized.js";

export function normalizedToOpenAI(messages: NormalizedMessage[]): SakuraChatMessage[] {
  const result: SakuraChatMessage[] = [];

  for (const msg of messages) {
    const converted = convertMessage(msg);
    if (converted !== null) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }

  return result;
}

function convertMessage(msg: NormalizedMessage): SakuraChatMessage | SakuraChatMessage[] | null {
  switch (msg.role) {
    case "system":
    case "developer":
      return convertSystemMessage(msg);
    case "user":
      return convertUserMessage(msg);
    case "assistant":
      return convertAssistantMessage(msg);
    case "tool":
      return convertToolMessages(msg);
    default:
      return null;
  }
}

function convertSystemMessage(msg: NormalizedMessage): SakuraChatMessage {
  const text = msg.parts
    .filter((p): p is Extract<NormalizedContentPart, { kind: "text" }> => p.kind === "text")
    .map((p) => p.text)
    .join("\n");

  return { role: msg.role === "developer" ? "developer" : "system", content: text };
}

function convertUserMessage(msg: NormalizedMessage): SakuraChatMessage {
  const hasImages = msg.parts.some((p) => p.kind === "image");

  if (!hasImages) {
    // テキストのみの場合は文字列で送る
    const text = msg.parts
      .filter((p): p is Extract<NormalizedContentPart, { kind: "text" }> => p.kind === "text")
      .map((p) => p.text)
      .join("\n");
    return { role: "user", content: text };
  }

  // 画像が含まれる場合は content array 形式
  const contentParts: SakuraUserContentPart[] = [];

  for (const part of msg.parts) {
    if (part.kind === "text") {
      contentParts.push({ type: "text", text: part.text });
    } else if (part.kind === "image") {
      contentParts.push({
        type: "image_url",
        image_url: { url: part.dataUrl },
      });
    }
  }

  return { role: "user", content: contentParts };
}

function convertAssistantMessage(msg: NormalizedMessage): SakuraChatMessage {
  const textParts = msg.parts.filter(
    (p): p is Extract<NormalizedContentPart, { kind: "text" }> => p.kind === "text"
  );
  const toolCalls = msg.parts.filter(
    (p): p is Extract<NormalizedContentPart, { kind: "tool-call" }> => p.kind === "tool-call"
  );

  const assistantMsg: SakuraAssistantMessage = { role: "assistant" };

  if (textParts.length > 0) {
    assistantMsg.content = textParts.map((p) => p.text).join("\n");
  }

  if (toolCalls.length > 0) {
    assistantMsg.tool_calls = toolCalls.map(
      (tc): SakuraToolCall => ({
        id: tc.callId,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.input),
        },
      })
    );
  }

  return assistantMsg;
}

function convertToolMessages(msg: NormalizedMessage): SakuraChatMessage[] {
  return msg.parts
    .filter(
      (p): p is Extract<NormalizedContentPart, { kind: "tool-result" }> =>
        p.kind === "tool-result"
    )
    .map((p) => ({
      role: "tool" as const,
      tool_call_id: p.callId,
      content: typeof p.content === "string"
        ? p.content
        : JSON.stringify(p.content),
    }));
}

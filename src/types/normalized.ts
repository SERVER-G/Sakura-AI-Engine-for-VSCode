/**
 * 内部正規化メッセージ形式
 * VS Code のメッセージ parts を transport 非依存の形式に変換して扱う
 */

export type NormalizedContentPart =
  | { kind: "text"; text: string }
  | { kind: "image"; mime: string; dataUrl: string }
  | { kind: "tool-call"; callId: string; name: string; input: Record<string, unknown> }
  | { kind: "tool-result"; callId: string; content: unknown[] };

export interface NormalizedMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  name?: string;
  parts: NormalizedContentPart[];
}

export interface NormalizedRequest {
  messages: NormalizedMessage[];
  tools: NormalizedToolDefinition[];
  toolMode: "auto" | "required" | "none";
}

export interface NormalizedToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

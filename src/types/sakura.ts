/**
 * さくらのAI Engine API 型定義
 * OpenAI 互換 Chat Completions エンドポイントに基づく
 */

export interface SakuraModelDescriptor {
  id: string;
  displayName: string;
  family: string;
  version: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsToolCalling: boolean;
  supportsResponses: boolean;
  transport: "chat-completions" | "responses";
  enabledByDefault: boolean;
}

// Chat Completions リクエスト
export interface SakuraChatCompletionRequest {
  model: string;
  messages: SakuraChatMessage[];
  tools?: SakuraTool[];
  tool_choice?: "none" | "auto" | "required" | SakuraToolChoice;
  temperature?: number;
  max_tokens?: number;
  stream: boolean;
  stream_options?: { include_usage?: boolean };
}

// Responses API リクエスト
export interface SakuraResponsesRequest {
  model: string;
  input: SakuraResponseInputItem[];
  tools?: SakuraTool[];
  tool_choice?: "none" | "auto" | "required" | SakuraToolChoice;
  temperature?: number;
  max_output_tokens?: number;
  stream: boolean;
  reasoning?: {
    effort?: "low" | "medium" | "high";
  };
  web_search?: {
    enabled?: boolean;
  };
}

export type SakuraResponseInputItem =
  | SakuraResponseMessage
  | SakuraResponseFile;

export interface SakuraResponseMessage {
  type: "message";
  role: "system" | "user" | "assistant" | "developer";
  content: string | SakuraUserContentPart[];
}

export interface SakuraResponseFile {
  type: "file";
  file_id?: string;
  filename?: string;
  file_data?: string; // base64
}

export type SakuraChatMessage =
  | SakuraSystemMessage
  | SakuraUserMessage
  | SakuraAssistantMessage
  | SakuraToolMessage;

export interface SakuraSystemMessage {
  role: "system" | "developer";
  content: string;
}

export interface SakuraUserMessage {
  role: "user";
  content: string | SakuraUserContentPart[];
}

export type SakuraUserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export interface SakuraAssistantMessage {
  role: "assistant";
  content?: string | null;
  tool_calls?: SakuraToolCall[];
}

export interface SakuraToolMessage {
  role: "tool";
  tool_call_id: string;
  content: string;
}

export interface SakuraToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface SakuraTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface SakuraToolChoice {
  type: "function";
  function: { name: string };
}

// Chat Completions レスポンス (ストリームチャンク)
export interface SakuraChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: SakuraChatCompletionChunkChoice[];
  usage?: SakuraUsage | null;
}

// Responses API レスポンス (ストリームチャンク)
export interface SakuraResponsesChunk {
  id: string;
  object: "response.output_item.delta" | "response.completed";
  type?: "message" | "reasoning" | "web_search_call";
  delta?: {
    content?: string;
    reasoning?: string;
  };
  output?: SakuraResponseOutputItem[];
  usage?: SakuraUsage;
}

export interface SakuraResponseOutputItem {
  type: "message" | "reasoning" | "web_search_call";
  id?: string;
  role?: "assistant";
  content?: string;
  reasoning?: string;
  status?: "in_progress" | "completed" | "failed";
}

export interface SakuraChatCompletionChunkChoice {
  index: number;
  delta: SakuraChatCompletionDelta;
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
}

export interface SakuraChatCompletionDelta {
  role?: "assistant";
  content?: string | null;
  tool_calls?: SakuraToolCallDelta[];
}

export interface SakuraToolCallDelta {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface SakuraUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// エラーレスポンス
export interface SakuraErrorResponse {
  error?: {
    code?: string;
    type?: string;
    message: string;
    param?: string;
  };
  message?: string;
}

export interface ProviderRequestContext {
  model: SakuraModelDescriptor;
  requestId: string;
  toolMode: "auto" | "required" | "none";
  timeoutMs: number;
  enableVision: boolean;
  enableToolCalling: boolean;
}

// /v1/models レスポンス (OpenAI 互換)
export interface SakuraModelsResponse {
  object: "list";
  data: SakuraModelItem[];
}

export interface SakuraModelItem {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

// 料金情報
export interface SakuraModelPricing {
  inputPricePer1kTokens: number;   // 円
  outputPricePer1kTokens: number;  // 円
}

export interface SakuraModelDescriptorWithPricing extends SakuraModelDescriptor {
  pricing?: SakuraModelPricing;
}

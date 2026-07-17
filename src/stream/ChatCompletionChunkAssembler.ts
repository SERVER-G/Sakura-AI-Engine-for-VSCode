/**
 * Chat Completion チャンクアセンブラー
 * 分割されたストリームデルタを結合して完全な tool call を組み立てる
 */
import {
  SakuraChatCompletionChunk,
  SakuraToolCallDelta,
} from "../types/sakura.js";
import { safeJsonParse } from "../util/Json.js";

export interface AssembledToolCall {
  callId: string;
  name: string;
  arguments: string;
}

export interface AssembledChunk {
  textDelta: string;
  toolCallDeltas: AssembledToolCall[];
  finishReason: "stop" | "tool_calls" | "length" | "content_filter" | null;
}

/**
 * 進行中の tool call バッファ
 */
interface ToolCallBuffer {
  callId: string;
  name: string;
  argumentsBuffer: string;
}

export class ChatCompletionChunkAssembler {
  private toolCallBuffers: Map<number, ToolCallBuffer> = new Map();

  /**
   * チャンクを処理して組み立てた結果を返す
   */
  processChunk(chunk: SakuraChatCompletionChunk): AssembledChunk {
    const choice = chunk.choices[0];
    if (!choice) {
      return { textDelta: "", toolCallDeltas: [], finishReason: null };
    }

    const delta = choice.delta;
    const finishReason = choice.finish_reason;

    const textDelta = delta.content ?? "";
    const toolCallDeltas: AssembledToolCall[] = [];

    // tool call デルタを処理
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        this.updateToolCallBuffer(tc);
      }
    }

    // finish_reason が来たら蓄積した tool call を確定する
    // 一部の API は tool call があっても finish_reason を "stop" で返すため、
    // "tool_calls" に限定せず、バッファに tool call があれば必ず flush する
    if (finishReason !== null && this.toolCallBuffers.size > 0) {
      for (const [index, buffer] of this.toolCallBuffers) {
        if (buffer.name) {
          toolCallDeltas.push(this.finalizeBuffer(index, buffer));
        }
      }
      this.toolCallBuffers.clear();
    }

    return { textDelta, toolCallDeltas, finishReason };
  }

  /**
   * バッファを確定済み tool call に変換する
   * callId が空の場合は index ベースのフォールバック ID を生成する
   * (空 ID だと VS Code 側で tool 結果の紐付けに失敗しループの原因になる)
   */
  private finalizeBuffer(index: number, buffer: ToolCallBuffer): AssembledToolCall {
    return {
      callId: buffer.callId || `call_${index}`,
      name: buffer.name,
      arguments: buffer.argumentsBuffer,
    };
  }

  private updateToolCallBuffer(tc: SakuraToolCallDelta): void {
    const existing = this.toolCallBuffers.get(tc.index);

    if (!existing) {
      this.toolCallBuffers.set(tc.index, {
        callId: tc.id ?? "",
        name: tc.function?.name ?? "",
        argumentsBuffer: tc.function?.arguments ?? "",
      });
    } else {
      if (tc.id) existing.callId = tc.id;
      if (tc.function?.name) existing.name = tc.function.name;
      if (tc.function?.arguments) existing.argumentsBuffer += tc.function.arguments;
    }
  }

  /**
   * tool call の arguments が有効な JSON かチェックする
   * 仕様上 arguments は常に妥当 JSON とは限らないため、フォールバックを持つ
   */
  static parseToolArguments(argumentsStr: string): Record<string, unknown> {
    const parsed = safeJsonParse<Record<string, unknown>>(argumentsStr);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    // パース失敗時は空オブジェクトにフォールバック
    return {};
  }

  reset(): void {
    this.toolCallBuffers.clear();
  }

  /**
   * ストリーム終端時に残っている tool call バッファを確定して返す
   * finish_reason が来ないまま stream が閉じるケースへの保険
   */
  flush(): AssembledToolCall[] {
    const remaining: AssembledToolCall[] = [];
    for (const [index, buffer] of this.toolCallBuffers) {
      if (buffer.name) {
        remaining.push(this.finalizeBuffer(index, buffer));
      }
    }
    this.toolCallBuffers.clear();
    return remaining;
  }

  /**
   * 現在バッファに蓄積中の tool call 数を返す
   */
  getPendingCount(): number {
    return this.toolCallBuffers.size;
  }
}

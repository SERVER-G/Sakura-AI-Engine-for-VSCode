/**
 * SSE (Server-Sent Events) リーダー
 * OpenAI 互換の SSE ストリームをパースする
 */

export interface SseEvent {
  data: string;
}

/**
 * ReadableStream から SSE イベントを yield する非同期ジェネレーター
 * "data: " で始まる行をイベントとして返し、"[DONE]" で終了する
 */
export async function* readSseStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();

      if (done) {
        // ストリーム終端: バッファに残りがあれば処理する
        if (buffer.trim().length > 0) {
          yield* processBuffer(buffer);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // 改行区切りでイベントを処理
      const lines = buffer.split("\n");
      // 最後の要素は未完成の可能性があるのでバッファに戻す
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSseLine(line.trimEnd());
        if (event !== null) {
          if (event.data === "[DONE]") {
            return;
          }
          yield event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function* processBuffer(buffer: string): Generator<SseEvent> {
  for (const line of buffer.split("\n")) {
    const event = parseSseLine(line.trimEnd());
    if (event !== null && event.data !== "[DONE]") {
      yield event;
    }
  }
}

function parseSseLine(line: string): SseEvent | null {
  if (line.startsWith("data: ")) {
    const data = line.slice(6);
    return { data };
  }
  // コメント行、空行、その他は無視
  return null;
}

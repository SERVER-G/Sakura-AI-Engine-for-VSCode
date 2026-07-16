/**
 * SseReader のユニットテスト
 */
import { readSseStream } from "../../src/stream/SseReader";

function createStreamFromStrings(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("SseReader", () => {
  test("data: プレフィックス付きのイベントをパースする", async () => {
    const stream = createStreamFromStrings([
      'data: {"test":1}\n\n',
      'data: {"test":2}\n\n',
    ]);

    const events: string[] = [];
    for await (const event of readSseStream(stream)) {
      events.push(event.data);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toBe('{"test":1}');
    expect(events[1]).toBe('{"test":2}');
  });

  test("[DONE] で終了する", async () => {
    const stream = createStreamFromStrings([
      'data: {"test":1}\n\n',
      "data: [DONE]\n\n",
      'data: {"test":2}\n\n',
    ]);

    const events: string[] = [];
    for await (const event of readSseStream(stream)) {
      events.push(event.data);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toBe('{"test":1}');
  });

  test("コメント行を無視する", async () => {
    const stream = createStreamFromStrings([
      ': comment\n',
      'data: {"test":1}\n\n',
    ]);

    const events: string[] = [];
    for await (const event of readSseStream(stream)) {
      events.push(event.data);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toBe('{"test":1}');
  });

  test("分割されたチャンクを結合してパースする", async () => {
    const stream = createStreamFromStrings([
      'data: {"tes',
      't":1}\n\n',
    ]);

    const events: string[] = [];
    for await (const event of readSseStream(stream)) {
      events.push(event.data);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toBe('{"test":1}');
  });

  test("AbortSignal でストリームを中断する", async () => {
    const controller = new AbortController();
    const stream = createStreamFromStrings([
      'data: {"test":1}\n\n',
      'data: {"test":2}\n\n',
    ]);

    const events: string[] = [];
    controller.abort();

    for await (const event of readSseStream(stream, controller.signal)) {
      events.push(event.data);
    }

    // aborted signal は即座に終了する
    expect(events).toHaveLength(0);
  });

  test("空のストリームを処理する", async () => {
    const stream = createStreamFromStrings([]);
    const events: string[] = [];
    for await (const event of readSseStream(stream)) {
      events.push(event.data);
    }
    expect(events).toHaveLength(0);
  });
});

/**
 * ChatCompletionChunkAssembler のユニットテスト
 */
import { ChatCompletionChunkAssembler } from "../../src/stream/ChatCompletionChunkAssembler";
import { SakuraChatCompletionChunk } from "../../src/types/sakura";

function makeChunk(
  delta: { content?: string; tool_calls?: SakuraChatCompletionChunk["choices"][0]["delta"]["tool_calls"] },
  finish_reason: SakuraChatCompletionChunk["choices"][0]["finish_reason"] = null
): SakuraChatCompletionChunk {
  return {
    id: "test-id",
    object: "chat.completion.chunk",
    created: Date.now(),
    model: "test-model",
    choices: [{ index: 0, delta, finish_reason }],
  };
}

describe("ChatCompletionChunkAssembler", () => {
  test("テキストデルタを処理する", () => {
    const assembler = new ChatCompletionChunkAssembler();
    const result = assembler.processChunk(makeChunk({ content: "Hello" }));
    expect(result.textDelta).toBe("Hello");
    expect(result.toolCallDeltas).toHaveLength(0);
    expect(result.finishReason).toBeNull();
  });

  test("複数のテキストチャンクを正しく処理する", () => {
    const assembler = new ChatCompletionChunkAssembler();

    const r1 = assembler.processChunk(makeChunk({ content: "こんにちは" }));
    const r2 = assembler.processChunk(makeChunk({ content: "、世界" }));
    const r3 = assembler.processChunk(makeChunk({}, "stop"));

    expect(r1.textDelta).toBe("こんにちは");
    expect(r2.textDelta).toBe("、世界");
    expect(r3.finishReason).toBe("stop");
  });

  test("tool call の引数を分割チャンクから結合する", () => {
    const assembler = new ChatCompletionChunkAssembler();

    // tool call の開始
    assembler.processChunk(makeChunk({
      tool_calls: [{
        index: 0,
        id: "call-123",
        type: "function",
        function: { name: "workspace_readFile", arguments: "" },
      }],
    }));

    // 引数の分割
    assembler.processChunk(makeChunk({
      tool_calls: [{ index: 0, function: { arguments: '{"path":' } }],
    }));

    assembler.processChunk(makeChunk({
      tool_calls: [{ index: 0, function: { arguments: '"src/index.ts"}' } }],
    }));

    // tool_calls フィニッシュ
    const result = assembler.processChunk(makeChunk({}, "tool_calls"));

    expect(result.toolCallDeltas).toHaveLength(1);
    expect(result.toolCallDeltas[0].callId).toBe("call-123");
    expect(result.toolCallDeltas[0].name).toBe("workspace_readFile");
    expect(result.toolCallDeltas[0].arguments).toBe('{"path":"src/index.ts"}');
  });

  test("複数の tool call を同時に処理する", () => {
    const assembler = new ChatCompletionChunkAssembler();

    assembler.processChunk(makeChunk({
      tool_calls: [
        { index: 0, id: "call-1", type: "function", function: { name: "tool_a", arguments: '{"a":1}' } },
        { index: 1, id: "call-2", type: "function", function: { name: "tool_b", arguments: '{"b":2}' } },
      ],
    }));

    const result = assembler.processChunk(makeChunk({}, "tool_calls"));

    expect(result.toolCallDeltas).toHaveLength(2);
  });

  test("finish_reason が stop の場合 tool call を返さない", () => {
    const assembler = new ChatCompletionChunkAssembler();
    const result = assembler.processChunk(makeChunk({ content: "done" }, "stop"));
    expect(result.toolCallDeltas).toHaveLength(0);
    expect(result.finishReason).toBe("stop");
  });

  test("finish_reason が stop でも蓄積した tool call を確定する", () => {
    const assembler = new ChatCompletionChunkAssembler();

    assembler.processChunk(makeChunk({
      tool_calls: [{
        index: 0,
        id: "call-abc",
        type: "function",
        function: { name: "read_file", arguments: '{"path":"a.ts"}' },
      }],
    }));

    // 一部の API は tool call があっても stop で終了する
    const result = assembler.processChunk(makeChunk({}, "stop"));

    expect(result.toolCallDeltas).toHaveLength(1);
    expect(result.toolCallDeltas[0].callId).toBe("call-abc");
    expect(result.toolCallDeltas[0].name).toBe("read_file");
  });

  test("tool call の id が無い場合フォールバック ID を生成する", () => {
    const assembler = new ChatCompletionChunkAssembler();

    assembler.processChunk(makeChunk({
      tool_calls: [{ index: 0, type: "function", function: { name: "list_dir", arguments: "{}" } }],
    }));

    const result = assembler.processChunk(makeChunk({}, "tool_calls"));

    expect(result.toolCallDeltas).toHaveLength(1);
    expect(result.toolCallDeltas[0].callId).toBe("call_0");
    expect(result.toolCallDeltas[0].name).toBe("list_dir");
  });

  test("flush でストリーム終端時に残った tool call を確定する", () => {
    const assembler = new ChatCompletionChunkAssembler();

    // finish_reason が来ないまま stream が閉じるケース
    assembler.processChunk(makeChunk({
      tool_calls: [{
        index: 0,
        id: "call-xyz",
        type: "function",
        function: { name: "grep_search", arguments: '{"q":"x"}' },
      }],
    }));

    const remaining = assembler.flush();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].callId).toBe("call-xyz");
    expect(remaining[0].name).toBe("grep_search");

    // flush 後はバッファが空
    expect(assembler.flush()).toHaveLength(0);
  });

  test("choices が空のチャンクを処理する", () => {
    const assembler = new ChatCompletionChunkAssembler();
    const emptyChunk: SakuraChatCompletionChunk = {
      id: "test",
      object: "chat.completion.chunk",
      created: Date.now(),
      model: "test",
      choices: [],
    };
    const result = assembler.processChunk(emptyChunk);
    expect(result.textDelta).toBe("");
    expect(result.toolCallDeltas).toHaveLength(0);
  });
});

describe("ChatCompletionChunkAssembler.parseToolArguments", () => {
  test("有効な JSON を正しくパースする", () => {
    const result = ChatCompletionChunkAssembler.parseToolArguments('{"key":"value"}');
    expect(result).toEqual({ key: "value" });
  });

  test("無効な JSON に対して空オブジェクトを返す", () => {
    const result = ChatCompletionChunkAssembler.parseToolArguments("invalid json");
    expect(result).toEqual({});
  });

  test("空文字列に対して空オブジェクトを返す", () => {
    const result = ChatCompletionChunkAssembler.parseToolArguments("");
    expect(result).toEqual({});
  });
});

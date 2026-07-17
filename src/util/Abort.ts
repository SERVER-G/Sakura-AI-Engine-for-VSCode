/**
 * AbortSignal ユーティリティ
 * タイムアウトとキャンセルトークンを組み合わせた AbortSignal を生成する
 */

/**
 * 複数の AbortSignal を結合して 1 つの AbortSignal を返す
 * 呼び出し元は戻り値の cleanup() を適切なタイミングで呼んでリスナーを解放すること
 */
export function anySignal(signals: AbortSignal[]): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const handlers: { signal: AbortSignal; handler: () => void }[] = [];

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return { signal: controller.signal, cleanup: () => {} };
    }
    const handler = () => controller.abort(signal.reason);
    signal.addEventListener("abort", handler, { once: true });
    handlers.push({ signal, handler });
  }

  const cleanup = () => {
    for (const { signal, handler } of handlers) {
      signal.removeEventListener("abort", handler);
    }
  };

  return { signal: controller.signal, cleanup };
}

/**
 * タイムアウト付き AbortSignal を生成する
 */
export function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort(new Error(`タイムアウト: ${ms}ms を超過しました`));
  }, ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

/**
 * VS Code CancellationToken を AbortSignal に変換する
 */
export function cancellationToSignal(token: { isCancellationRequested: boolean; onCancellationRequested: (listener: () => void) => { dispose: () => void } }): AbortSignal {
  const controller = new AbortController();

  if (token.isCancellationRequested) {
    controller.abort(new Error("操作がキャンセルされました"));
    return controller.signal;
  }

  const disposable = token.onCancellationRequested(() => {
    controller.abort(new Error("操作がキャンセルされました"));
    disposable.dispose();
  });

  return controller.signal;
}

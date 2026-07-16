/**
 * AbortSignal ユーティリティ
 * タイムアウトとキャンセルトークンを組み合わせた AbortSignal を生成する
 */

/**
 * 複数の AbortSignal を結合して 1 つの AbortSignal を返す
 */
export function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }

  return controller.signal;
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

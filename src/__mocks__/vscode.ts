/**
 * VS Code API モック
 * ユニットテスト用の最小限のモック実装
 */

export const LanguageModelChatMessageRole = {
  User: 1,
  Assistant: 2,
} as const;

export const LanguageModelChatToolMode = {
  Auto: 1,
  Required: 2,
} as const;

export class LanguageModelTextPart {
  constructor(public readonly value: string) {}
}

export class LanguageModelDataPart {
  mimeType: string;
  data: Uint8Array;

  constructor(data: Uint8Array, mimeType: string) {
    this.data = data;
    this.mimeType = mimeType;
  }

  static image(data: Uint8Array, mime: string): LanguageModelDataPart {
    return new LanguageModelDataPart(data, mime);
  }
}

export class LanguageModelToolCallPart {
  constructor(
    public readonly callId: string,
    public readonly name: string,
    public readonly input: unknown
  ) {}
}

export class LanguageModelToolResultPart {
  constructor(
    public readonly callId: string,
    public readonly content: (LanguageModelTextPart | LanguageModelDataPart | unknown)[]
  ) {}
}

export class LanguageModelError extends Error {
  readonly code: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "LanguageModelError";
    this.code = code ?? "Unknown";
  }

  static NoPermissions(message?: string): LanguageModelError {
    return new LanguageModelError(message ?? "No permissions", "NoPermissions");
  }
}

export type LanguageModelInputPart =
  | LanguageModelTextPart
  | LanguageModelToolResultPart
  | LanguageModelToolCallPart
  | LanguageModelDataPart;

export interface LanguageModelChatRequestMessage {
  role: typeof LanguageModelChatMessageRole[keyof typeof LanguageModelChatMessageRole];
  content: ReadonlyArray<LanguageModelInputPart | unknown>;
  name: string | undefined;
}

export const window = {
  createOutputChannel: (_name: string, _options?: unknown) => ({
    appendLine: (_line: string) => {},
    show: () => {},
    dispose: () => {},
  }),
  showInformationMessage: (_message: string, ..._args: unknown[]) =>
    Promise.resolve(undefined),
  showWarningMessage: (_message: string, ..._args: unknown[]) =>
    Promise.resolve(undefined),
  showErrorMessage: (_message: string, ..._args: unknown[]) =>
    Promise.resolve(undefined),
  showInputBox: (_options?: unknown) => Promise.resolve(undefined),
  withProgress: (
    _options: unknown,
    task: (progress: unknown, token: unknown) => Promise<unknown>
  ) =>
    task({}, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    }),
};

export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
  }),
  onDidChangeConfiguration: (_handler: unknown) => ({ dispose: () => {} }),
};

export const lm = {
  registerLanguageModelChatProvider: (
    _id: string,
    _provider: unknown
  ) => ({
    dispose: () => {},
  }),
};

export const commands = {
  registerCommand: (_id: string, _handler: (...args: unknown[]) => unknown) => ({
    dispose: () => {},
  }),
  executeCommand: (_id: string, ..._args: unknown[]) => Promise.resolve(undefined),
};

export enum ProgressLocation {
  Notification = 15,
  SourceControl = 1,
  Window = 10,
}

export interface PrepareLanguageModelChatModelOptions {
  readonly silent: boolean;
}

export interface ProvideLanguageModelChatResponseOptions {
  readonly tools?: readonly LanguageModelChatTool[];
  readonly toolMode: typeof LanguageModelChatToolMode[keyof typeof LanguageModelChatToolMode];
}

export interface LanguageModelChatTool {
  name: string;
  description: string;
  inputSchema?: object;
}

export const CancellationToken = {
  None: {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  },
};

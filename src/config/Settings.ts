/**
 * 設定管理
 * VS Code workspace configuration から設定値を読み取る
 */
import * as vscode from "vscode";

export interface SakuraExtensionSettings {
  baseUrl: string;
  defaultTransport: "chat-completions";
  requestTimeoutMs: number;
  connectTimeoutMs: number;
  readIdleTimeoutMs: number;
  maxConcurrentRequests: number;
  enableVision: boolean;
  enableToolCalling: boolean;
  enableRag: boolean;
  debugLogging: boolean;
  allowInsecureHttpForLocalDev: boolean;
  temperature: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

const DEFAULTS: SakuraExtensionSettings = {
  baseUrl: "https://api.ai.sakura.ad.jp",
  defaultTransport: "chat-completions",
  requestTimeoutMs: 300_000,
  connectTimeoutMs: 10_000,
  readIdleTimeoutMs: 60_000,
  maxConcurrentRequests: 4,
  enableVision: true,
  enableToolCalling: true,
  enableRag: false,
  debugLogging: false,
  allowInsecureHttpForLocalDev: false,
  temperature: 0.7,
  frequencyPenalty: 0.3,
  presencePenalty: 0.1,
};

export function getSettings(): SakuraExtensionSettings {
  const cfg = vscode.workspace.getConfiguration("sakuraAiEngine");

  const baseUrl = (cfg.get<string>("baseUrl") ?? DEFAULTS.baseUrl).replace(/\/$/, "");

  return {
    baseUrl,
    defaultTransport: "chat-completions",
    requestTimeoutMs: cfg.get<number>("requestTimeoutMs") ?? DEFAULTS.requestTimeoutMs,
    connectTimeoutMs: cfg.get<number>("connectTimeoutMs") ?? DEFAULTS.connectTimeoutMs,
    readIdleTimeoutMs: cfg.get<number>("readIdleTimeoutMs") ?? DEFAULTS.readIdleTimeoutMs,
    maxConcurrentRequests: cfg.get<number>("maxConcurrentRequests") ?? DEFAULTS.maxConcurrentRequests,
    enableVision: cfg.get<boolean>("enableVision") ?? DEFAULTS.enableVision,
    enableToolCalling: cfg.get<boolean>("enableToolCalling") ?? DEFAULTS.enableToolCalling,
    enableRag: cfg.get<boolean>("enableRag") ?? DEFAULTS.enableRag,
    debugLogging: cfg.get<boolean>("debugLogging") ?? DEFAULTS.debugLogging,
    allowInsecureHttpForLocalDev:
      cfg.get<boolean>("allowInsecureHttpForLocalDev") ?? DEFAULTS.allowInsecureHttpForLocalDev,
    temperature: cfg.get<number>("temperature") ?? DEFAULTS.temperature,
    frequencyPenalty: cfg.get<number>("frequencyPenalty") ?? DEFAULTS.frequencyPenalty,
    presencePenalty: cfg.get<number>("presencePenalty") ?? DEFAULTS.presencePenalty,
  };
}

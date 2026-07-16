/**
 * ロガー
 * VS Code OutputChannel を使ったデバッグログ
 */
import * as vscode from "vscode";
import { redactApiKey } from "./TelemetryRedaction.js";

export class Logger {
  private readonly channel: vscode.OutputChannel;
  private debugEnabled: boolean = false;

  constructor(channelName: string) {
    this.channel = vscode.window.createOutputChannel(channelName, { log: true });
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  info(message: string, ...args: unknown[]): void {
    this.channel.appendLine(this.format("INFO", message, args));
  }

  warn(message: string, ...args: unknown[]): void {
    this.channel.appendLine(this.format("WARN", message, args));
  }

  error(message: string, error?: unknown): void {
    const errorStr = error instanceof Error
      ? `${error.message}\n${error.stack ?? ""}`
      : String(error ?? "");
    this.channel.appendLine(this.format("ERROR", message + (errorStr ? `: ${errorStr}` : ""), []));
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.debugEnabled) return;
    this.channel.appendLine(this.format("DEBUG", message, args));
  }

  show(): void {
    this.channel.show();
  }

  dispose(): void {
    this.channel.dispose();
  }

  private format(level: string, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const sanitized = redactApiKey(message);
    const argsStr = args.length > 0 ? " " + args.map((a) => JSON.stringify(a)).join(" ") : "";
    return `[${timestamp}] [${level}] ${sanitized}${argsStr}`;
  }
}

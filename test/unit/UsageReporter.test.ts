/**
 * UsageReporter のユニットテスト
 */
import * as vscode from "vscode";
import { reportUsageToVscode, USAGE_MIME_TYPE } from "../../src/stream/UsageReporter";
import { SakuraUsage } from "../../src/types/sakura";

describe("reportUsageToVscode", () => {
  test("usage を mimeType 'usage' の DataPart として報告する", () => {
    const reported: vscode.LanguageModelResponsePart[] = [];
    const progress = { report: (p: vscode.LanguageModelResponsePart) => reported.push(p) };

    const usage: SakuraUsage = {
      prompt_tokens: 1200,
      completion_tokens: 340,
      total_tokens: 1540,
    };

    reportUsageToVscode(progress, usage);

    expect(reported).toHaveLength(1);
    const part = reported[0] as vscode.LanguageModelDataPart;
    expect(part).toBeInstanceOf(vscode.LanguageModelDataPart);
    expect(part.mimeType).toBe(USAGE_MIME_TYPE);

    const decoded = JSON.parse(new TextDecoder().decode(part.data));
    expect(decoded).toEqual({
      prompt_tokens: 1200,
      completion_tokens: 340,
      total_tokens: 1540,
    });
  });
});

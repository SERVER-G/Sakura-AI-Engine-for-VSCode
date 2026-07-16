/**
 * ツール定義マッパー
 * VS Code LanguageModelChatTool を OpenAI 互換の tools 定義に変換する
 */
import * as vscode from "vscode";
import { SakuraTool } from "../types/sakura.js";
import { NormalizedToolDefinition } from "../types/normalized.js";

export function mapTools(tools: readonly vscode.LanguageModelChatTool[]): SakuraTool[] {
  return tools.map(mapTool);
}

function mapTool(tool: vscode.LanguageModelChatTool): SakuraTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: (tool.inputSchema ?? {}) as Record<string, unknown>,
    },
  };
}

export function mapToolMode(
  toolMode: vscode.LanguageModelChatToolMode | undefined
): "none" | "auto" | "required" {
  if (!toolMode) return "none";

  if (toolMode === vscode.LanguageModelChatToolMode.Auto) {
    return "auto";
  }
  if (toolMode === vscode.LanguageModelChatToolMode.Required) {
    return "required";
  }

  return "auto";
}

export function toolModeToChoice(
  mode: "none" | "auto" | "required"
): "none" | "auto" | "required" | undefined {
  if (mode === "none") return undefined;
  return mode;
}

export function normalizeToolDefs(
  tools: readonly vscode.LanguageModelChatTool[]
): NormalizedToolDefinition[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: (t.inputSchema ?? {}) as Record<string, unknown>,
  }));
}

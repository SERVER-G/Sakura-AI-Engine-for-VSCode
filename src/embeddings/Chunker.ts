/**
 * コードチャンク化
 * ワークスペースのファイルを意味のある単位（関数・クラス・ファイル）に分割する
 */
import * as vscode from "vscode";

export interface CodeChunk {
  id: string;
  uri: string;
  range: { startLine: number; endLine: number };
  content: string;
  language: string;
  type: "function" | "class" | "interface" | "file";
  name: string;
}

/**
 * ファイルをチャンクに分割する
 * 簡易実装: 関数・クラス・インターフェースを正規表現で抽出
 */
export async function chunkDocument(document: vscode.TextDocument): Promise<CodeChunk[]> {
  const text = document.getText();
  const language = document.languageId;
  const uri = document.uri.toString();
  const chunks: CodeChunk[] = [];

  // 言語別のパターン
  const patterns = getPatternsForLanguage(language);

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex, "gm");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const name = match[1] ?? "anonymous";

      // 簡易的に次の空行または同レベルの定義までをチャンク範囲とする
      const startLine = startPos.line;
      const endLine = findChunkEndLine(document, startLine, pattern.indentBased);

      const content = document.getText(
        new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
      );

      chunks.push({
        id: `${uri}#L${startLine + 1}-L${endLine + 1}`,
        uri,
        range: { startLine, endLine },
        content,
        language,
        type: pattern.type,
        name,
      });
    }
  }

  // チャンクが抽出できなかった場合はファイル全体を1チャンクとする
  if (chunks.length === 0) {
    const lineCount = document.lineCount;
    chunks.push({
      id: `${uri}#L1-L${lineCount}`,
      uri,
      range: { startLine: 0, endLine: lineCount - 1 },
      content: text,
      language,
      type: "file",
      name: document.fileName.split("/").pop() ?? "file",
    });
  }

  return chunks;
}

interface ChunkPattern {
  type: "function" | "class" | "interface";
  regex: string;
  indentBased: boolean;
}

function getPatternsForLanguage(language: string): ChunkPattern[] {
  const commonPatterns: ChunkPattern[] = [
    { type: "function", regex: "(?:async\\s+)?(?:function\\s+([A-Za-z0-9_]+)|const\\s+([A-Za-z0-9_]+)\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|[^=]*)\\s*=>|([A-Za-z0-9_]+)\\s*\\([^)]*\\)\\s*\\{)", indentBased: true },
    { type: "class", regex: "class\\s+([A-Za-z0-9_]+)", indentBased: true },
    { type: "interface", regex: "interface\\s+([A-Za-z0-9_]+)", indentBased: true },
  ];

  const pythonPatterns: ChunkPattern[] = [
    { type: "function", regex: "def\\s+([A-Za-z0-9_]+)\\s*\\(", indentBased: true },
    { type: "class", regex: "class\\s+([A-Za-z0-9_]+)", indentBased: true },
  ];

  const rustPatterns: ChunkPattern[] = [
    { type: "function", regex: "fn\\s+([A-Za-z0-9_]+)", indentBased: true },
    { type: "interface", regex: "trait\\s+([A-Za-z0-9_]+)", indentBased: true },
    { type: "class", regex: "struct\\s+([A-Za-z0-9_]+)", indentBased: true },
  ];

  const goPatterns: ChunkPattern[] = [
    { type: "function", regex: "func\\s+(?:\\([^)]*\\)\\s+)?([A-Za-z0-9_]+)\\s*\\(", indentBased: true },
    { type: "interface", regex: "type\\s+([A-Za-z0-9_]+)\\s+interface", indentBased: true },
    { type: "class", regex: "type\\s+([A-Za-z0-9_]+)\\s+struct", indentBased: true },
  ];

  switch (language) {
    case "python":
      return pythonPatterns;
    case "rust":
      return rustPatterns;
    case "go":
      return goPatterns;
    default:
      return commonPatterns;
  }
}

/**
 * チャンクの終了行を見つける
 * インデントベースまたは空行ベースで判断
 */
function findChunkEndLine(document: vscode.TextDocument, startLine: number, indentBased: boolean): number {
  const startIndent = getIndentLevel(document.lineAt(startLine).text);
  const maxLine = document.lineCount - 1;

  for (let i = startLine + 1; i <= maxLine; i++) {
    const line = document.lineAt(i).text;

    // 空行はスキップ
    if (line.trim() === "") {
      continue;
    }

    const indent = getIndentLevel(line);

    // インデントが同じか小さくなったら終了
    if (indentBased && indent <= startIndent && !line.trim().startsWith("//") && !line.trim().startsWith("#") && !line.trim().startsWith("*")) {
      return i - 1;
    }

    // 閉じ括弧だけの行でも終了とみなす
    if (/^[\s\}]*\}$/.test(line) && indent <= startIndent) {
      return i;
    }
  }

  return maxLine;
}

function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

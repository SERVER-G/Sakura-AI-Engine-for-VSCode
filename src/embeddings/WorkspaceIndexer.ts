/**
 * ワークスペースインデクサー
 * ワークスペース内のコードファイルをチャンク化し、Embeddings API でベクトル化して保存する
 */
import * as vscode from "vscode";
import { chunkDocument, CodeChunk } from "./Chunker.js";
import { EmbeddingsTransport } from "./EmbeddingsTransport.js";
import { VectorStore, VectorEntry } from "./VectorStore.js";
import { Logger } from "../diagnostics/Logger.js";

const EXCLUDED_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/out/**",
  "**/build/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/coverage/**",
  "**/.vscode/**",
];

const INCLUDED_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "java",
  "csharp",
  "cpp",
  "c",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "dart",
  "elixir",
  "haskell",
  "lua",
  "perl",
  "r",
  "shellscript",
  "powershell",
  "sql",
  "json",
  "yaml",
  "xml",
  "markdown",
];

export class WorkspaceIndexer {
  private vectorStore: VectorStore;
  private transport: EmbeddingsTransport;
  private logger: Logger;
  private isIndexing = false;

  constructor(logger: Logger) {
    this.vectorStore = new VectorStore();
    this.transport = new EmbeddingsTransport();
    this.logger = logger;
  }

  /**
   * ワークスペース全体をインデックス化する
   */
  async indexWorkspace(
    baseUrl: string,
    apiKey: string,
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
    token?: vscode.CancellationToken
  ): Promise<void> {
    if (this.isIndexing) {
      this.logger.warn("インデックス化は既に実行中です");
      return;
    }

    this.isIndexing = true;
    this.logger.info("ワークスペースのインデックス化を開始します");

    try {
      // 対象ファイルを検索
      const files = await vscode.workspace.findFiles(
        "**/*",
        `{${EXCLUDED_PATTERNS.join(",")}}`,
        5000
      );

      const codeFiles = files.filter((f) => this.isCodeFile(f));
      this.logger.info(`インデックス対象ファイル: ${codeFiles.length} 件`);

      if (codeFiles.length === 0) {
        this.logger.info("インデックス対象のファイルが見つかりませんでした");
        return;
      }

      // ファイルをバッチ処理
      const batchSize = 10;
      const totalBatches = Math.ceil(codeFiles.length / batchSize);

      for (let i = 0; i < codeFiles.length; i += batchSize) {
        if (token?.isCancellationRequested) {
          this.logger.info("インデックス化がキャンセルされました");
          break;
        }

        const batch = codeFiles.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        progress?.report({
          message: `ファイルを処理中... (${batchNum}/${totalBatches})`,
          increment: 100 / totalBatches,
        });

        await this.processFileBatch(batch, baseUrl, apiKey);
      }

      this.logger.info(`インデックス化完了: ${this.vectorStore.size()} チャンク`);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * ファイルバッチを処理する
   */
  private async processFileBatch(
    files: vscode.Uri[],
    baseUrl: string,
    apiKey: string
  ): Promise<void> {
    const allChunks: CodeChunk[] = [];

    for (const file of files) {
      try {
        const document = await vscode.workspace.openTextDocument(file);
        if (!INCLUDED_LANGUAGES.includes(document.languageId)) {
          continue;
        }

        const chunks = await chunkDocument(document);
        allChunks.push(...chunks);
      } catch (err) {
        this.logger.debug(`ファイル読み込みスキップ: ${file.fsPath}`);
      }
    }

    if (allChunks.length === 0) {
      return;
    }

    // テキストを抽出して Embeddings API を呼び出し
    const texts = allChunks.map((c) => this.truncateText(c.content, 8000));

    try {
      const vectors = await this.transport.embed(
        texts,
        "multilingual-e5-large",
        baseUrl,
        apiKey,
        this.logger
      );

      const entries: VectorEntry[] = allChunks.map((chunk, i) => ({
        chunk,
        vector: vectors[i],
      }));

      this.vectorStore.add(entries);
    } catch (err) {
      this.logger.error("Embeddings API 呼び出しエラー", err);
    }
  }

  /**
   * クエリに関連するコードチャンクを検索する
   */
  async search(
    query: string,
    baseUrl: string,
    apiKey: string,
    topK: number = 5
  ): Promise<CodeChunk[]> {
    if (this.vectorStore.size() === 0) {
      return [];
    }

    try {
      const queryVectors = await this.transport.embed(
        [query],
        "multilingual-e5-large",
        baseUrl,
        apiKey,
        this.logger
      );

      const results = this.vectorStore.search(queryVectors[0], topK);
      return results.map((r) => r.chunk);
    } catch (err) {
      this.logger.error("検索エラー", err);
      return [];
    }
  }

  /**
   * インデックスが空かどうか
   */
  isEmpty(): boolean {
    return this.vectorStore.size() === 0;
  }

  /**
   * インデックスサイズを返す
   */
  size(): number {
    return this.vectorStore.size();
  }

  /**
   * インデックスをクリアする
   */
  clear(): void {
    this.vectorStore.clear();
  }

  /**
   * コードファイルかどうかを判定
   */
  private isCodeFile(uri: vscode.Uri): boolean {
    const ext = uri.fsPath.split(".").pop()?.toLowerCase() ?? "";
    const codeExts = [
      "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "cs", "cpp", "c", "h",
      "rb", "php", "swift", "kt", "scala", "dart", "ex", "exs", "hs", "lua",
      "pl", "r", "sh", "ps1", "sql", "json", "yaml", "yml", "xml", "md",
    ];
    return codeExts.includes(ext);
  }

  /**
   * テキストを指定文字数で切り詰める
   */
  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars);
  }

  /**
   * リソースを解放する
   */
  dispose(): void {
    this.vectorStore.clear();
  }
}

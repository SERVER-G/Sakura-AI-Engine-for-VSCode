/**
 * 簡易ベクトルストア
 * コードチャンクの埋め込みベクトルをメモリ上に保持し、コサイン類似度で検索する
 */
import { CodeChunk } from "./Chunker.js";

export interface VectorEntry {
  chunk: CodeChunk;
  vector: number[];
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  /**
   * エントリーを追加する
   */
  add(entries: VectorEntry[]): void {
    this.entries.push(...entries);
  }

  /**
   * クエリベクトルに最も近い上位 k 件を返す
   */
  search(queryVector: number[], topK: number = 5): VectorEntry[] {
    const scored = this.entries.map((entry) => ({
      entry,
      similarity: cosineSimilarity(queryVector, entry.vector),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK).map((s) => s.entry);
  }

  /**
   * ストアをクリアする
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * エントリー数を返す
   */
  size(): number {
    return this.entries.length;
  }
}

/**
 * コサイン類似度を計算する
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

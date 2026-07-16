/**
 * Embeddings トランスポート
 * Sakura AI Engine の /v1/embeddings エンドポイントと通信する
 */
import { Logger } from "../diagnostics/Logger.js";

export interface EmbeddingsRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingsResponse {
  object: "list";
  data: {
    object: "embedding";
    embedding: number[];
    index: number;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class EmbeddingsTransport {
  async embed(
    texts: string[],
    model: string,
    baseUrl: string,
    apiKey: string,
    logger: Logger
  ): Promise<number[][]> {
    const url = `${baseUrl}/v1/embeddings`;
    const requestBody: EmbeddingsRequest = {
      model,
      input: texts,
    };

    logger.debug(`Embeddings request: model=${model}, texts=${texts.length}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      logger.error(`Embeddings API error: HTTP ${response.status} ${errorText}`);
      throw new Error(`Embeddings API error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as EmbeddingsResponse;
    logger.debug(`Embeddings response: ${data.data.length} vectors`);

    return data.data.map((d) => d.embedding);
  }
}

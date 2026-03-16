/**
 * 嵌入生成模块
 * 使用阿里云 DashScope API 生成嵌入
 */

import { getAIApiKey } from "@/lib/core/config";

const DASHSCOPE_EMBEDDING_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";

/**
 * 生成文本嵌入
 * @param text 要嵌入的文本
 * @returns 嵌入向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // 检查文本长度，API限制为8192字符
    const MAX_LENGTH = 8000;
    if (text.length > MAX_LENGTH) {
      text = text.substring(0, MAX_LENGTH);
    }

    const apiKey = getAIApiKey();

    const response = await fetch(DASHSCOPE_EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-v3",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DashScope API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("生成嵌入失败:", error);
    throw error;
  }
}

/**
 * 批量生成嵌入
 * @param texts 文本数组
 * @returns 嵌入向量数组
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const MAX_LENGTH = 8000;

  // 截断超长文本
  const processedTexts = texts.map((text) => {
    if (text.length > MAX_LENGTH) {
      return text.substring(0, MAX_LENGTH);
    }
    return text;
  });

  // 分批处理，避免API限制
  const batchSize = 10;
  for (let i = 0; i < processedTexts.length; i += batchSize) {
    const batch = processedTexts.slice(i, i + batchSize);

    try {
      const apiKey = getAIApiKey();

      const response = await fetch(DASHSCOPE_EMBEDDING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-v3",
          input: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DashScope API error: ${error}`);
      }

      const data = await response.json();
      const batchEmbeddings = data.data.map((item: { embedding: number[] }) => item.embedding);
      embeddings.push(...batchEmbeddings);
    } catch (error) {
      console.error("批量生成嵌入失败:", error);
      // 单个失败不影响整体
      embeddings.push(...batch.map(() => []));
    }
  }

  return embeddings;
}

export { cosineSimilarity as calculateSimilarity };
/**
 * 计算两个向量的余弦相似度
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("向量长度不匹配");
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

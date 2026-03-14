import { initVectorDB, getOrCreateCollection } from "./vector-db";
import { generateEmbedding } from "./embedding";
import { processDocuments, chunkDocument } from "./document-processor";

/**
 * RAG 配置选项
 */
export interface RAGOptions {
  topK: number; // 检索前K个相关文档
  chunkSize: number; // 文档分块大小
  maxContextLength: number; // 最大上下文长度
}

/**
 * 默认RAG配置
 */
export const DEFAULT_RAG_OPTIONS: RAGOptions = {
  topK: 3,
  chunkSize: 1000,
  maxContextLength: 4000,
};

/**
 * 索引文档到向量数据库
 */
export async function indexDocuments(directory: string): Promise<number> {
  try {
    // 处理文档
    const documents = await processDocuments(directory);

    // 获取向量集合
    const collection = await getOrCreateCollection();

    // 批量索引文档
    let indexedCount = 0;
    const batchSize = 10;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      const vectorDocs: Array<{
        id: string;
        content: string;
        embedding: number[];
        metadata: any;
      }> = [];

      for (const doc of batch) {
        // 分块处理
        const docChunks = chunkDocument(doc.content, DEFAULT_RAG_OPTIONS.chunkSize);

        for (let j = 0; j < docChunks.length; j++) {
          const chunkId = `${doc.id}_chunk_${j}`;
          if (await collection.exists(chunkId)) {
            continue;
          }

          const chunkEmbedding = await generateEmbedding(docChunks[j]);

          vectorDocs.push({
            id: chunkId,
            content: docChunks[j],
            embedding: chunkEmbedding,
            metadata: {
              ...doc.metadata,
              chunkIndex: j,
              chunkLength: docChunks[j].length,
            },
          });

          indexedCount++;
        }
      }

      // 添加到向量数据库
      if (vectorDocs.length > 0) {
        await collection.add(vectorDocs);
      }
    }

    return indexedCount;
  } catch (error) {
    console.error("索引文档失败:", error);
    throw error;
  }
}

/**
 * 语义检索相关文档
 */
export async function retrieveRelevantDocuments(
  query: string,
  options: Partial<RAGOptions> = {}
): Promise<{ id: string; content: string; metadata: any; distance: number }[]> {
  try {
    const config = { ...DEFAULT_RAG_OPTIONS, ...options };

    // 生成查询嵌入
    const queryEmbedding = await generateEmbedding(query);

    // 获取向量集合
    const collection = await getOrCreateCollection();
    const docCount = await collection.count();

    if (docCount === 0) {
      return [];
    }

    // 检索相关文档（多检索一些，然后过滤）
    const results = await collection.query({
      queryEmbedding,
      nResults: config.topK * 2,
    });

    // 过滤低相关度的文档（distance < 0.3 表示相似度较高）
    const MIN_SIMILARITY = 0.3;
    const filteredResults = results.filter((doc) => {
      const similarity = 1 - doc.distance;
      return similarity >= MIN_SIMILARITY;
    });

    // 只保留 topK 个最相关的文档
    const finalResults = filteredResults.slice(0, config.topK);

    return finalResults;
  } catch (error) {
    console.error("检索文档失败:", error);
    return [];
  }
}

/**
 * RAG 增强生成
 */
export async function ragGenerate(
  query: string,
  chatHistory: { role: string; content: string }[] = [],
  options: Partial<RAGOptions> = {}
): Promise<string> {
  try {
    const config = { ...DEFAULT_RAG_OPTIONS, ...options };

    // 检索相关文档
    const relevantDocs = await retrieveRelevantDocuments(query, config);

    // 如果没有高相关度文档，返回原始查询
    if (relevantDocs.length === 0) {
      return query;
    }

    // 构建上下文
    let context = "";
    for (const doc of relevantDocs) {
      context += `[文档: ${doc.metadata?.title || "未知"}]\n${doc.content}\n\n`;
    }

    // 构建增强的提示词
    const enhancedPrompt = `基于以下相关文档内容回答问题：

${context}

用户问题：${query}

请根据文档内容提供专业、准确的回答。`;

    // 返回增强的提示词，供后续 AI 调用使用
    return enhancedPrompt;
  } catch (error) {
    console.error("RAG生成失败:", error);
    // 失败时返回原始查询
    return query;
  }
}

/**
 * 检查向量数据库状态
 */
export async function checkVectorDBStatus(): Promise<{ status: string; stats: any }> {
  try {
    const collection = await getOrCreateCollection();
    const stats = await collection.count();

    return {
      status: "ok",
      stats: {
        documentCount: stats,
      },
    };
  } catch (error: any) {
    return {
      status: "error",
      stats: { error: error.message },
    };
  }
}

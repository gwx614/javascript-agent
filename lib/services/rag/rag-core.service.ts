/**
 * RAG 核心业务服务
 * 包含索引、检索、生成等高阶逻辑
 */

import { getOrCreateCollection } from "./vector-store.service";
import { generateEmbedding } from "./embedding.service";
import { processDocuments, chunkDocument } from "./loader.service";

/**
 * RAG 配置选项
 */
export interface RAGOptions {
  topK: number;
  chunkSize: number;
  maxContextLength: number;
}

/**
 * 默认RAG配置
 */
export const DEFAULT_RAG_OPTIONS: RAGOptions = {
  topK: 3,
  chunkSize: 1000,
  maxContextLength: 6000,
};

/**
 * 索引文档到向量数据库
 */
export async function indexDocuments(directory: string): Promise<number> {
  try {
    const documents = await processDocuments(directory);
    const collection = await getOrCreateCollection();

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
 * 扩展查询，提高简短查询的检索准确性
 */
export function expandQuery(query: string): string {
  // 检测是否是数学运算查询
  const mathOperators = ["%", "+", "-", "*", "/", "**"];
  const hasMathOperator = mathOperators.some((operator) => query.includes(operator));

  // 检测是否是代码相关查询
  const codeKeywords = ["js", "javascript", "function", "var", "let", "const", "console"];
  const hasCodeKeyword = codeKeywords.some((keyword) => query.toLowerCase().includes(keyword));

  // 扩展数学运算查询
  if (hasMathOperator) {
    return `JavaScript中${query}的结果是什么 ${query} 运算符 运算结果`;
  }

  // 扩展代码相关查询
  if (hasCodeKeyword) {
    return `JavaScript ${query} 代码示例 用法`;
  }

  return query;
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

    // 扩展查询以提高检索准确性
    const expandedQuery = expandQuery(query);
    const queryEmbedding = await generateEmbedding(expandedQuery);
    const collection = await getOrCreateCollection();
    const docCount = await collection.count();

    if (docCount === 0) {
      return [];
    }

    // 根据查询长度和复杂度动态调整检索参数
    const queryLength = query.length;
    const adjustedTopK = Math.min(
      config.topK,
      queryLength > 50 ? config.topK : Math.max(1, config.topK - 1)
    );

    const results = await collection.query({
      queryEmbedding,
      nResults: adjustedTopK * 3, // 获取更多结果以便过滤
    });

    // 过滤掉不相关的文档
    const MIN_SIMILARITY = 0.6;
    const filteredResults = results.filter((doc: any) => {
      const similarity = 1 - doc.distance;
      return similarity >= MIN_SIMILARITY;
    });

    // 文档去重
    const uniqueResults: { id: string; content: string; metadata: any; distance: number }[] = [];
    const seenTitles = new Set<string>();
    const contentSimilarityThreshold = 0.8;

    for (const doc of filteredResults) {
      const title = doc.metadata?.title || "未知文档";
      const normalizedTitle = title.toLowerCase().trim();

      if (seenTitles.has(normalizedTitle)) {
        continue;
      }

      const isDuplicate = uniqueResults.some((existingDoc) => {
        const commonLength = Math.min(doc.content.length, existingDoc.content.length);
        let matchCount = 0;
        for (let i = 0; i < commonLength; i++) {
          if (doc.content[i] === existingDoc.content[i]) {
            matchCount++;
          }
        }
        const similarity = matchCount / commonLength;
        return similarity > contentSimilarityThreshold;
      });

      if (!isDuplicate) {
        uniqueResults.push(doc);
        seenTitles.add(normalizedTitle);
        if (uniqueResults.length >= adjustedTopK) {
          break;
        }
      }
    }

    return uniqueResults.slice(0, adjustedTopK);
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
  _chatHistory: { role: string; content: string }[] = [],
  options: Partial<RAGOptions> = {}
): Promise<string> {
  try {
    const config = { ...DEFAULT_RAG_OPTIONS, ...options };
    const relevantDocs = await retrieveRelevantDocuments(query, config);

    if (relevantDocs.length === 0) {
      return query;
    }

    let context = "";
    let totalLength = 0;
    const maxContextLength = config.maxContextLength;
    const basePromptLength =
      `基于以下相关文档内容回答问题：\n\n用户问题：${query}\n\n请根据文档内容提供专业、准确的回答。`
        .length;
    const availableContextLength = maxContextLength - basePromptLength;

    const sortedDocs = [...relevantDocs].sort((a, b) => 1 - a.distance - (1 - b.distance));

    for (const doc of sortedDocs) {
      const docContent = `[文档: ${doc.metadata?.title || "未知"}]\n${doc.content}\n\n`;
      const docLength = docContent.length;

      if (totalLength + docLength <= availableContextLength) {
        context += docContent;
        totalLength += docLength;
      } else {
        const remainingLength = availableContextLength - totalLength;
        if (remainingLength > 100) {
          const truncatedContent = docContent.substring(0, remainingLength - 3) + "...\n\n";
          context += truncatedContent;
          totalLength += truncatedContent.length;
        }
        break;
      }
    }

    return `基于以下相关文档内容回答问题：\n\n${context}\n用户问题：${query}\n\n请根据文档内容提供专业、准确的回答。`;
  } catch (error) {
    console.error("RAG生成失败:", error);
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
    console.error("❌ 数据库状态检查失败:", error);
    return {
      status: "error",
      stats: { error: error.message },
    };
  }
}

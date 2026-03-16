/**
 * RAG 模块统一导出
 */

import { getOrCreateCollection } from "./vector-db";
import { generateEmbedding } from "./embedding";
import { processDocuments, chunkDocument } from "./document-processor";

export { generateEmbedding, generateBatchEmbeddings } from "./embedding";
export { processDocuments, chunkDocument } from "./document-processor";
export type { DocumentMetadata, ProcessedDocument } from "./document-processor";
export {
  SQLiteVectorDB,
  getSQLiteVectorDB,
  initVectorDB,
  getOrCreateCollection,
  VECTOR_COLLECTION_NAME,
} from "./vector-db";
export type { VectorDocument, QueryResult } from "./vector-db";

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
function expandQuery(query: string): string {
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
    console.log(`\n🔍 RAG 检索: "${expandedQuery}"`);

    const queryEmbedding = await generateEmbedding(expandedQuery);
    const collection = await getOrCreateCollection();
    const docCount = await collection.count();

    console.log(`📊 数据库中有 ${docCount} 条记录`);

    if (docCount === 0) {
      console.log("⚠️  数据库为空，无法检索");
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

    // 提高相似度阈值，过滤掉不相关的文档
    const MIN_SIMILARITY = 0.6;
    const filteredResults = results.filter((doc) => {
      const similarity = 1 - doc.distance;
      return similarity >= MIN_SIMILARITY;
    });

    // 文档去重：基于标题和内容相似度
    const uniqueResults: { id: string; content: string; metadata: any; distance: number }[] = [];
    const seenTitles = new Set<string>();
    const contentSimilarityThreshold = 0.8;

    for (const doc of filteredResults) {
      const title = doc.metadata?.title || "未知文档";
      const normalizedTitle = title.toLowerCase().trim();

      // 检查标题是否已存在
      if (seenTitles.has(normalizedTitle)) {
        continue;
      }

      // 检查内容是否与已添加的文档高度相似
      const isDuplicate = uniqueResults.some((existingDoc) => {
        // 简单的内容相似度计算
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

    const finalResults = uniqueResults.slice(0, adjustedTopK);

    // 打印检索结果
    console.log(`✅ 找到 ${finalResults.length} 个相关文档:`);
    finalResults.forEach((doc, index) => {
      const similarity = (1 - doc.distance).toFixed(2);
      const title = doc.metadata?.title || "未知文档";
      console.log(`  ${index + 1}. [${similarity}] ${title}`);
    });

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
  _chatHistory: { role: string; content: string }[] = [],
  options: Partial<RAGOptions> = {}
): Promise<string> {
  try {
    const startTime = Date.now();
    const config = { ...DEFAULT_RAG_OPTIONS, ...options };
    console.log(`\n🚀 开始 RAG 增强生成`);
    console.log(`📋 查询信息: 长度 ${query.length} 字符`);

    // 检索相关文档
    const retrieveStartTime = Date.now();
    const relevantDocs = await retrieveRelevantDocuments(query, config);
    const retrieveEndTime = Date.now();

    console.log(`⏱️  检索耗时: ${(retrieveEndTime - retrieveStartTime).toFixed(1)}ms`);

    if (relevantDocs.length === 0) {
      console.log("⚠️  未找到相关文档，使用原始查询");
      return query;
    }

    // 构建上下文，确保不超过最大长度
    let context = "";
    let totalLength = 0;
    const maxContextLength = config.maxContextLength;
    const basePromptLength = `基于以下相关文档内容回答问题：

用户问题：${query}

请根据文档内容提供专业、准确的回答。`.length;
    const availableContextLength = maxContextLength - basePromptLength;

    console.log(
      `📊 上下文配置: 最大长度 ${maxContextLength} 字符, 可用长度 ${availableContextLength} 字符`
    );

    // 按相关性排序文档
    const sortedDocs = [...relevantDocs].sort((a, b) => 1 - a.distance - (1 - b.distance));

    let includedDocs = 0;
    let truncatedDocs = 0;

    for (const doc of sortedDocs) {
      const docContent = `[文档: ${doc.metadata?.title || "未知"}]\n${doc.content}\n\n`;
      const docLength = docContent.length;

      if (totalLength + docLength <= availableContextLength) {
        context += docContent;
        totalLength += docLength;
        includedDocs++;
      } else {
        // 智能截断：尝试保留部分内容
        const remainingLength = availableContextLength - totalLength;
        if (remainingLength > 100) {
          // 确保有足够的空间保留有意义的内容
          // 找到合适的截断点
          const truncatedContent = docContent.substring(0, remainingLength - 3) + "...\n\n";
          context += truncatedContent;
          totalLength += truncatedContent.length;
          includedDocs++;
          truncatedDocs++;
        }
        break; // 达到长度限制，停止添加文档
      }
    }

    // 打印上下文预览
    console.log(`📄 上下文预览 (前 500 字符):`);
    console.log(context.substring(0, 500) + (context.length > 500 ? "..." : ""));

    // 构建增强的提示词
    const enhancedPrompt = `基于以下相关文档内容回答问题：

${context}

用户问题：${query}

请根据文档内容提供专业、准确的回答。`;

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const contextUsage = Math.round((totalLength / availableContextLength) * 100);

    console.log(`✅ RAG 增强完成`);
    console.log(
      `📊 上下文统计: 长度 ${context.length} 字符 (限制: ${maxContextLength} 字符, 使用率: ${contextUsage}%)`
    );
    console.log(`📋 文档统计: 包含 ${includedDocs} 个文档, 截断 ${truncatedDocs} 个文档`);
    console.log(`⏱️  总耗时: ${totalTime.toFixed(1)}ms`);

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
    console.log("\n📋 检查向量数据库状态");
    const collection = await getOrCreateCollection();
    const stats = await collection.count();
    console.log(`✅ 数据库状态: 正常，记录数: ${stats}`);

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

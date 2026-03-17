/**
 * RAG 模块统一导出 (Facade 层)
 * 该文件作为 RAG 功能的统一入口，所有具体实现逻辑均位于 lib/services/rag 目录下
 */

// 1. 底层服务导出
export { generateEmbedding, generateBatchEmbeddings } from "@/lib/services/rag/embedding.service";

export { processDocuments, chunkDocument } from "@/lib/services/rag/loader.service";

export type { DocumentMetadata, ProcessedDocument } from "@/lib/services/rag/loader.service";

export {
  SQLiteVectorDB,
  getSQLiteVectorDB,
  initVectorDB,
  getOrCreateCollection,
  VECTOR_COLLECTION_NAME,
} from "@/lib/services/rag/vector-store.service";

export type { VectorDocument, QueryResult } from "@/lib/services/rag/vector-store.service";

export { SQLiteLangChainVectorStore } from "@/lib/services/rag/langchain-adapter.service";

// 2. 核心业务服务导出
export {
  type RAGOptions,
  DEFAULT_RAG_OPTIONS,
  indexDocuments,
  expandQuery,
  retrieveRelevantDocuments,
  ragGenerate,
  checkVectorDBStatus,
} from "@/lib/services/rag/rag-core.service";

// 3. 工具导出 (保持向下兼容)
export { createJavascriptSearchTool } from "@/lib/tools/javascript-search.tool";
export { createWebSearchTool } from "@/lib/tools/web-search.tool";
export { createDatabaseToolkit } from "@/lib/tools/db-query.tool";

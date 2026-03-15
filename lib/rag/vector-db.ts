/**
 * 向量数据库入口
 * 使用 SQLite 实现持久化存储
 */

export {
  SQLiteVectorDB,
  getSQLiteVectorDB,
  initVectorDB,
  getOrCreateCollection,
  VECTOR_COLLECTION_NAME,
} from "./vector-db-sqlite";

export type { VectorDocument, QueryResult } from "./vector-db-sqlite";

/**
 * SQLite 向量数据库实现
 * 使用 better-sqlite3 提供持久化的向量存储
 */

import Database from "better-sqlite3";
import path from "path";
import { calculateSimilarity } from "@/lib/utils";

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), "data", "vector-store.db");

// 向量数据接口
export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

// 查询结果接口
export interface QueryResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  distance: number;
}

/**
 * SQLite 向量数据库类
 */
export class SQLiteVectorDB {
  private db: Database.Database | null = null;
  private collectionName: string;

  constructor(collectionName: string = "javascript_knowledge") {
    this.collectionName = collectionName;
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    try {
      // 确保数据目录存在
      const fs = await import("fs");
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 打开数据库
      this.db = new Database(DB_PATH);

      // 创建向量表
      this.createTable();
    } catch (error) {
      console.error("SQLite 向量数据库初始化失败:", error);
      throw error;
    }
  }

  /**
   * 创建向量表
   */
  private createTable(): void {
    if (!this.db) return;

    // 创建主表存储文档
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.collectionName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_${this.collectionName}_created 
      ON ${this.collectionName}(created_at)
    `);
  }

  /**
   * 添加文档
   */
  async add(documents: VectorDocument[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const insertStmt = this.db!.prepare(`
      INSERT OR REPLACE INTO ${this.collectionName} (id, content, embedding, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db!.transaction((docs: VectorDocument[]) => {
      for (const doc of docs) {
        insertStmt.run(
          doc.id,
          doc.content,
          JSON.stringify(doc.embedding),
          JSON.stringify(doc.metadata)
        );
      }
    });

    insertMany(documents);
  }

  /**
   * 查询相似向量
   * 使用余弦相似度计算，支持全量扫描
   */
  async query({
    queryEmbedding,
    nResults = 5,
  }: {
    queryEmbedding: number[];
    nResults?: number;
  }): Promise<QueryResult[]> {
    if (!this.db) {
      await this.init();
    }

    const totalCount = await this.count();

    // 小数据量：直接全量扫描
    if (totalCount <= 1000) {
      return this.fullScanQuery(queryEmbedding, nResults);
    }

    // 大数据量：分层检索策略
    return this.hierarchicalQuery(queryEmbedding, nResults, totalCount);
  }

  /**
   * 全量扫描查询
   */
  private fullScanQuery(queryEmbedding: number[], nResults: number): QueryResult[] {
    const stmt = this.db!.prepare(`
      SELECT id, content, embedding, metadata
      FROM ${this.collectionName}
    `);

    const rows = stmt.all() as Array<{
      id: string;
      content: string;
      embedding: string;
      metadata: string;
    }>;

    return this.calculateAndRankResults(rows, queryEmbedding, nResults);
  }

  /**
   * 分层检索查询
   * 先扫描最近数据，如果质量不够再扫描更早的数据
   */
  private async hierarchicalQuery(
    queryEmbedding: number[],
    nResults: number,
    totalCount: number
  ): Promise<QueryResult[]> {
    const FIRST_BATCH_SIZE = Math.min(500, Math.floor(totalCount * 0.2));
    const SIMILARITY_THRESHOLD = 0.7; // 相似度阈值

    // 第一轮：扫描最近的 20% 或 500 条
    const stmt1 = this.db!.prepare(`
      SELECT id, content, embedding, metadata
      FROM ${this.collectionName}
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows1 = stmt1.all(FIRST_BATCH_SIZE) as Array<{
      id: string;
      content: string;
      embedding: string;
      metadata: string;
    }>;

    const results1 = this.calculateAndRankResults(rows1, queryEmbedding, nResults);

    // 如果找到足够高相似度的结果，直接返回
    const hasHighQualityResults =
      results1.length > 0 && results1[0].distance < 1 - SIMILARITY_THRESHOLD;

    if (hasHighQualityResults) {
      return results1;
    }

    // 第二轮：扫描剩余数据
    const stmt2 = this.db!.prepare(`
      SELECT id, content, embedding, metadata
      FROM ${this.collectionName}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows2 = stmt2.all(totalCount - FIRST_BATCH_SIZE, FIRST_BATCH_SIZE) as Array<{
      id: string;
      content: string;
      embedding: string;
      metadata: string;
    }>;

    // 合并结果并重新排序
    const allRows = [...rows1, ...rows2];
    return this.calculateAndRankResults(allRows, queryEmbedding, nResults);
  }

  /**
   * 计算相似度并排序结果
   */
  private calculateAndRankResults(
    rows: Array<{ id: string; content: string; embedding: string; metadata: string }>,
    queryEmbedding: number[],
    nResults: number
  ): QueryResult[] {
    const results: QueryResult[] = rows.map((row) => {
      const embedding = JSON.parse(row.embedding) as number[];
      const similarity = calculateSimilarity(queryEmbedding, embedding);

      return {
        id: row.id,
        content: row.content,
        metadata: JSON.parse(row.metadata || "{}"),
        distance: 1 - similarity,
      };
    });

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, nResults);
  }

  /**
   * 检查文档是否存在
   */
  async exists(id: string): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db!.prepare(`SELECT 1 FROM ${this.collectionName} WHERE id = ? LIMIT 1`);
    const result = stmt.get(id);
    return !!result;
  }

  /**
   * 获取文档
   */
  async getDocument(id: string): Promise<QueryResult | null> {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db!.prepare(
      `SELECT id, content, metadata FROM ${this.collectionName} WHERE id = ? LIMIT 1`
    );
    const row = stmt.get(id) as
      | {
          id: string;
          content: string;
          metadata: string;
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata || "{}"),
      distance: 0,
    };
  }

  /**
   * 删除文档（按文档ID前缀）
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db!.prepare(`DELETE FROM ${this.collectionName} WHERE id LIKE ?`);
    stmt.run(`${documentId}%`);
  }

  /**
   * 获取文档数量
   */
  async count(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db!.prepare(`SELECT COUNT(*) as count FROM ${this.collectionName}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * 获取所有文档
   */
  async getAll(limit: number = 100): Promise<QueryResult[]> {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db!.prepare(
      `SELECT id, content, metadata FROM ${this.collectionName} LIMIT ?`
    );
    const rows = stmt.all(limit) as Array<{
      id: string;
      content: string;
      metadata: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata || "{}"),
      distance: 0,
    }));
  }

  /**
   * 分页获取文档
   */
  async getAllPaginated(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ documents: QueryResult[]; total: number; hasMore: boolean }> {
    if (!this.db) {
      await this.init();
    }

    const countStmt = this.db!.prepare(`SELECT COUNT(*) as count FROM ${this.collectionName}`);
    const countResult = countStmt.get() as { count: number };
    const total = countResult.count;

    const stmt = this.db!.prepare(
      `SELECT id, content, metadata FROM ${this.collectionName} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const rows = stmt.all(limit, offset) as Array<{
      id: string;
      content: string;
      metadata: string;
    }>;

    const documents = rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata || "{}"),
      distance: 0,
    }));

    return {
      documents,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * 删除文档
   */
  async delete(ids: string[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const placeholders = ids.map(() => "?").join(",");
    const stmt = this.db!.prepare(
      `DELETE FROM ${this.collectionName} WHERE id IN (${placeholders})`
    );
    stmt.run(...ids);
  }

  /**
   * 清空集合
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    this.db!.exec(`DELETE FROM ${this.collectionName}`);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 全局数据库实例
let vectorDBInstance: SQLiteVectorDB | null = null;

/**
 * 获取向量数据库实例
 */
export async function getSQLiteVectorDB(): Promise<SQLiteVectorDB> {
  if (!vectorDBInstance) {
    vectorDBInstance = new SQLiteVectorDB();
    await vectorDBInstance.init();
  }
  return vectorDBInstance;
}

/**
 * 初始化向量数据库
 */
export async function initVectorDB(): Promise<void> {
  await getSQLiteVectorDB();
}

/**
 * 向量数据库集合名称
 */
export const VECTOR_COLLECTION_NAME = "javascript_knowledge";

/**
 * 获取或创建向量集合
 */
export async function getOrCreateCollection(): Promise<SQLiteVectorDB> {
  return getSQLiteVectorDB();
}

import { VectorStore } from "@langchain/core/vectorstores";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
import { getSQLiteVectorDB, SQLiteVectorDB } from "./vector-store.service";

/**
 * SQLite 向量存储的 LangChain 适配器
 */
export class SQLiteLangChainVectorStore extends VectorStore {
  _vectorstoreType(): string {
    return "sqlite";
  }

  private sqliteDB: SQLiteVectorDB;

  constructor(embeddings: Embeddings, sqliteDB: SQLiteVectorDB) {
    super(embeddings, {});
    this.sqliteDB = sqliteDB;
  }

  /**
   * 添加文档到向量存储
   */
  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    const vectorDocs = documents.map((doc, i) => ({
      id: (doc.metadata.id as string) || crypto.randomUUID(),
      content: doc.pageContent,
      embedding: vectors[i],
      metadata: doc.metadata,
    }));

    await this.sqliteDB.add(vectorDocs);
  }

  /**
   * 添加原始文本到向量存储
   */
  async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map((doc) => doc.pageContent);
    const vectors = await this.embeddings.embedDocuments(texts);
    return this.addVectors(vectors, documents);
  }

  /**
   * 搜索最相似的文档
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    _filter?: this["FilterType"]
  ): Promise<[Document, number][]> {
    const results = await this.sqliteDB.query({
      queryEmbedding: query,
      nResults: k,
    });

    return results.map((res) => [
      new Document({
        pageContent: res.content,
        metadata: res.metadata,
      }),
      1 - res.distance, // 返回相似度分数
    ]);
  }

  /**
   * 静态工厂方法：从现有实例创建
   */
  static async fromExisting(embeddings: Embeddings): Promise<SQLiteLangChainVectorStore> {
    const sqliteDB = await getSQLiteVectorDB();
    return new SQLiteLangChainVectorStore(embeddings, sqliteDB);
  }
}

/**
 * 直接索引文档到向量数据库
 */

import path from "path";
import { indexDocuments } from "../lib/rag";
import { initVectorDB, getSQLiteVectorDB } from "../lib/vector-db";

async function main() {
  try {
    const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
    console.log(`🚀 开始索引文档...`);
    console.log(`📂 知识库路径: ${KNOWLEDGE_DIR}`);

    // 初始化向量数据库
    await initVectorDB();

    // 索引文档
    const startTime = Date.now();
    const indexedCount = await indexDocuments(KNOWLEDGE_DIR);
    const endTime = Date.now();

    const db = await getSQLiteVectorDB();
    const totalCount = await db.count();

    console.log("\n" + "=".repeat(30));
    console.log(`✅ 索引任务完成！`);
    console.log(`⏱️ 耗时: ${((endTime - startTime) / 1000).toFixed(1)} 秒`);
    console.log(`📝 本次新增索引块: ${indexedCount}`);
    console.log(`📊 数据库总记录数: ${totalCount}`);
    console.log("=".repeat(30));
  } catch (error) {
    console.error("❌ 索引文档失败:", error);
  }
}

main();

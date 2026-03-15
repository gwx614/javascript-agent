/**
 * 优化版文档索引脚本
 * 支持增量索引、进度显示、去重等功能
 */

import path from "path";
import fs from "fs/promises";
import { initVectorDB, getSQLiteVectorDB } from "../lib/rag";

interface IndexStats {
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  indexedChunks: number;
  startTime: number;
}

async function main() {
  const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
  const stats: IndexStats = {
    totalFiles: 0,
    processedFiles: 0,
    skippedFiles: 0,
    errorFiles: 0,
    indexedChunks: 0,
    startTime: Date.now(),
  };

  try {
    console.log("🚀 开始索引文档...");

    // 扫描所有 Markdown 文件
    const files = await scanMarkdownFiles(KNOWLEDGE_DIR);
    stats.totalFiles = files.length;

    // 初始化向量数据库
    await initVectorDB();
    const db = await getSQLiteVectorDB();
    const existingCount = await db.count();

    console.log(`找到 ${files.length} 个文档，当前数据库 ${existingCount} 条记录`);

    // 索引文档
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = await indexSingleFile(file);

        if (result.skipped) {
          stats.skippedFiles++;
        } else {
          stats.processedFiles++;
          stats.indexedChunks += result.chunkCount;
        }

        // 每 50 个文件显示一次进度
        if ((i + 1) % 50 === 0 || i === files.length - 1) {
          const progress = Math.round(((i + 1) / files.length) * 100);
          console.log(`⏳ 进度: ${progress}% (${i + 1}/${files.length})`);
        }
      } catch (error) {
        stats.errorFiles++;
        console.error(`❌ ${path.basename(file)}:`, (error as Error).message);
      }
    }

    // 最终统计
    const endTime = Date.now();
    const finalCount = await db.count();
    const newRecords = finalCount - existingCount;

    console.log("\n✅ 索引完成");
    console.log(
      `⏱️  耗时: ${((endTime - stats.startTime) / 1000).toFixed(1)}秒 | 新增: ${stats.processedFiles} | 跳过: ${stats.skippedFiles} | 错误: ${stats.errorFiles} | 总记录: ${finalCount}`
    );
  } catch (error) {
    console.error("\n❌ 索引失败:", error);
    process.exit(1);
  }
}

/**
 * 扫描目录下的所有 Markdown 文件
 */
async function scanMarkdownFiles(directory: string): Promise<string[]> {
  const files: string[] = [];

  async function scanDir(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  await scanDir(directory);
  return files;
}

/**
 * 索引单个文件
 */
async function indexSingleFile(filePath: string): Promise<{
  skipped: boolean;
  chunkCount: number;
}> {
  const db = await getSQLiteVectorDB();
  const relativePath = path.relative("knowledge", filePath).replace(/\\/g, "/");
  const fileId = relativePath;

  // 检查文件是否已存在且未修改
  const stats = await fs.stat(filePath);
  const existingDoc = await db.getDocument(fileId);

  if (existingDoc) {
    // 比较修改时间
    const existingTime = new Date(existingDoc.metadata?.updatedAt || 0).getTime();
    const currentTime = stats.mtime.getTime();

    if (currentTime <= existingTime) {
      return { skipped: true, chunkCount: 0 };
    }

    // 文件已修改，删除旧记录
    await db.deleteDocument(fileId);
  }

  // 读取并解析文件
  const content = await fs.readFile(filePath, "utf-8");
  const cleanedContent = content.replace(/^---[\s\S]*?---\n/, "");

  // 提取元数据
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let title = path.basename(filePath, ".md");
  let slug = "";

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    const slugMatch = frontmatter.match(/slug:\s*(.+)/);

    if (titleMatch) title = titleMatch[1].replace(/['"]/g, "");
    if (slugMatch) slug = slugMatch[1].replace(/['"]/g, "");
  }

  // 提取分类
  const pathParts = relativePath.split("/");
  const category = pathParts.length > 1 ? pathParts[1] : "general";

  // 分块处理
  const chunks = chunkDocument(cleanedContent, 1000);

  // 生成嵌入并索引
  const { generateEmbedding } = await import("../lib/rag");
  const vectorDocs = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `${fileId}_chunk_${i}`;
    const chunkEmbedding = await generateEmbedding(chunks[i]);

    vectorDocs.push({
      id: chunkId,
      content: chunks[i],
      embedding: chunkEmbedding,
      metadata: {
        documentId: fileId,
        title,
        slug,
        category,
        chunkIndex: i,
        chunkLength: chunks[i].length,
        path: relativePath,
        updatedAt: stats.mtime.toISOString(),
      },
    });
  }

  // 批量添加
  if (vectorDocs.length > 0) {
    await db.add(vectorDocs);
  }

  return { skipped: false, chunkCount: chunks.length };
}

/**
 * 分块处理文档
 */
function chunkDocument(content: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const MAX_CHUNK_SIZE = 8000;

  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

  let currentChunk = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX_CHUNK_SIZE) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      const sentences = paragraph.split(/[。！？.!?]/).filter((s) => s.trim().length > 0);
      let tempChunk = "";

      for (const sentence of sentences) {
        const sentenceWithPunctuation = sentence + "。";

        if (tempChunk.length + sentenceWithPunctuation.length <= MAX_CHUNK_SIZE) {
          tempChunk += sentenceWithPunctuation;
        } else {
          if (tempChunk.length > 0) {
            chunks.push(tempChunk.trim());
          }
          tempChunk = sentenceWithPunctuation;
        }
      }

      if (tempChunk.length > 0) {
        chunks.push(tempChunk.trim());
      }
    } else if (currentChunk.length + paragraph.length + 2 <= chunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > MAX_CHUNK_SIZE) {
      for (let i = 0; i < chunk.length; i += MAX_CHUNK_SIZE) {
        finalChunks.push(chunk.slice(i, i + MAX_CHUNK_SIZE));
      }
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

main();

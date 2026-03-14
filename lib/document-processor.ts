import fs from "fs/promises";
import path from "path";

/**
 * 文档元数据接口
 */
export interface DocumentMetadata {
  id: string;
  title: string;
  path: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

/**
 * 处理后的文档接口
 */
export interface ProcessedDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
}

/**
 * 读取目录下的所有markdown文件
 */
export async function readMarkdownFiles(directory: string): Promise<string[]> {
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
 * 解析markdown文件内容
 */
export async function parseMarkdownFile(filePath: string): Promise<ProcessedDocument> {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    // 提取标题（从frontmatter或内容中）
    let title = path.basename(filePath, ".md");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const titleMatch = frontmatter.match(/title:\s*(.+)/);
      if (titleMatch) {
        title = titleMatch[1].replace(/['"]/g, "");
      }
    }

    // 提取分类（从路径中）
    const relativePath = path.relative("knowledge", filePath);
    const pathParts = relativePath.split(path.sep);
    const category = pathParts.length > 1 ? pathParts[1] : "general";

    // 清理内容（移除frontmatter）
    const cleanedContent = content.replace(/^---[\s\S]*?---\n/, "");

    // 获取文件信息
    const stats = await fs.stat(filePath);

    const metadata: DocumentMetadata = {
      id: filePath.replace(/\\/g, "/"), // 使用相对路径作为ID
      title,
      path: relativePath.replace(/\\/g, "/"),
      category,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      wordCount: cleanedContent.length,
    };

    return {
      id: metadata.id,
      content: cleanedContent,
      metadata,
    };
  } catch (error) {
    console.error(`解析文件失败 ${filePath}:`, error);
    throw error;
  }
}

/**
 * 分块处理文档
 * 将长文档分割成多个小块，便于嵌入和检索
 */
export function chunkDocument(content: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const MAX_CHUNK_SIZE = 8000; // 嵌入API限制为8192，留一些余量

  // 先按段落分割
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

  let currentChunk = "";
  for (const paragraph of paragraphs) {
    // 如果单个段落就超过限制，需要进一步分割
    if (paragraph.length > MAX_CHUNK_SIZE) {
      // 先保存当前块
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // 按句子分割超长段落
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

  // 最终检查：确保没有块超过限制
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > MAX_CHUNK_SIZE) {
      // 强制分割
      for (let i = 0; i < chunk.length; i += MAX_CHUNK_SIZE) {
        finalChunks.push(chunk.slice(i, i + MAX_CHUNK_SIZE));
      }
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

/**
 * 批量处理文档
 */
export async function processDocuments(directory: string): Promise<ProcessedDocument[]> {
  const files = await readMarkdownFiles(directory);
  const documents: ProcessedDocument[] = [];

  for (const file of files) {
    try {
      const document = await parseMarkdownFile(file);
      documents.push(document);
    } catch (error) {
      console.error(`处理文件失败 ${file}:`, error);
    }
  }

  return documents;
}

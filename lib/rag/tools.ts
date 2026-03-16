import { DynamicTool } from "@langchain/core/tools";
import { Embeddings } from "@langchain/core/embeddings";
import { generateEmbedding } from "../services/rag/embedding.service";
import { SQLiteLangChainVectorStore } from "../services/rag/langchain-adapter.service";

/**
 * 适配项目的 DashScope Embedding 实现
 */
class DashScopeEmbeddings extends Embeddings {
  async embedDocuments(documents: string[]): Promise<number[][]> {
    return Promise.all(documents.map((doc) => generateEmbedding(doc)));
  }
  async embedQuery(document: string): Promise<number[]> {
    return generateEmbedding(document);
  }
}

/**
 * 创建 JavaScript 知识搜索工具
 */
export async function createJavascriptSearchTool() {
  const embeddings = new DashScopeEmbeddings({});
  const vectorStore = await SQLiteLangChainVectorStore.fromExisting(embeddings);

  return new DynamicTool({
    name: "search_javascript_knowledge",
    description:
      "当用户询问关于 JavaScript 的语法、底层原理、API 用法、最佳实践或需要代码示例时，调用此工具。它会从专业的 JavaScript 知识库中检索相关内容，提供准确的技术支持。输入应该是清晰的、用自然语言描述的技术问题。",
    func: async (input: string | Record<string, any>) => {
      try {
        // 兼容一些模型发送 JSON 字符串作为输入的情况
        let query = typeof input === "string" ? input : JSON.stringify(input);

        console.log(`[Tool] Received tool input: ${query}`);

        // 循环解包，处理可能存在的多次 JSON 嵌套
        let depth = 0;
        while (
          depth < 5 &&
          (query.includes('"input":') || (query.startsWith("{") && query.endsWith("}")))
        ) {
          try {
            const parsed = JSON.parse(query);
            const nextQuery =
              parsed.input || parsed.query || (typeof parsed === "string" ? parsed : null);
            if (!nextQuery || nextQuery === query) break;
            query = nextQuery;
            depth++;
          } catch (e) {
            break;
          }
        }

        console.log(`[Tool] Final search query: ${query}`);
        const results = await vectorStore.similaritySearch(query, 3);
        console.log(`[Tool] Search returned ${results.length} documents`);

        if (results.length === 0) {
          const msg = "在知识库中未找到相关内容。";
          console.log(`[Tool] Returning: ${msg}`);
          return msg;
        }

        const output = results
          .map((doc: any, i: number) => {
            // 对每个文档内容进行截断，防止上下文过长导致 LLM 无法处理
            const content =
              doc.pageContent.length > 5000
                ? doc.pageContent.substring(0, 5000) + "...(内容过长已截断)"
                : doc.pageContent;
            return `[参考来源 ${i + 1}: ${doc.metadata.title || "未知"}]\n${content}`;
          })
          .join("\n\n");

        console.log(`[Tool] Returning ${output.length} characters of content`);
        return output;
      } catch (error) {
        console.error("[Tool] Error in search tool:", error);
        return `搜索出错: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

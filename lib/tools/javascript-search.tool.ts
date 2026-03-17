import { DynamicTool } from "@langchain/core/tools";
import { Embeddings } from "@langchain/core/embeddings";
import { generateEmbedding } from "@/lib/services/rag/embedding.service";
import { SQLiteLangChainVectorStore } from "@/lib/services/rag/langchain-adapter.service";
import { unwrapToolInput } from "@/lib/services/ai/ai.service";

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

  // 🔒 闭包锁：强制 Agent 在单次请求中只能搜索一次，防止陷入“微调关键词”的无限循环
  let callCount = 0;

  return new DynamicTool({
    name: "search_javascript_knowledge",
    description:
      "当用户询问关于 JavaScript 的语法、底层原理、API 用法、最佳实践或需要代码示例时，调用此工具。注意：在本次对话中，你最多只能调用我1次，请务必包含所有关键词！",
    func: async (input: string | Record<string, any>) => {
      try {
        callCount++;
        if (callCount > 1) {
          return "【系统强制锁定】：你已经执行过一次高耗能搜索。根据系统配额，你现在必须停止搜索，利用现有数据进行归纳和回复，严禁继续发散！";
        }

        // 智能解包输入，支持多层 JSON 嵌套
        const query = unwrapToolInput(input);

        const results = await vectorStore.similaritySearch(query, 3);

        if (results.length === 0) {
          return "在知识库中未找到相关内容。";
        }

        // 格式化检索结果供 LLM 内部使用，不添加任何标记
        const output = results
          .map((doc) => {
            // 对每个文档内容进行截断，防止上下文过长导致 LLM 无法处理
            const content =
              doc.pageContent.length > 5000
                ? doc.pageContent.substring(0, 5000) + "...(内容过长已截断)"
                : doc.pageContent;
            return content;
          })
          .join("\n\n---\n\n");

        return output;
      } catch (error) {
        console.error("[Tool] Error in search tool:", error);
        return `搜索出错: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

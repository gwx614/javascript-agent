import { DynamicTool } from "@langchain/core/tools";
import { unwrapToolInput } from "@/lib/core/utils";

/**
 * 创建联网搜索工具
 * 使用 Tavily Search API 进行实时网络搜索
 * Tavily 是专为 AI Agent 设计的搜索 API,速度快、质量高
 */
export async function createWebSearchTool() {
  return new DynamicTool({
    name: "web_search",
    description:
      "当用户询问你不知道的内容、或是关于2024年及以后的最新技术动态、实时信息、技术文档或网络具体内容时，调用此工具。它会从互联网搜索相关信息。输入应该是清晰的搜索查询，例如 '最新 JavaScript 规范' 或 'React 19 新特性'。",
    func: async (input: string | Record<string, any>) => {
      try {
        // 智能解包输入，支持多层 JSON 嵌套
        const query = unwrapToolInput(input);

        // 调用 Tavily Search API
        const results = await tavilySearch(query);

        if (results.length === 0) {
          return "未能找到相关搜索结果。";
        }

        // 格式化搜索结果供 LLM 内部使用，不添加来源标记
        const output = results
          .map((result) => {
            return `${result.title}\n${result.snippet}`;
          })
          .join("\n\n---\n\n");

        return output;
      } catch (error) {
        console.error("[WebSearch] 搜索出错:", error);
        return `搜索出错: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

/**
 * Tavily Search API 实现
 * 文档: https://docs.tavily.com
 */
async function tavilySearch(
  query: string
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const apiKey = process.env.TAVILY_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY 未配置，请在系统环境变量中添加 TAVILY_API_KEY，或在 .env.local 中配置"
    );
  }

  const url = "https://api.tavily.com/search";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: "basic",
      include_images: false,
      include_image_descriptions: false,
      include_answer: false,
      include_raw_content: false,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Tavily API error: ${response.status} - ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();

  return (
    data.results?.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
    })) || []
  );
}

import { createOpenAI } from "@ai-sdk/openai";

/**
 * 自定义 fetch 函数
 * 处理阿里云 DashScope API 的兼容性问题
 */
const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

  if (init && init.body && typeof init.body === "string") {
    try {
      const body = JSON.parse(init.body);

      if ("stream_options" in body) {
        delete body.stream_options;
      }

      if ("input" in body && Array.isArray(body.input)) {
        body.messages = body.input;
        delete body.input;
      }

      delete body.max_output_tokens;

      if (body.messages && Array.isArray(body.messages)) {
        body.messages = body.messages.map((msg: any) => {
          if (msg.content && Array.isArray(msg.content)) {
            const textParts = msg.content
              .filter((part: any) => part.type === "text" || part.type === "input_text")
              .map((part: any) => part.text)
              .join("");
            return {
              ...msg,
              content: textParts || " ",
            };
          }
          return msg;
        });
      }

      init.body = JSON.stringify(body);
    } catch (e) {
      // ignore
    }
  }

  return fetch(targetUrl, init);
};

/**
 * OpenAI 客户端实例
 */
export const openai = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
  fetch: customFetch,
});

/**
 * 默认使用的 AI 模型
 * qwen-turbo: 免费额度更多
 * qwen-plus: 付费但效果更好
 * qwen-max: 最强模型（付费）
 */
export const DEFAULT_MODEL = "qwen-turbo";

/**
 * AI API 基础 URL
 */
export const AI_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

/**
 * 获取 AI API Key
 */
export function getAIApiKey() {
  return process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || "";
}

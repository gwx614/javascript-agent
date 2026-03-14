import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenAI 客户端实例
 *
 * 统一配置 AI 模型参数，支持自定义 Base URL（可接入代理或第三方服务）。
 * 后续可扩展为多模型支持（Claude、Gemini 等） */
const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // 强制将 URL 指向正确的接口，防止 SDK 拼接出 /responses 或缺少 /chat/completions 的情况
  const targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

  // 拦截请求体，去除不支持的字段，并转换为正确的格式
  if (init && init.body && typeof init.body === "string") {
    try {
      const body = JSON.parse(init.body);

      // 删除不支持的字段
      if ("stream_options" in body) {
        delete body.stream_options;
      }

      // 如果有 input 字段，转换为 messages 字段
      if ("input" in body && Array.isArray(body.input)) {
        body.messages = body.input;
        delete body.input;
      }

      // 删除不支持的字段
      delete body.max_output_tokens;

      // 修复消息格式：将数组格式的 content 转换为字符串
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

export const openai = createOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
  fetch: customFetch,
});

/**
 * JavaScript 学习助手的系统提示词（System Prompt）
 *
 * 核心角色设定：专注于 JavaScript 学习的 AI 导师。
 * 具有以下能力：
 * - 解析 JavaScript 概念（从初学者到高级）
 * - 提供代码示例和最佳实践
 * - 引导用户发现错误和理解原理
 * - 根据学习进度调整讲解深度
 */
export const JS_LEARNING_SYSTEM_PROMPT = `你是一位专业的 JavaScript 学习导师，名叫"JS 小智"。

## 你的职责
- 帮助用户学习和理解 JavaScript 的各种概念，从基础语法到高级特性
- 提供清晰、易懂的代码示例，每个示例都有详细的中文注释
- 当用户遇到错误时，引导他们分析原因，而不是直接给出答案
- 根据用户的理解程度动态调整讲解的复杂度
- 推荐学习路径和优质学习资源

## 回答风格
- 使用友好、鼓励性的语言
- **先用通俗的语言解释概念，再给出代码示例**
- 代码示例要精简，每个示例不超过 10 行，占据文章比例不应该过多
- 对复杂概念进行类比，帮助理解
- 代码块使用 Markdown 格式（\`\`\`javascript ... \`\`\`）
- 避免过多表格和 emoji，保持回答简洁

## 专业领域
- JavaScript 基础：变量、函数、对象、数组、循环
- ES6+ 特性：箭头函数、解构、Promise、async/await、模块化
- 异步编程：回调、Promise、async/await、事件循环
- 原型链与面向对象编程
- DOM 操作与事件处理
- 性能优化与最佳实践
- 常见设计模式

当用户问你非 JavaScript 相关的问题时，礼貌地引导他们回到 JavaScript 学习主题。`;

/**
 * 默认使用的 AI 模型
 * 使用阿里云千问大模型 qwen-flash
 */
export const DEFAULT_MODEL = "qwen-flash";

/** AI API 基础 URL */
export const AI_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

/** 获取 AI API Key */
export function getAIApiKey() {
  return process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || "";
}

/**
 * 通用 AI 调用函数（非流式）
 *
 * 统一处理 API Key、请求头、错误处理和内容提取。
 * 所有非流式的 AI API route 都应使用此函数。
 */
export async function callAI(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  label?: string;
  timeout?: number; // 超时时间（毫秒）
}): Promise<string> {
  const {
    messages,
    temperature = 0.6,
    maxTokens = 2000,
    jsonMode = false,
    label = "AI",
    timeout = 55000, // 默认 55 秒超时
  } = options;

  const apiKey = getAIApiKey();

  const requestBody: any = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${label} API Error]:`, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`AI 请求超时（${timeout}ms），请稍后重试`);
    }
    throw error;
  }
}
/**
 * 通用 AI 流式调用函数
 *
 * 返回一个 ReadableStream，发出统一的 SSE 格式消息：
 * data: {"type": "text-start", "id": "..."}
 * data: {"type": "text-delta", "id": "...", "delta": "..."}
 * data: {"type": "text-end", "id": "..."}
 */
export async function streamAI(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  label?: string;
}): Promise<ReadableStream> {
  const { messages, temperature = 0.6, maxTokens = 3000, label = "AI Stream" } = options;

  const apiKey = getAIApiKey();
  const requestBody = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${label} Error]:`, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const messageId = crypto.randomUUID();

  return new ReadableStream({
    async start(controller) {
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        let buffer = "";
        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const content = data.choices?.[0]?.delta?.content;

                if (content) {
                  if (isFirstChunk) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "text-start", id: messageId })}\n\n`
                      )
                    );
                    isFirstChunk = false;
                  }
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "text-delta",
                        id: messageId,
                        delta: content,
                      })}\n\n`
                    )
                  );
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        if (!isFirstChunk) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text-end", id: messageId })}\n\n`)
          );
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

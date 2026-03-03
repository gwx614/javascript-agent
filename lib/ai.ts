import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenAI 客户端实例
 *
 * 统一配置 AI 模型参数，支持自定义 Base URL（可接入代理或第三方服务）。
 * 后续可扩展为多模型支持（Claude、Gemini 等） */
const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // 强制将 URL 指向正确的接口，防止 SDK 拼接出 /responses 或缺少 /chat/completions 的情况
  const targetUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  
  // 拦截请求体，去除 Zhipu 不支持的 stream_options，并转换为正确的格式
  if (init && init.body && typeof init.body === "string") {
    try {
      const body = JSON.parse(init.body);
      
      // 删除 stream_options
      if ("stream_options" in body) {
        delete body.stream_options;
      }
      
      // 如果有 input 字段，转换为 messages 字段（智谱AI使用 messages 格式）
      if ("input" in body && Array.isArray(body.input)) {
        body.messages = body.input;
        delete body.input;
      }
      
      // 删除智谱AI不支持的字段
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
              content: textParts || " "
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

  // 记录确切的 payload 和 headers
  console.error("\n\n[customFetch] Requesting URL:", targetUrl);
  console.error("[customFetch] Body:", init?.body);
  
  return fetch(targetUrl, init);
};

export const openai = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: "https://open.bigmodel.cn/api/paas/v4/",
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
- 优先用代码示例说明概念
- 对复杂概念进行类比，帮助理解
- 代码块使用 Markdown 格式（\`\`\`javascript ... \`\`\`）

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
 * 已切换为智谱的大模型 glm-4-flash
 */
export const DEFAULT_MODEL = "glm-4.5";

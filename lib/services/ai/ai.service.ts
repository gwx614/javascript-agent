import { ChatOpenAI } from "@langchain/openai";
import { createJavascriptSearchTool, createWebSearchTool, createDatabaseToolkit } from "@/lib/rag";
import { createAgent } from "langchain";
import { SystemMessage } from "@langchain/core/messages";
import { getAIApiKey, DEFAULT_MODEL } from "@/lib/core/config";
import { type AgentOptions } from "@/types";

/**
 * 核心工具函数：智能解包工具输入
 *
 * 背景：部分 LLM 或 LangGraph 框架在调用工具时，会自动将参数包装在 {"input": "..."} 等结构中。
 */
export function unwrapToolInput(input: any): any {
  if (input === null || input === undefined) return "";
  let current = input;
  if (typeof current === "object" && !Array.isArray(current)) {
    current =
      current.input ||
      current.query ||
      current.search ||
      current.description ||
      JSON.stringify(current);
  }
  let depth = 0;
  while (
    depth < 5 &&
    typeof current === "string" &&
    (current.startsWith("{") || current.startsWith("["))
  ) {
    try {
      const parsed = JSON.parse(current);
      if (parsed && typeof parsed === "object") {
        const next = parsed.input || parsed.query || parsed.search || parsed.description;
        if (next !== undefined && next !== current) {
          current = next;
        } else {
          current = parsed;
          break;
        }
      } else {
        current = parsed;
      }
      depth++;
    } catch {
      break;
    }
  }
  return current;
}

/**
 * 获取一个配置好的通用的 React Agent
 */
export async function getGeneralAgent(options: AgentOptions) {
  const {
    userIdentifier,
    systemPrompt,
    tools: customTools,
    temperature = 0.7,
    streaming = true,
  } = options;

  const model = new ChatOpenAI({
    modelName: DEFAULT_MODEL,
    apiKey: getAIApiKey(),
    configuration: {
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
    },
    temperature,
    streaming,
  });

  // 如果 tools 为 undefined，则使用默认工具集；如果是空数组 []，则表示不使用任何工具
  let tools: any[] = [];
  if (customTools === undefined) {
    tools = [
      await createJavascriptSearchTool(),
      await createWebSearchTool(),
      ...(await createDatabaseToolkit(userIdentifier)),
    ];
  } else {
    tools = customTools;
  }

  const systemMessage = new SystemMessage(systemPrompt);

  return createAgent({
    model: model,
    tools,
    systemPrompt: systemMessage,
  });
}

/**
 * 通用非流式 Agent 调用接口 (同步增加日志)
 */
export async function invokeGeneralAgent(options: AgentOptions & { input: string }) {
  const agent = await getGeneralAgent(options);
  const result = await agent.invoke({
    messages: [{ role: "user", content: options.input }],
  });

  // 记录非流式调用中的工具使用情况
  result.messages.forEach((msg: any) => {
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      msg.tool_calls.forEach((tc: any) => {
        console.log(`\x1b[36m[Agent Tool Call]\x1b[0m 正在调用: ${tc.name}`);
        console.log(`\x1b[90m[Input]\x1b[0m ${unwrapToolInput(tc.args)}`);
      });
    } else if (msg.constructor.name === "ToolMessage" || msg._getType?.() === "tool") {
      const content = msg.content.toString();
      const preview = content.length > 200 ? content.substring(0, 200) + "..." : content;
      console.log(`\x1b[32m[Tool Result]\x1b[0m 获取到数据 (约 ${content.length} 字符):`);
      console.log(`\x1b[90m${preview}\x1b[0m`);
    }
  });

  // 提取最后一条 AIMessage 的内容（过滤掉 ToolMessage）
  const aiMessages = result.messages.filter(
    (msg: any) => msg.constructor.name === "AIMessage" || msg._getType?.() === "ai"
  );
  const lastMessage = aiMessages[aiMessages.length - 1];
  return lastMessage?.content?.toString() || "";
}

/**
 * 通用流式 Agent 调用接口 (带增强日志监控)
 */
export async function streamAgentInvocation(options: AgentOptions & { input: string }) {
  const { userIdentifier, systemPrompt, temperature = 0.7, input } = options;

  const agent = await getGeneralAgent({
    userIdentifier,
    systemPrompt,
    temperature,
  });

  const logStream = await agent.stream(
    {
      messages: [{ role: "user", content: input }],
    },
    { streamMode: "messages" }
  );

  return (async function* () {
    for await (const chunk of logStream) {
      // 在 LangGraph 2.x 中，chunk 可能包含不同的消息类型
      const message = Array.isArray(chunk) ? chunk[0] : chunk;
      const msg = message as any;

      // 1. 监控工具发起调用 (AIMessage with tool_calls)
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        msg.tool_calls.forEach((tc: any) => {
          console.log(`\x1b[36m[Agent Tool Call]\x1b[0m 正在调用: ${tc.name}`);
          console.log(`\x1b[90m[Input]\x1b[0m ${unwrapToolInput(tc.args)}`);
        });
      }

      // 2. 监控工具返回结果 (ToolMessage) - 只记录日志，不返回给前端
      if (msg.constructor.name === "ToolMessage" || msg._getType?.() === "tool") {
        const content = msg.content.toString();
        const preview = content.length > 200 ? content.substring(0, 200) + "..." : content;
        console.log(`\x1b[32m[Tool Result]\x1b[0m 获取到数据 (约 ${content.length} 字符):`);
        console.log(`\x1b[90m${preview}\x1b[0m`);
        // 不 yield ToolMessage，防止原始内容泄露
        continue;
      }

      // 3. 只返回 AI 生成的消息
      if (msg.constructor.name === "AIMessageChunk" || msg._getType?.() === "ai") {
        yield chunk;
      }
    }
  })();
}

/**
 * 统一安全事件流处理器（Tool Calling Fence）
 *
 * 解决 ReAct 范式下 Agent 在调用工具前将 SQL 以普通文本输出的泄露问题。
 * 封装了以下逻辑，供 chat/route.ts、learning/content/route.ts 等路由复用：
 *  - on_tool_start：开启围栏，屏蔽泄露文本，通知调用方关闭当前消息段
 *  - on_tool_end：撤销围栏，更新 messageId，通知调用方开启新消息段
 *  - on_chat_model_stream：围栏期间屏蔽，正常期间通过回调转发给客户端
 *
 * @param eventStream - LangGraph app.streamEvents() 返回的事件流
 * @param initialMessageId - 初始消息 UUID（由调用方 crypto.randomUUID() 生成）
 * @param onEvent - 事件回调，由调用方控制如何将事件编码并推入 ReadableStream
 */
export async function processSafeEventStream(
  eventStream: AsyncIterable<any>,
  initialMessageId: string,
  onEvent: (type: "text-start" | "text-delta" | "text-end", id: string, delta?: string) => void
): Promise<void> {
  // 使用计数器替代 boolean，正确处理并行多工具调用（如同时调用 search + query_database）
  let activeToolCount = 0;
  let messageId = initialMessageId;

  for await (const event of eventStream) {
    const eventType = event.event;

    if (eventType === "on_chat_model_stream") {
      // 🔒 只要有任何工具在执行中，就屏蔽所有文本输出
      if (activeToolCount > 0) continue;

      const chunk = event.data.chunk;
      // 跳过 tool_call_chunks（工具参数 chunk）
      if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) continue;

      const content = chunk.content;
      if (content) {
        onEvent("text-delta", messageId, content);
      }
    } else if (eventType === "on_tool_start") {
      // 第一个工具开始时：关闭当前消息流
      if (activeToolCount === 0) {
        onEvent("text-end", messageId);
      }
      activeToolCount++;

      const name = event.name;
      const inputRaw = event.data.input;
      const inputStr = typeof inputRaw === "string" ? inputRaw : JSON.stringify(inputRaw);
      console.log(`\x1b[36m[Agent Tool Call]\x1b[0m 正在调用: ${name}`);
      console.log(`\x1b[90m[Input]\x1b[0m ${inputStr}`);
    } else if (eventType === "on_tool_end") {
      activeToolCount = Math.max(0, activeToolCount - 1);

      const output = event.data.output;
      const content = typeof output === "string" ? output : output?.content || "";
      console.log(
        `\x1b[32m[Tool Result]\x1b[0m ${event.name} 执行完毕，获取到约 ${content.length} 字符数据。`
      );

      // 所有工具都完成后，才重启文本流
      if (activeToolCount === 0) {
        messageId = crypto.randomUUID();
        onEvent("text-start", messageId);
      }
    }
  }
}

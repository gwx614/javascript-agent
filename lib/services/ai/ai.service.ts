import { ChatOpenAI } from "@langchain/openai";
import {
  createJavascriptSearchTool,
  createWebSearchTool,
  createDatabaseQueryTool,
} from "@/lib/rag";
import { createAgent } from "langchain";
import { SystemMessage } from "@langchain/core/messages";
import { getAIApiKey, DEFAULT_MODEL } from "@/lib/core/config";
import { unwrapToolInput } from "@/lib/core/utils";

/**
 * 通用 Agent 配置选项
 */
export interface AgentOptions {
  userIdentifier: string;
  systemPrompt: string;
  tools?: any[]; // 如果传入空数组 [], 则不使用任何工具
  temperature?: number;
  streaming?: boolean;
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
      await createDatabaseQueryTool(userIdentifier),
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

  // 提取最后一条 AIMessage 的内容
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content.toString();
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

      // 2. 监控工具返回结果 (ToolMessage)
      if (msg.constructor.name === "ToolMessage" || msg._getType?.() === "tool") {
        const content = msg.content.toString();
        const preview = content.length > 200 ? content.substring(0, 200) + "..." : content;
        console.log(`\x1b[32m[Tool Result]\x1b[0m 获取到数据 (约 ${content.length} 字符):`);
        console.log(`\x1b[90m${preview}\x1b[0m`);
      }

      yield chunk;
    }
  })();
}

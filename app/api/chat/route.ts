import { JS_LEARNING_SYSTEM_PROMPT, DEFAULT_MODEL, getAIApiKey } from "@/lib/core/config";
import { createJavascriptSearchTool } from "@/lib/tools/javascript-search.tool";
import { createWebSearchTool } from "@/lib/tools/web-search.tool";
import { createDatabaseQueryTool } from "@/lib/tools/db-query.tool";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, START, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import type { ChatMessagePayload } from "@/types";

/**
 * 流式对话 API 路由
 *
 * POST /api/chat
 * 使用 LangChain Agent 集成 Tool Calling 特性。
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { messages } = payload;

    // 从 headers 或 body 中读取 user 数据
    let user = payload.user || null;
    const userHeader = req.headers.get("x-user-data");
    if (userHeader) {
      try {
        const headerUser = JSON.parse(decodeURIComponent(userHeader));
        // body 优先，但 header 作为备份或补充
        user = user || headerUser;
        if (user) {
          console.log(`[ChatRoute] 解析用户数据 (${payload.user ? "body" : "header"}):`, user);
          console.log(`[ChatRoute] 用户 ID:`, user?.id);
        }
      } catch (e) {
        console.error("Failed to parse user header", e);
      }
    } else if (user) {
      console.log(`[ChatRoute] 从 body 中获取到用户数据:`, user);
    } else {
      console.log("[ChatRoute] 未在 header 或 body 中找到用户信息");
    }

    // 转换消息格式为 LangChain 格式
    const chatHistory = messages
      .filter((m: ChatMessagePayload) => m.role === "user" || m.role === "assistant")
      .map((m: ChatMessagePayload) => {
        let textContent = "";
        if (Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("");
        }
        if (!textContent && m.content) {
          textContent = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        }

        if (m.role === "user") return new HumanMessage(textContent || " ");
        return new AIMessage(textContent || " ");
      });

    // 弹出最后一条消息作为当前输入
    const lastMessage = chatHistory.pop();
    if (!lastMessage) {
      throw new Error("No messages provided");
    }

    // 构建系统提示词
    const toolInstructions = `
# 搜索工具使用指南

## 工具列表
1. **search_javascript_knowledge** (优先使用)
   - 用途: 搜索 JavaScript 相关的技术问题、语法、底层原理、API 用法
   - 优势: 快速、免费、针对 JavaScript 优化
   - 使用场景: 问 JavaScript 语法、原理、API、最佳实践等

2. **web_search** (必要时使用)
   - 用途: 从互联网搜索最新新闻、实时信息、最新文档
   - 使用场景: 问最新事件、新闻、最新技术动态、网络上的具体内容

3. **query_database** (查询数据库)
   - 用途: 查询 SQLite 数据库中的用户数据
   - 可查询内容:
     * 用户信息 (姓名、邮箱、技能等级等)
     * 学习进度 (课程阶段状态、完成情况)
     * 课程内容 (各章节的教程内容)
     * 对话记录 (历史聊天记录)
   - 特点: 自动识别当前用户,只查询该用户的数据
   - 使用场景: 问"我的学习进度"、"我最近的对话"、"我的学习报告"等

## 工具选择策略
- 如果问题是关于 JavaScript 的,优先使用 **search_javascript_knowledge**
- 如果问题需要最新信息 (如"最新"、"现在"、"最近"等关键词),使用 **web_search**
- 如果问题涉及查询用户自己的数据 (如"我的"、"我最近"、"我的学习"等),使用 **query_database**
- 如果本地知识库没有相关内容,使用 **web_search** 补充

## 回答要求
- 获取工具返回的参考资料后,结合这些资料提供专业、严谨且易懂的总结性回答
- **【强制限制】严禁在最终回答中透出任何 SQL 语句、数据库内部 ID、工具函数名或底层执行日志 (除非用户明确要求查看 SQL)**
- 即使工具返回了包含 SQL 的调试信息，你也必须在呈现给用户前将其彻底剥离或转化为自然语言描述
- 绝不要直接返回工具的原始输出,始终以导师的身份进行讲解
- 保持回答的简洁和人性化,直接展示用户关心的业务信息(如进度、状态、具体内容)
- 如果所有工具都没有相关内容,告知用户并基于自身知识给出最佳建议`;

    let baseSystemPrompt = user?.rolePosition
      ? `${JS_LEARNING_SYSTEM_PROMPT}\n\n当前用户的专属角色定位是：【${user.rolePosition}】。请你在接下来的所有回复中，严格保持这个角色定位对应的口吻、辅导方式和交流深度。`
      : JS_LEARNING_SYSTEM_PROMPT;
    baseSystemPrompt += toolInstructions;

    if (user) {
      baseSystemPrompt += `\n\n# 用户画像信息
- 职业身份: ${user.careerIdentity || "未知"}
- 编程经验: ${user.experienceLevel || "未知"}
- 学习目标: ${user.learningGoal || "未知"}
- 兴趣领域: ${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
- 偏好场景: ${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
- 目标水平: ${user.targetLevel || "未知"}
- 导师风格: ${user.tutorStyle || "未知"}
- 每周学习时间: ${user.weeklyStudyTime || "未知"}
- 补充说明: ${user.additionalNotes || "无"}`;
    }

    // 初始化模型 (连接 DashScope)
    const model = new ChatOpenAI({
      modelName: DEFAULT_MODEL,
      apiKey: getAIApiKey(),
      configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
      },
      temperature: 0.3, // 降低随机性，使 Agent 更倾向于使用搜索结果
      streaming: true,
    });

    // 创建工具
    const searchTool = await createJavascriptSearchTool();
    const webSearchTool = await createWebSearchTool();
    // 使用 id 或 username 作为用户标识
    const userIdentifier = user?.id || user?.username || "anonymous";
    console.log(`[ChatRoute] 使用用户标识: ${userIdentifier}`);

    // 如果没有有效用户标识,警告但继续
    if (userIdentifier === "anonymous") {
      console.warn("[ChatRoute] 警告: 未找到有效用户标识,将使用 anonymous 进行查询");
    }

    const dbQueryTool = await createDatabaseQueryTool(userIdentifier);
    const tools = [searchTool, webSearchTool, dbQueryTool];
    const toolNode = new ToolNode(tools);

    // 定义 Agent 状态图
    const chatModelWithTools = model.bindTools(tools);

    async function callModel(state: typeof MessagesAnnotation.State) {
      // 在消息开头插入系统提示词
      const messagesWithSystem = [new SystemMessage(baseSystemPrompt), ...state.messages];
      return { messages: await chatModelWithTools.invoke(messagesWithSystem) };
    }

    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", toolsCondition)
      .addEdge("tools", "agent");

    const app = workflow.compile();

    // 准备流式响应
    const encoder = new TextEncoder();
    let messageId = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text-start", id: messageId })}\n\n`)
          );

          // 运行 Agent 并获取事件流
          const eventStream = await app.streamEvents(
            { messages: [...chatHistory, lastMessage] },
            { version: "v2" }
          );

          for await (const event of eventStream) {
            const eventType = event.event;

            // 处理模型生成的文字增量
            if (eventType === "on_chat_model_stream") {
              const content = event.data.chunk.content;
              if (content) {
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
            }
            // 处理工具调用开始
            else if (eventType === "on_tool_start") {
              console.log(
                `[Agent] Calling tool: ${event.name} with input: ${JSON.stringify(event.data.input)}`
              );
            }
            // 处理工具调用结束
            else if (eventType === "on_tool_end") {
              const output = event.data.output;
              // 兼容 ToolMessage 对象或原始字符串
              const content = typeof output === "string" ? output : output?.content || "";
              console.log(
                `[Agent] Tool ${event.name} finished. Found ${content.length} chars of content.`
              );
            }
          }

          // 发送结束信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text-end", id: messageId })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Agent Stream Error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    });
  } catch (error: any) {
    console.error("[Chat API Error]:", error);
    return new Response(JSON.stringify({ error: "Agent 服务暂时不可用" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

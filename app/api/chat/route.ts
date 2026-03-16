import { JS_LEARNING_SYSTEM_PROMPT } from "@/lib/core/config";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getPrisma } from "@/lib/core/db";
import type { ChatMessagePayload } from "@/types";
import { unwrapToolInput } from "@/lib/core/utils";

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
      } catch (e) {
        console.error("Failed to parse user header", e);
      }
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
    // 1. 定义聊天场景专属人设 (Persona)
    const chatPersona = `你是一位专业的 JavaScript 金牌导师。
针对不同的学习者，你擅长：
- **由浅入深**：将复杂的概念拆解为易读的小块知识。
- **循循善诱**：多提问引导用户思考，而非直接给出所有答案。
- **情感支持**：在用户遇到挫折时给予鼓励，庆祝他们的每一个小进步。

你的语气应该是：${user?.tutorStyle || "专业、耐心、富有亲和力"}。`;

    // 2. 引入通用的工具指南 (从 config.ts 获取)
    let baseSystemPrompt = `${chatPersona}\n\n${JS_LEARNING_SYSTEM_PROMPT}`;

    // 3. 注入用户专属的角色定位
    if (user?.rolePosition) {
      baseSystemPrompt += `\n\n## 当前教学策略调整
你当前的教学对象是一位：【${user.rolePosition}】。请严格根据此定位调整你的口吻、辅导方式和交流深度。`;
    }

    // 2. 注入用户画像详细信息 (如果存在)
    if (user) {
      baseSystemPrompt += `\n\n## 用户画像信息
- 职业身份: ${user.careerIdentity || "未知"}
- 编程经验: ${user.experienceLevel || "未知"}
- 学习目标: ${user.learningGoal || "未知"}
- 兴趣领域: ${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
- 偏好场景: ${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
- 目标水平: ${user.targetLevel || "未知"}
- 每周学习时间: ${user.weeklyStudyTime || "未知"}
- 补充说明: ${user.additionalNotes || "无"}`;
    }

    // 开发环境下尝试获取一个真实用户作为 fallback，避免 anonymous 导致的工具查询为空
    let userIdentifier = user?.id || user?.username;
    if (!userIdentifier) {
      const fallbackUser = await getPrisma().user.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      if (fallbackUser) {
        userIdentifier = fallbackUser.id;
      } else {
        userIdentifier = "anonymous";
      }
    }

    // 如果没有有效用户标识,警告但继续
    if (userIdentifier === "anonymous") {
      console.warn("[ChatRoute] 警告: 未找到有效用户标识,将使用 anonymous 进行查询");
    }

    // 初始化通用 Agent
    const { getGeneralAgent } = await import("@/lib/services/ai/ai.service");

    const app = await getGeneralAgent({
      userIdentifier,
      systemPrompt: baseSystemPrompt,
      temperature: 0.3, // 降低随机性，使 Agent 更倾向于使用搜索结果
      streaming: true,
    });

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

            // 处理模型生成的文字增量 (LangGraph event)
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
            } else if (eventType === "on_tool_start") {
              const input = event.data.input;
              const name = event.name;
              const unwrapInput = unwrapToolInput(input);
              console.log(`\x1b[36m[Agent Tool Call]\x1b[0m 正在调用: ${name}`);
              console.log(
                `\x1b[90m[Input]\x1b[0m ${
                  typeof unwrapInput === "string" ? unwrapInput : JSON.stringify(unwrapInput)
                }`
              );
            } else if (eventType === "on_tool_end") {
              const output = event.data.output;
              const content = typeof output === "string" ? output : output?.content || "";
              console.log(
                `\x1b[32m[Tool Result]\x1b[0m ${event.name} 执行完毕，获取到约 ${content.length} 字符数据。`
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

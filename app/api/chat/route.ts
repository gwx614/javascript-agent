import { JS_LEARNING_SYSTEM_PROMPT } from "@/lib/core/config";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getPrisma } from "@/lib/core/db";
import type { ChatMessagePayload } from "@/types";
import { apiError } from "@/lib/utils";
import { processSafeEventStream } from "@/lib/services/ai/ai.service";

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
      } catch {
        // 解析失败时忽略
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

    // =========================================================
    // 结构化构建系统提示词 (Prompt Engineering)
    // =========================================================

    // 1. 核心身份与人设 (Identity)
    const chatPersona = `## 你的身份
你是一位专业的 JavaScript 金牌导师，目前的教学风格是：【${user?.tutorStyle || "专业、耐心、富有亲和力"}】。
你的目标是引导用户掌握 JavaScript 核心技能，通过启发式教学而非直接灌输。

## 教学互动标准
- **由浅入深**：将复杂的概念拆解为易读的小块知识。
- **循循善诱**：多提问引导用户思考，而非直接给出答案。
- **情感支持**：鼓励为主，庆祝用户的每一个小进步。`;

    // 2. 核心约束与安全 (Constraints)
    const safetyDirectives = `## 🔒 行为准则 (CRITICAL)
- **【隐藏内部细节】**: 严禁提及任何技术实现细节（如数据库、SQL 语句、查询过程、内部表名或字段名）。
- **【禁止内部 ID】**: 严禁在回复中输出任何用户 ID、记录 ID 等内部标识符。
- **【自然语言交互】**: 所有的工具返回结果必须转述为自然、亲切的导师口吻，直接给出结论而非展示数据原文。`;

    // 3. 用户上下文 (Context)
    let userContext = `## 用户画像与当前状态
- **职业/身份**: ${user?.careerIdentity || "初级开发者"}
- **编程经验**: ${user?.experienceLevel || "初步接触"}
- **当前进度/角色**: ${user?.rolePosition || "JavaScript 学习者"}
- **核心目标**: ${user?.learningGoal || "掌握前端开发"}
- **兴趣偏好**: ${Array.isArray(user?.interestAreas) ? user?.interestAreas.join("、") : "通用技术"}
- **当前水平**: ${user?.targetLevel || "入门级"}
- **学习时间**: ${user?.weeklyStudyTime || "未设定"}
- **补充说明**: ${user?.additionalNotes || "无"}`;

    // 4. 输出规范与自查
    const outputValidation = `## 输出规范 (CRITICAL)
- **【自然语言转述】**: 获取数据后，必须以导师口吻直接给出结论，如"根据你的学习记录，你目前..."
- **【禁止中间过程】**: 严禁说"正在查询"、"让我查一下"等过渡语句。
- **【最终检查】**: 输出前必须自检，确保没有 SQL、没有技术术语、没有内部 ID。`;

    // 合并提示词
    const baseSystemPrompt = `
${chatPersona}

${safetyDirectives}

${userContext}

${outputValidation}

## 工具使用与响应指南
${JS_LEARNING_SYSTEM_PROMPT}
`.trim();

    // =========================================================
    // 环境与用户身份确认
    // =========================================================

    // 开发环境下尝试获取一个真实用户作为 fallback，确保工具可用
    let userIdentifier = user?.id || user?.username;
    if (!userIdentifier) {
      const fallbackUser = await getPrisma().user.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      userIdentifier = fallbackUser?.id || "anonymous";
    }

    // 初始化通用 Agent
    const { getGeneralAgent } = await import("@/lib/services/ai/ai.service");

    const app = await getGeneralAgent({
      userIdentifier,
      systemPrompt: baseSystemPrompt,
      temperature: 0.3,
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

          // 🔒 使用统一的安全事件流处理器处理工具调用围栏
          await processSafeEventStream(eventStream, messageId, (type, id, delta) => {
            const payload: Record<string, string> = { type, id };
            if (delta !== undefined) payload.delta = delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          });

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
    return apiError("Agent 服务暂时不可用", "AGENT_SERVICE_ERROR", 500, error.message);
  }
}

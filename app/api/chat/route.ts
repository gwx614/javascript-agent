import { getPrisma } from "@/lib/core/db";
import { type ChatMessagePayload } from "@/types";
import { JS_LEARNING_SYSTEM_PROMPT } from "@/lib/services/ai/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { apiError } from "@/lib/utils";
import { streamAgentInvocation } from "@/lib/services/ai/ai.service";

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
    const { messages, userId } = payload;

    if (!userId) {
      return apiError("缺少必要的 userId 参数", "BAD_REQUEST", 400);
    }

    // 从数据库精准获取用户数据
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return apiError("用户不存在", "NOT_FOUND", 404);
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
- **【自然语言交互】**: 所有的工具返回结果必须转述为自然、亲切的导师口吻，直接给出结论而非展示数据原文。
- **【用户数据查询规范 - 强制】**: 当需要查询当前用户的学习进度、课程状态等信息时：
  1. **必须使用 user_id 字段**，绝对禁止使用 username 字段
  2. **当前用户的 user_id 是：${userId}**
  3. **SQL 示例**: SELECT * FROM course_stages WHERE user_id = '${userId}'
  4. **错误示例**: SELECT * FROM users WHERE username = 'xxx' (这是错误的！)`;

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
- **【自然语言转述】**: 获取数据后，必须以导师口吻直接给出结论。
- **【禁止中间过程】**: 严禁说"正在查询"、"让我查一下"等过渡语句。
- **【最终检查】**: 输出前必须自检，确保没有 SQL、没有技术术语、没有内部 ID。`;

    // 合并提示词
    const baseSystemPrompt = `
${chatPersona}

${safetyDirectives}
## 工具使用与响应指南
- 当遇到你不确定的问题时，优先使用工具来解决问题，不要凭空猜测或者想象！！！
${JS_LEARNING_SYSTEM_PROMPT}

${userContext}

${outputValidation}
`.trim();

    // =========================================================
    // 环境与用户身份确认
    // =========================================================

    const userIdentifier = userId;

    // 准备流式响应
    const encoder = new TextEncoder();
    let fullContent = "";
    let messageId = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text-start", id: messageId })}\n\n`)
          );

          // 使用 streamAgentInvocation 获取流式响应
          const logStream = await streamAgentInvocation({
            userIdentifier,
            systemPrompt: baseSystemPrompt,
            input: JSON.stringify([...chatHistory, lastMessage]),
            temperature: 0.4,
          });

          // 处理流式输出
          for await (const chunk of logStream) {
            const message = Array.isArray(chunk) ? chunk[0] : chunk;
            const msg = message as any;

            // 只处理 AI 消息
            if (msg.constructor.name === "AIMessageChunk" || msg._getType?.() === "ai") {
              const content =
                typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

              if (content) {
                fullContent += content;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text-delta", id: messageId, delta: content })}\n\n`
                  )
                );
              }
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
    return apiError("Agent 服务暂时不可用", "AGENT_SERVICE_ERROR", 500, error.message);
  }
}

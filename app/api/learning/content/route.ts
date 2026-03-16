import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { STAGES, type StageNode, JS_LEARNING_SYSTEM_PROMPT } from "@/lib/core/config";
import type { KnowledgePointStatus } from "@/types";

const prisma = getPrisma();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      username,
      selectedCourseId,
      sectionTitle,
      sectionDescription,
      sectionStatus,
      diagnosisReport,
    } = data;

    if (!username || !sectionTitle || !selectedCourseId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 400 });
    }

    // 1. 获取阶段 ID
    let stage = await prisma.courseStage.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: selectedCourseId as string,
        },
      },
    });

    if (!stage) {
      return NextResponse.json({ error: "请先生成大纲" }, { status: 400 });
    }

    // 2. 验证状态是否允许生成教程内容
    if (stage.status !== "STUDYING") {
      return NextResponse.json(
        {
          error: "状态不允许生成教程内容",
          currentStatus: stage.status,
          validStatus: "STUDYING",
        },
        { status: 400 }
      );
    }

    // 3. 验证是否已生成大纲
    if (!stage.learningOutline) {
      return NextResponse.json({ error: "请先生成大纲" }, { status: 400 });
    }

    // 2. 检查此小节是否已生成过内容
    const { sectionId } = data; // 从前端获取具体的 ID (例如 section_1)

    if (!sectionId) {
      return NextResponse.json({ error: "缺少 sectionId" }, { status: 400 });
    }

    const existingContent = await prisma.sectionContent.findUnique({
      where: {
        stageId_sectionId: {
          stageId: stage.id,
          sectionId: sectionId,
        },
      },
    });

    if (existingContent) {
      // 如果已有，直接用简单的流或者是普通响应返回（前端统一处理流式响应）
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(existingContent.content));
          controller.close();
        },
      });
      return new Response(customStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const selectedStage = STAGES.find((s: StageNode) => s.id === selectedCourseId);
    const courseTitle = selectedStage?.title || "未知阶段";
    const skillLevel = user.skillLevel || "beginner";

    //根据状态调整教学深度，增强状态指令的“动作感”和“侧重点”
    let depthInstruction = "";
    if (sectionStatus === "skip") {
      depthInstruction =
        "【策略：极速通关与拔高】用户已掌握核心概念。请跳过基础语法，直接切入：1) 底层运行机制（如内存、Event Loop）；2) 极端的边界情况与 Bug 预防；3) 复杂业务场景下的架构级实践。**必须极其硬核，不要废话**。";
    } else if (sectionStatus === "reinforce") {
      depthInstruction =
        "【策略：排雷与实战巩固】用户有概念但不扎实。请缩减基础定义，**聚焦于“容易混淆的盲区”**：1) 深入对比相似概念；2) 针对诊断报告中的错误进行深度剖析（为什么错，怎么改）；3) 真实开发场景的高频应用。";
    } else {
      depthInstruction =
        "【策略：破冰与白话入门】用户是零基础或无数据。**绝对禁止一上来就抛专业术语**。请：1) 必须用一个极其通俗的生活化场景（类比）来开场；2) 循序渐进，从“这东西到底有什么用”讲起；3) 细抠最最基础的语法。";
    }

    // 从诊断报告中提取当前知识点的教学建议，匹配逻辑保持不变，但强化传给 AI 的上下文语气
    let diagnosisContext = "";
    if (diagnosisReport?.knowledgePoints) {
      const matchedKP = (diagnosisReport.knowledgePoints as KnowledgePointStatus[]).find(
        (kp: KnowledgePointStatus) =>
          sectionTitle.includes(kp.name) ||
          kp.name.includes(sectionTitle?.split("：")[0]?.split("—")[0]?.trim())
      );
      if (matchedKP?.teachingAdvice) {
        diagnosisContext = `
## 重点纠错（来自该用户的错题记录）
此用户存在以下认知误区: "${matchedKP.teachingAdvice}"
要求：在讲到相关点时，直接用一两句话或代码注释点醒用户。`;
      }
    }

    // 4. 重构：使用 LangChain Agent 生成内容
    const userContext = `
- 职业定位: ${user.roleReport || "前端开发"}
- 基础水平: ${skillLevel}
- 学习策略: ${sectionStatus || "learn"}
- 职业身份: ${user.careerIdentity || "未知"}
- 编程经验: ${user.experienceLevel || "未知"}
- 学习目标: ${user.learningGoal || "未知"}
- 兴趣领域: ${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
- 目标水平: ${user.targetLevel || "未知"}
- 补充说明: ${user.additionalNotes || "无"}
- 偏好场景: ${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
    `.trim();

    const systemPrompt = `
你是一个讲课极其生动、图文并茂的技术大牛。你擅长将复杂的底层原理用白话讲透。

${JS_LEARNING_SYSTEM_PROMPT}

### 内容创作指南
1. **降维打击**：用最通俗易懂的语言解释复杂概念，严禁堆砌术语。
2. **场景化**：结合实际业务场景或生活类比来讲解。
3. **学霸笔记**：输出结构清晰、带图解（ASCII/表格）的内容。
`.trim();

    const fullInput = `
请为【${sectionTitle}】生成详细的 Markdown 学习教程。

# 教学大纲要求
> ${sectionDescription}

# 用户上下文与硬约束
${userContext}

# 生成策略与侧重点
${depthInstruction}

${diagnosisContext}

# 风格与规范
1. 导师风格: ${user.tutorStyle || "专业、严谨且富有耐心"}
2. **“学霸笔记”风格**：像一份精心整理的复习笔记，语言通俗接地气。
3. **生动开场**：必须先用一个生活化的通俗比喻开场。
4. **图解辅助**：涉及到原理或状态流转，必须输出 Markdown 表格或 ASCII 图解。
5. **克制的微代码**：单个代码块禁止超过 15 行，仅展示核心逻辑。
6. **严禁 Emoji**：不允许使用任何 Emoji。

请开始你的创作，直接输出纯 Markdown。
`;

    const { streamAgentInvocation } = await import("@/lib/services/ai/ai.service");

    const logStream = await streamAgentInvocation({
      userIdentifier: user.id || user.username || "anonymous",
      systemPrompt,
      input: fullInput,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // logStream 现在是 LangGraph 的消息流
          for await (const chunk of logStream) {
            // 解析 LangGraph 的 messages 流
            // chunk 通常是 [AIMessageChunk, metadata] 或直接是消息对象
            const message = Array.isArray(chunk) ? chunk[0] : chunk;
            if (message && message.content) {
              const text =
                typeof message.content === "string"
                  ? message.content
                  : JSON.stringify(message.content);

              if (text) {
                fullContent += text;
                const sseData = `data: ${JSON.stringify({ type: "text-delta", delta: text })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // 保存结果到数据库
          if (fullContent) {
            await prisma.sectionContent.upsert({
              where: {
                stageId_sectionId: {
                  stageId: stage.id,
                  sectionId: sectionId,
                },
              },
              update: { content: fullContent },
              create: {
                stageId: stage.id,
                sectionId: sectionId,
                content: fullContent,
              },
            });
            console.log(`✅ 已保存生成的学习内容 (长度: ${fullContent.length})`);
          }
        } catch (e) {
          console.error("Stream generation error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Content endpoint error:", error);
    return new Response(JSON.stringify({ error: "生成教程内容失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

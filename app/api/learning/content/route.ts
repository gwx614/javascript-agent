import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { streamAI } from "@/lib/services/ai/chat.service";
import { STAGES, type StageNode } from "@/lib/core/config";
import { retrieveRelevantDocuments } from "@/lib/rag";
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

    // 4. 使用RAG检索相关知识库内容
    console.log(`\n🔍 为学习内容检索相关知识: "${sectionTitle}"`);

    // 适配新的两级大纲结构：支持检索一级菜单或子章节
    // 如果是子章节，sectionTitle 格式为 "一级菜单标题 > 子章节标题"
    const isSubSection = sectionTitle.includes(" > ");
    const searchQuery = isSubSection
      ? sectionTitle.split(" > ")[1] // 提取子章节标题作为搜索查询
      : sectionTitle;

    const relevantDocs = await retrieveRelevantDocuments(searchQuery, {
      topK: 3,
      maxContextLength: 6000,
    });

    // 构建知识库上下文
    let knowledgeContext = "";
    if (relevantDocs.length > 0) {
      const docsContent = relevantDocs
        .map(
          (doc: any, index: number) =>
            `## 参考资料 ${index + 1}: ${doc.metadata?.title || "技术文档"}\n${doc.content}`
        )
        .join("\n\n");

      knowledgeContext = `
# 知识库参考 (权威技术文档)
以下是从权威技术文档中检索到的相关内容，请结合这些内容生成教程：

${docsContent}

**重要提示**：在生成教程时，请优先参考以上权威技术文档的内容，确保技术准确性。可以结合文档中的示例和解释，但要转化为通俗易懂的教学语言。
`;
    }

    // 5. 三次迭代：通俗易懂的学霸笔记版 Prompt
    const systemPrompt = `你是一个讲课极其生动、图文并茂的技术大牛。你正在为用户编写【${courseTitle}】课程中【${sectionTitle}】的学习笔记。

# 教学大纲预设要求 (核心指令)
本小节务必围绕以下核心描述展开教学：
> ${sectionDescription}

# 用户上下文
- 职业定位: ${user.roleReport || "前端开发"}
- 基础水平: ${skillLevel}
- 学习策略: ${sectionStatus || "learn"}
- 职业身份: ${user.careerIdentity || "未知"}
- 编程经验: ${user.experienceLevel || "未知"}
- 学习目标: ${user.learningGoal || "未知"}
- 兴趣领域: ${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
- 目标水平: ${user.targetLevel || "未知"}
- 补充说明: ${user.additionalNotes || "无"}

${depthInstruction}
${diagnosisContext}
${knowledgeContext}

# 生成规范 (最高优先级)
1. 这是用户喜欢的导师风格: ${user.tutorStyle || "未知"}，请以该风格生成文章内容
2. **“学霸笔记”风格体裁**：文章必须像一份精心整理的、图文并茂的复习笔记。语言要通俗接地气，千万不要像机器翻译的官方文档。采用清晰的层级。
3. **生动开场与类比**：在解释任何抽象语法前，**必须先用一个极度生活化的通俗比喻**来铺垫。
4. **图解辅助思维**：不要用干巴巴的文字！凡是涉及到“原理”、“对比”、“状态转移”、“内存流转”的东西，**必须优先输出 Markdown 表格或 ASCII 排版图解**。
5. **【核心约束】克制的微代码**：
   - 最长的演示代码块**绝对禁止超过 15 行**！
   - 写代码只写“最硬核的增量逻辑”，去掉假数据和 \`console.log\` 刷屏。
   - 所有变量名必须带着浓厚的【职业定位】风味。
6. **画龙点睛的排版**：不允许使用任何Emoji（如 📌、💡、⚠️）。
7. 一定要结合用户的职业定位和学习目标，生成符合对方需求的学习内容。
8. 这是用户偏好的学习场景（设计需要场景的的内容时优先考虑）: ${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
9. 可以在笔记末尾为用户推荐相关的学习资源（如：书籍、视频、在线课程等），但不能超过 3 个，同时尽可能是中文或者官方社区的内容。

一句话核心诉求：用最说人话的类比、最一目了然的内容框架，以及贴合对方技术水平、职业方向的微代码，生成一篇阅读体验极佳、内容丰富完善的“高维降维学习笔记”。请直接输出纯 Markdown。`;

    const stream = await streamAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请为【${sectionTitle}】生成详细的 Markdown 学习教程。` },
      ],
      temperature: 0.5,
      maxTokens: 3000,
      label: "Content Stream",
    });
    console.log(systemPrompt);

    // 3. 为了持久化，我们需要拦截并保存流内容
    // 这里使用一个简单的 TransformStream 来捕获累积的内容
    let fullContent = "";
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        // 解析 SSE 格式数据，提取真正的文本内容进行持久化
        const lines = text.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "text-delta" && data.delta) {
                fullContent += data.delta;
              }
            } catch (e) {
              // 处理非 JSON 的情况，防止保存失败
              if (dataStr !== "[DONE]") {
                fullContent += dataStr;
              }
            }
          }
        }
        controller.enqueue(chunk);
      },
      async flush() {
        // 流结束后保存到数据库
        try {
          await prisma.sectionContent.upsert({
            where: {
              stageId_sectionId: {
                stageId: stage!.id,
                sectionId: sectionId,
              },
            },
            update: { content: fullContent },
            create: {
              stageId: stage!.id,
              sectionId: sectionId,
              content: fullContent,
            },
          });
        } catch (e) {
          console.error("Failed to save stream content to DB", e);
        }
      },
    });

    return new Response(stream.pipeThrough(transformStream), {
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

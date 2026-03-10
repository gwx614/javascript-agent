import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { streamAI } from "@/lib/ai";
import { STAGES } from "@/lib/courseConfig";

const prisma = new PrismaClient();

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
        }
      }
    });

    if (!stage) {
       return NextResponse.json({ error: "请先生成大纲" }, { status: 400 });
    }

    // 2. 验证状态是否允许生成教程内容
    if (stage.status !== "STUDYING") {
      return NextResponse.json({ 
        error: "状态不允许生成教程内容",
        currentStatus: stage.status,
        validStatus: "STUDYING"
      }, { status: 400 });
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
          sectionId: sectionId
        }
      }
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

    const selectedStage = STAGES.find((s) => s.id === selectedCourseId);
    const courseTitle = selectedStage?.title || "未知阶段";
    const skillLevel = user.skillLevel || "beginner";

    // 根据状态调整教学深度
    let depthInstruction = "";
    if (sectionStatus === "skip") {
      depthInstruction =
        "用户已经掌握此知识点，请提供精炼的复习内容和进阶技巧，重点放在易错点、面试考点和最佳实践。篇幅较短即可。";
    } else if (sectionStatus === "reinforce") {
      depthInstruction =
        "用户对此知识点有一定了解但不扎实，请着重讲解核心概念和易混淆的地方，多给实战代码示例。";
    } else {
      depthInstruction =
        "用户对此知识点不了解，请从零讲起，循序渐进，概念解释要详尽，代码示例要丰富且有详细注释。";
    }

    // 从诊断报告中提取当前知识点的教学建议
    let diagnosisContext = "";
    if (diagnosisReport?.knowledgePoints) {
      const matchedKP = (diagnosisReport.knowledgePoints as any[]).find(
        (kp: any) =>
          sectionTitle.includes(kp.name) ||
          kp.name.includes(sectionTitle?.split("：")[0]?.split("—")[0]?.trim())
      );
      if (matchedKP?.teachingAdvice) {
        diagnosisContext = `
## 诊断分析（来自课前摸底的精准指导，请务必参考）
- 用户在此知识点的掌握度: ${matchedKP.mastery}
- AI 教学建议: ${matchedKP.teachingAdvice}

请根据以上诊断分析，有针对性地调整教程内容的重点和讲解方式。`;
      }
    }

    const systemPrompt = `你是一位资深的 JavaScript 教学导师，正在为用户编写【${courseTitle}】课程中【${sectionTitle}】这一小节的详细学习教程。

用户信息:
- 角色定位: ${user.roleReport || "未知"}
- 技术水平: ${skillLevel}

小节信息:
- 标题: ${sectionTitle}
- 描述: ${sectionDescription || ""}
- 学习状态: ${sectionStatus || "learn"}

${depthInstruction}
${diagnosisContext}

请生成一篇高质量的 Markdown 格式教程文档，要求：

1. **结构清晰**：使用 ## 和 ### 层级标题组织内容
2. **代码丰富**：关键概念都配有 \`\`\`javascript 代码块示例，代码中包含详细中文注释
3. **循序渐进**：从概念到实践逐步深入
4. **实用建议**：在文末提供 💡 实用提示（常见错误、最佳实践等）
5. **推荐资源**：在文末推荐 2-3 个对该知识点最有帮助的学习资源链接
6. **篇幅控制**：保持内容充实但不冗长，约 1200-2000 字

直接输出 Markdown 文本即可，不要包裹在 JSON 或代码块中。`;

    const stream = await streamAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请为【${sectionTitle}】生成详细的 Markdown 学习教程。` },
      ],
      temperature: 0.6,
      maxTokens: 3000,
      label: "Content Stream",
    });

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
                sectionId: sectionId
              }
            },
            update: { content: fullContent },
            create: {
              stageId: stage!.id,
              sectionId: sectionId,
              content: fullContent
            }
          });
        } catch (e) {
          console.error("Failed to save stream content to DB", e);
        }
      }
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

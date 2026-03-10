import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { callAI } from "@/lib/ai";
import { STAGES } from "@/lib/courseConfig";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { username, selectedCourseId, diagnosisReport, sections } = data;

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. 尝试查找已有的阶段记录
    let stage = await prisma.courseStage.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: selectedCourseId as string,
        }
      }
    });

    // 2. 如果已有结课题目，直接返回
    if (stage?.postQuestions) {
      try {
        return NextResponse.json({ questions: JSON.parse(stage.postQuestions) });
      } catch (e) {
        console.error("Failed to parse stored postQuestions", e);
      }
    }

    const selectedStage = STAGES.find(s => s.id === selectedCourseId);
    const courseInfo = selectedStage 
      ? `课程：${selectedStage.title}\n目标：${selectedStage.learningObjective}\n核心知识点：${selectedStage.coreKnowledge.join("、")}` 
      : "课程详细信息缺失";

    const sectionsInfo = sections && sections.length > 0
      ? `实际学习过的大题：\n${sections.map((s: any) => `- ${s.title}: ${s.description}`).join("\n")}`
      : "实际学习的大纲信息缺失";

    const systemPrompt = `你是一位严谨的 JavaScript 课程评估专家。
你的任务是为刚完成【${selectedStage?.title || "当前阶段"}】学习的用户设计一份**课后结课测验**。

## 评估目标
1. **验证知识掌握**：确保用户真正理解了本阶段的核心概念。
2. **区分理解深度**：通过题目区分用户是"死记硬背"还是"领会贯通"。
3. **查漏补缺**：发现用户在学习过程中依然存在的薄弱点。

## 出题参考维度
- **用户角色**: ${user.rolePosition}
- **初始诊断报告摘要**: ${diagnosisReport?.summary || "无"}
- **课程设计**: ${courseInfo}
- **学习路径**: ${sectionsInfo}

## 出题原则
- **场景化**：尽量将题目置于真实的开发场景中（例如：在处理用户角色权限时如何应用闭包）。
- **递进性**：题目难度应从基础到进阶。
- **关联性**：题目应覆盖本阶段的核心知识点，并适当结合用户的职业背景。
- **"杀人诛心"**：设计 1-2 道涉及常见误区或 JavaScript 底层原理的深层次题目。

## 输出格式
严格输出 JSON 数组，每道题结构如下：
[
  {
    "id": "pq1",
    "type": "select",
    "questionText": "题目描述",
    "hasCode": true,
    "codeBlock": "代码片段",
    "options": ["选项A", "选项B", "选项C", "选项D"]
  }
]

共生成 6-8 道题。仅输出 JSON 数组，不要带任何 Markdown 标记。`;

    let content = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请为该结课阶段生成测验题目。" },
      ],
      temperature: 0.7,
      maxTokens: 2000,
      jsonMode: true,
      label: "PostCourseAssessment",
    });

    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(content);
      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

      // 3. 保存到数据库并更新状态
      const postQuestionsStr = JSON.stringify(questions);
      if (stage) {
        await prisma.courseStage.update({
          where: { id: stage.id },
          data: { 
            postQuestions: postQuestionsStr,
            status: "POST_ASSESSMENT"
          }
        });
      }

      return NextResponse.json({ questions });
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON", content);
      return NextResponse.json({ error: "AI 生成的测验格式错误" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Post-course assessment API error:", error);
    return NextResponse.json({ error: "生成结课测验失败" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { callAI } from "@/lib/ai";
import { STAGES } from "@/lib/courseConfig";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { username, selectedCourseId, questions, answers } = data;

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.rolePosition) {
      return NextResponse.json(
        { error: "用户角色定位未找到，请先完成入学引导。" },
        { status: 400 }
      );
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

    // 2. 如果已有报告，直接返回
    if (stage?.preReport) {
      try {
        return NextResponse.json({ report: JSON.parse(stage.preReport) });
      } catch (e) {
        console.error("Failed to parse stored preReport", e);
      }
    }

    // 获取选中课程的核心知识点
    const selectedStage = STAGES.find((s) => s.id === selectedCourseId);
    const coreKnowledge = selectedStage?.coreKnowledge || [];
    const courseTitle = selectedStage?.title || "未知阶段";

    // 将题目和用户答案组装为文本 (qaText logic remains same)
    const qaText = (questions || [])
      .map((q: any, i: number) => {
        const userAnswer = answers?.[q.id];
        const answerStr = Array.isArray(userAnswer)
          ? userAnswer.join("、")
          : userAnswer || "未作答";
        const questionTitle = q.questionText || q.question || "题目";
        const codePart = q.hasCode && q.codeBlock
          ? `\n   代码:\n   ${q.codeBlock.replace(/\n/g, "\n   ")}`
          : "";
        const optionsPart = (q.options || []).length > 0
          ? `\n   选项: ${q.options.map((o: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${o}`).join(" | ")}`
          : "";
        return `${i + 1}. ${questionTitle}${codePart}${optionsPart}\n   用户选择: ${answerStr}`;
      })
      .join("\n\n");

    const systemPrompt = `你是一位资深的 JavaScript 学习诊断专家。
你的任务是根据用户对【${courseTitle}】课程摸底题的回答情况，生成一份**课后学习诊断报告**。

## 诊断依据
- **用户角色**: ${user.roleReport || "未知"}
- **技术水平**: ${user.skillLevel || "beginner"}
- **学习目标**: ${ selectedStage ? `目前用户即将学习的内容是【${selectedStage.title}】。此阶段的目标是：“${selectedStage.learningObjective}”。\n此阶段的核心知识点包含：${selectedStage.coreKnowledge.join("、")}。` : `（当前未获取到明确的阶段课程）` }
- **摸底表现**: ${qaText}

## 诊断要求
1. **定量分析**: 为每个核心知识点 (${coreKnowledge.join("、")}) 给出 0-100 的掌握度评分。
2. **定性建议**: 针对每个知识点，给出一个具体的【教学动作建议】（例如：跳过、重点强化、从零讲解）。
3. **整体画像**: 针对用户的职业角色，给出一个简短的画像建议。

## 输出格式
严格遵守以下 JSON 结构输出：
{
  "overallLevel": "初级/中级/高级",
  "summary": "一份 100 字以内的综合诊断结论",
  "questionAnalysis": [
    {
      "questionIndex": 1,
      "isCorrect": true,
      "userAnswer": "A",
      "correctAnswer": "A",
      "explanation": "简短解析"
    }
  ],
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "mastery": "high/medium/low",
      "score": 85,
      "action": "skip/reinforce/learn",
      "teachingAdvice": "给后续 AI 教程生成的具体指导意见，十分关键！！！"
    }
  ],
  "learningPath": ["知识点A", "知识点B", "知识点C"],
  "roleAdvice": "针对该职业角色的学习侧重点建议"
}

1. **questionAnalysis** 必须包含摸底题中所有题目的对错分析。
2. **learningPath** 是一个字符串数组，包含 ${coreKnowledge.join("、")} 中的所有知识点，顺序应符合教学逻辑。
3. **overallLevel** 给出用户在该阶段的整体定级。

仅输出 JSON 字符串，不要带任何 Markdown 标记，不要包含任何其他解释性文字。`;

    let content = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请根据以上信息生成 JSON 诊断报告。" },
      ],
      temperature: 0.5,
      maxTokens: 2000,
      jsonMode: true,
      label: "Diagnose",
    });

    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      
      // 3. 将新生成的报告保存到数据库，并更新状态
      const preReportStr = JSON.stringify(parsed);
      if (stage) {
        await prisma.courseStage.update({
          where: { id: stage.id },
          data: { 
            preReport: preReportStr,
            status: "PRE_REPORT"
          }
        });
      }

      return NextResponse.json({ report: parsed });
    } catch (parseError) {
      console.error("Failed to parse diagnose response as JSON", content);
      return NextResponse.json(
        { error: "AI 生成的诊断报告格式错误" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Diagnose endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "生成诊断报告失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

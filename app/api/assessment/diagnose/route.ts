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

    // 获取选中课程的核心知识点
    const selectedStage = STAGES.find((s) => s.id === selectedCourseId);
    const coreKnowledge = selectedStage?.coreKnowledge || [];
    const courseTitle = selectedStage?.title || "未知阶段";
    const courseObjective = selectedStage?.learningObjective || "";

    // 将题目和用户答案组装为文本（包含选项，供 AI 判断正确答案）
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

## 你的任务
根据用户的答题情况，对该阶段的**每个核心知识点**进行**宏观能力诊断**。

## 核心分析方法论："由小见大"
你收到的是具体的摸底题目和用户的选择。你不应该简单地判断"这道题答对了/答错了"，而应该：
- **从一道题的选项推断用户在整个知识领域的理解深度**
  例如：用户在关于 \`===\` 和 \`==\` 的题目中选错了 → 不仅说明"不懂严格等于"，更说明用户**对 JavaScript 类型系统和隐式转换缺乏整体理解**
- **从多道题的综合表现推断用户的思维模式**
  例如：用户在流程控制和函数定义的题目中都倾向于选择最简单的写法 → 说明用户**可能停留在语法记忆层面，缺乏灵活运用的能力**
- **每个核心知识点的评估应覆盖其完整能力范围**，而不局限于某道具体题目的狭窄考点

## 用户信息
- 角色定位: ${user.rolePosition}
- 画像报告: ${user.roleReport || "无"}
- 当前技术水平: ${user.skillLevel || "beginner"}

## 课程信息
- 阶段名称: 【${courseTitle}】
- 学习目标: ${courseObjective}
- 核心知识点: ${coreKnowledge.join("、")}

## 用户的摸底答题情况
${qaText}

## 输出要求
严格遵守且仅输出以下 JSON 结构（不要输出任何其他文字）：

{
  "overallLevel": "对用户在【${courseTitle}】阶段的整体基础水平做一句话评级（如'有一定基础但不扎实'）",
  "summary": "综合所有题目的表现，总结用户的核心优势和主要薄弱方向（50字以内，不要逐题罗列）",
  "questionAnalysis": [
    {
      "questionIndex": 1,
      "isCorrect": true,
      "correctAnswer": "正确答案的完整文本（从选项中选取）",
      "explanation": "答对时：简要确认为什么对（30字以内）。答错时：解释用户为什么会选错，正确答案是什么以及为什么（50-80字）"
    }
  ],
  "knowledgePoints": [
    {
      "name": "核心知识点名称（必须来自: ${coreKnowledge.join("、")}）",
      "mastery": "high 或 medium 或 low",
      "action": "skip 或 reinforce 或 learn",
      "note": "给用户看的简短提示（20字以内），如'面试高频考点' 或 '建议实战巩固'",
      "teachingAdvice": "给后续 AI 教学系统用的详细教学建议（50-100字），包含：1）用户在该知识点上的具体薄弱表现；2）建议的教学切入角度和重点；3）需要特别强调或对比讲解的概念。例如：'用户混淆了 map 和 filter 的返回值，教程应从回调函数概念入手，用对比表格区分 map/filter/reduce 三者的输入输出，重点演示链式调用'"
    }
  ],
  "learningPath": ["推荐的学习顺序，按知识点名称排列，需要从头学的排最前，已掌握的排最后"],
  "roleAdvice": "根据用户角色和答题表现，给出的综合学习策略建议（100字以内，不要泛泛而谈，要具体可执行）"
}

## 关键约束
1. questionAnalysis **必须包含每一道题目的分析**，数量与题目数量一致，questionIndex 从 1 开始递增
2. knowledgePoints **必须覆盖该阶段全部核心知识点**（${coreKnowledge.join("、")}），即使某些知识点没有直接对应的题目，也要根据相关题目的表现进行合理推断
3. mastery 仅允许 "high"、"medium"、"low"
4. action 仅允许 "skip"（high 对应）、"reinforce"（medium 对应）、"learn"（low 对应）
5. note 字段是给用户看的简短标签，不超过20字
6. teachingAdvice 字段是给后续教程生成 AI 看的，要具体、有针对性、可操作，50-100字
7. learningPath 中 action 为 "learn" 的知识点排最前，"reinforce" 次之，"skip" 排最后`;

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

    // 清洗
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(content);
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

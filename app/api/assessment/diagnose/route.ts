import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { callAI } from "@/lib/services/ai/chat.service";
import { STAGES, type StageNode } from "@/lib/core/config";
import type { AssessmentQuestion } from "@/types";

const prisma = getPrisma();

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
        },
      },
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
    const selectedStage = STAGES.find((s: StageNode) => s.id === selectedCourseId);
    const courseTitle = selectedStage?.title || "未知阶段";

    // 将题目、标准答案、用户答案组装为供 AI 阅卷的文本
    const qaText = (questions || [])
      .map((q: AssessmentQuestion, i: number) => {
        const userAnswer = answers?.[q.id];
        const answerStr = Array.isArray(userAnswer)
          ? userAnswer.join("、")
          : userAnswer || "未作答";
        const correctStr = (q.correctAnswers || []).join("、");
        const codePart = q.hasCode && q.codeBlock ? `\n代码:\n${q.codeBlock}` : "";
        return `
    题目${i + 1}
    考察知识点: ${q.targetKnowledge}
    题型: ${q.conceptType}
    题目:
    ${q.questionText}
    ${codePart}
    用户答案: ${answerStr}
    正确答案: ${correctStr}
    `;
      })
      .join("\n\n");

    const systemPrompt = `你是一个资深的智能编程教学 Agent 核心诊断引擎。
你的任务是基于用户的【客观作答记录】与【标准答案】，进行精准的逻辑比对与学情诊断，并输出严谨的 JSON 报告。
=========================================
# 考生上下文
- 目标课程：【${courseTitle}】
- 本阶段核心知识点全集：${(selectedStage?.coreKnowledge || []).join("、")}
- 用户角色：${user.rolePosition || "未知"}
- 技术水平：${user.skillLevel || "beginner"}
- 职业身份：${user.careerIdentity || "未知"}
- 编程经验：${user.experienceLevel || "未知"}
- 学习目标：${user.learningGoal || "未知"}
- 兴趣领域：${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
- 偏好场景：${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
- 目标水平：${user.targetLevel || "未知"}
- 每周学习时间：${user.weeklyStudyTime || "未知"}
# 摸底作答记录 (包含阅卷依据)
${qaText}
=========================================
# 诊断核心逻辑规则（必须严格遵守）

1. **精准阅卷机制 (questionAnalysis)**：
- 严格对比记录中的“用户选择”与“标准答案”。完全一致才是 true。
- \`explanation\` 必须一针见血：若答错，指出用户掉入了哪个思维陷阱；若答对，一句话点出底层原理。

2. **知识点量化推导 (knowledgePoints)**：
- 你必须对【本阶段核心知识点全集】中的 **每一个** 知识点输出评估，不能多也不能少！
- **对于作答记录中明确考察的知识点**：
  - 若答对：\`score\` 给 85-100，\`mastery\` 给 "high"，\`action\` 为 "skip" 或 "reinforce"。
  - 若答错：\`score\` 给 0-59，\`mastery\` 给 "low"，\`action\` 强制为 "learn"。
- **对于未被题目直接考察的知识点**：
  - 结合用户的“技术水平”与“答题整体表现”进行推断，通常 \`score\` 给 60-80，\`mastery\` 给 "medium"，\`action\` 为 "reinforce"。
- \`teachingAdvice\`：直接写给后续教学 Agent 看的指令（例：“用户误以为闭包会复制变量，后续教程需重点展示内存引用图解”）。

3. **智能路径规划 (learningPath)**：
- 包含【本阶段核心知识点全集】的所有内容。
- **排序要求**：依据依赖关系和诊断结果重组。遵循“前置基础 -> 本次测试薄弱点 (learn) -> 未覆盖点 (reinforce) -> 已掌握点 (skip)”的逻辑顺序规划。

=========================================
# 输出格式约束
严格遵守以下 JSON 结构输出，必须可被 JSON.parse() 解析：
{
  "overallLevel": "0-100",
  "summary": "100字以内的综合诊断结论，语气专业客观且具有成长引导性。",
  "questionAnalysis": [
    {
      "questionIndex": 1,
      "isCorrect": true,
      "userAnswer": "A",
      "correctAnswer": "A",
      "explanation": "简要解析及误区点拨"
    }
  ],
  "knowledgePoints": [
    {
      "name": "必须是核心知识点全集中的某一个名称",
      "mastery": "high|medium|low",
      "score": 85,
      "action": "skip|reinforce|learn",
      "teachingAdvice": "给后续教程生成的具体指导意见"
    }
  ],
  "learningPath": ["排列后的知识点1", "排列后的知识点2", "排列后的知识点3"],
  "roleAdvice": "结合该用户角色在实际工作/面试中的诉求，给出针对该阶段内容的侧重点建议。"
}
# 最终拦截检查
1. 不允许输出任何 markdown 标记（如 \`\`\`json ）。
2. knowledgePoints 的数量必须与【本阶段核心知识点全集】的数量完全一致。
3. questionAnalysis 数组的长度必须与【题目数量】一致。
4. 绝对禁止输出任何解释文字或注释。
5. 绝对禁止输出任何 emoji 表情。
6. 只输出纯 JSON 字符串，能被 JSON.parse() 直接解析。
直接输出纯 JSON 字符串。`;

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
    console.log(systemPrompt);
    console.log("AI Response:", content);

    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(content);

      // 3. 将新生成的报告保存到数据库，并更新状态
      const preReportStr = JSON.stringify(parsed);
      if (stage) {
        await prisma.courseStage.update({
          where: { id: stage.id },
          data: {
            preReport: preReportStr,
            status: "PRE_REPORT",
          },
        });
      }

      return NextResponse.json({ report: parsed });
    } catch (parseError) {
      console.error("Failed to parse diagnose response as JSON", content);
      return NextResponse.json({ error: "AI 生成的诊断报告格式错误" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Diagnose endpoint error:", error);
    return new Response(JSON.stringify({ error: "生成诊断报告失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

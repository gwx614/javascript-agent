import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { callAI } from "@/lib/services/ai/chat.service";
import { STAGES } from "@/lib/core/config";
import type { AssessmentQuestion } from "@/types";

const prisma = getPrisma();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { username, selectedCourseId, diagnosisReport, questions, answers } = data;

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // 2. 如果已有结课报告，直接返回
    if (stage?.postReport) {
      try {
        return NextResponse.json({ report: JSON.parse(stage.postReport) });
      } catch (e) {
        console.error("Failed to parse stored postReport", e);
      }
    }

    const selectedStage = STAGES.find((s) => s.id === selectedCourseId);
    const coreKnowledge = selectedStage?.coreKnowledge || [];
    const courseTitle = selectedStage?.title || "未知阶段";

    // 组装答题情况文本
    const qaText = (questions || [])
      .map((q: AssessmentQuestion, i: number) => {
        const userAnswer = answers?.[q.id];
        const answerStr = Array.isArray(userAnswer)
          ? userAnswer.join("、")
          : userAnswer || "未作答";
        return `${i + 1}. ${q.questionText}\n   用户选择: ${answerStr}`;
      })
      .join("\n\n");

    const systemPrompt = `你是一位顶级的 JavaScript 教育评价与发展咨询专家。
用户刚刚完成了【${courseTitle}】阶段的学习。你的任务是根据他们的结课测验表现，生成一份极具深度和洞察力的**最终学习报告**。

## 报告核心目标
1. **能力定性**: 准确评估用户在该阶段结束时的实际能力水平。
2. **进步分析**: 对比初始诊断情况（${diagnosisReport?.summary || "无"}），指出明显的进步与依然存在的顽疾。
3. **决策支持**: 给出明确的后续路径建议（重学或进阶）。

## 评分维度
- **Score (0-100)**: 这是一个综合得分。不仅看对错，还要评估思维模式是否符合该职业角色的期望。
- **Levels**: 针对核心知识点 (${coreKnowledge.join("、")}) 分别给出评级。

## 用户画像参考
- 职业身份：${user.careerIdentity || "未知"}
- 编程经验：${user.experienceLevel || "未知"}
- 学习目标：${user.learningGoal || "未知"}
- 兴趣领域：${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
- 偏好场景：${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
- 目标水平：${user.targetLevel || "未知"}
- 补充说明：${user.additionalNotes || "无"}

## 后续建议逻辑 (Important!)
- **Score < 70**: 强烈建议**重新开始**本阶段学习，夯实基础。
- **70 <= Score < 85**: 建议进行针对性的**查漏补缺**，然后考虑下一阶段。
- **Score >= 85**: 评价为"卓越"，建议直接进入**下一阶段**学习。

## 输出要求
严格遵守且仅输出以下 JSON 结构：
{
  "totalScore": 88(根据用户实际表现评分),
  "levelLabel": "进阶阶段熟练(根据用户实际表现评级)",
  "summary": "一句高度凝练、带有鼓励性和专业洞察的评价。",
  "detailedAnalysis": "200字左右的综合分析，涵盖进步、薄弱项、思维模式评价。",
  "knowledgeMastery": [
    {
      "name": "知识点名称 (来自: ${coreKnowledge.join("、")})",
      "score": 90,
      "mastery": "high/medium/low",
      "insight": "针对该点的短评"
    }
  ],
  "recommendation": {
    "action": "restart" 或 "next",
    "reason": "为什么给出这个建议"
  }
}

仅输出 JSON，不要带标记。
绝对禁止输出任何 markdown 标记、解释文字、注释或 emoji 表情。
只输出纯 JSON 字符串，能被 JSON.parse() 直接解析。`;

    let content = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成最终学习报告 JSON。" },
      ],
      temperature: 0.5,
      maxTokens: 2000,
      jsonMode: true,
      label: "FinalReport",
    });

    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(content);

      // 3. 保存到数据库并更新状态
      const postReportStr = JSON.stringify(parsed);
      if (stage) {
        await prisma.courseStage.update({
          where: { id: stage.id },
          data: {
            postReport: postReportStr,
            status: "COMPLETED",
          },
        });
      }

      return NextResponse.json({ report: parsed });
    } catch (parseError) {
      console.error("Failed to parse report response as JSON", content);
      return NextResponse.json({ error: "AI 生成报告格式错误" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Final report API error:", error);
    return NextResponse.json({ error: "生成最终报告失败" }, { status: 500 });
  }
}

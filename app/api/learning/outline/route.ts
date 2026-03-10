import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { callAI } from "@/lib/ai";
import { STAGES } from "@/lib/courseConfig";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { username, selectedCourseId, diagnosisReport } = data;

    if (!username || !selectedCourseId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 400 });
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

    // 如果没有记录，创建一个新的阶段记录
    if (!stage) {
      stage = await prisma.courseStage.create({
        data: {
          userId: user.id,
          courseId: selectedCourseId as string,
          status: "PRE_ASSESSMENT"
        }
      });
    }

    // 2. 验证状态是否允许生成大纲
    // 允许的状态：PRE_ASSESSMENT(新阶段初始状态), PRE_REPORT(已完成摸底), STUDY_OUTLINE, STUDYING
    if (stage.status !== "PRE_ASSESSMENT" && stage.status !== "PRE_REPORT" && stage.status !== "STUDY_OUTLINE" && stage.status !== "STUDYING") {
      return NextResponse.json({ 
        error: "状态不允许生成大纲",
        currentStatus: stage.status,
        validStatuses: ["PRE_ASSESSMENT", "PRE_REPORT", "STUDY_OUTLINE", "STUDYING"]
      }, { status: 400 });
    }

    // 3. 强制重新生成大纲（移除已有的缓存判断，确保每次都能根据最新诊断生成）

    const selectedStage = STAGES.find((s) => s.id === selectedCourseId);
    const courseTitle = selectedStage?.title || "未知阶段";
    const courseObjective = selectedStage?.learningObjective || "";
    const coreKnowledge = selectedStage?.coreKnowledge || [];

    // 构建诊断参考信息（辅助标注重点和教学方向）
    let diagRef = "";
    if (diagnosisReport?.knowledgePoints) {
      diagRef = `
## 用户的课前诊断报告
以下诊断信息用于：1）确定每个知识点的学习深度(status)；2）指导 description 的教学方向
${(diagnosisReport.knowledgePoints || [])
  .map(
    (kp: any) =>
      `  · ${kp.name}: 掌握度=${kp.mastery}, 建议=${kp.action}\n    教学指导: ${kp.teachingAdvice || kp.note || "无"}`
  )
  .join("\n")}
角色建议: ${diagnosisReport.roleAdvice || "无"}`;
    }

    // 将 coreKnowledge 列表直接构造为必须生成的小节骨架
    const knowledgeList = coreKnowledge
      .map((k, i) => `  ${i + 1}. ${k}`)
      .join("\n");

    const systemPrompt = `你是一位专业的 JavaScript 课程设计师。
请你为用户设计一份【${courseTitle}】阶段的**系统性学习大纲**。

## 课程信息
- 阶段名称: ${courseTitle}
- 学习目标: ${courseObjective}
- 核心知识点（按教学顺序排列）:
${knowledgeList}

## 用户信息
- 角色定位: ${user.rolePosition || "学习者"}
- 画像报告: ${user.roleReport || "无"}
- 技术水平: ${user.skillLevel || "beginner"}
${diagRef}

## 大纲生成规则

1. **每个核心知识点必须对应一个独立小节**，这是课程的主干结构，不允许合并或遗漏
2. 小节的排列顺序必须与上方核心知识点列表的教学顺序一致
3. 每个小节的 title 应以该核心知识点为核心主题，可以适当扩展成更具体的教学标题
4. 每个小节的 description 用一句话描述这一小节会学什么（100字以内）
5. 每个小节的 status 根据诊断报告来确定学习深度：
   - "skip": 该知识点用户已掌握（诊断中 mastery=high），教程将以精炼复习为主
   - "reinforce": 该知识点用户有概念但不扎实（mastery=medium），教程将侧重实战巩固
   - "learn": 该知识点用户不了解（mastery=low）或无诊断信息，教程将从零讲起
6. 如果某个核心知识点在诊断报告中没有提及，默认 status 为 "learn"

严格仅输出以下 JSON 数组（不要输出任何其他文字）：
[
  {
    "id": "section_1",
    "title": "小节标题",
    "description": "一句话描述",
    "status": "learn 或 reinforce 或 skip"
  }
]`;

    let content = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成 JSON 学习大纲。" },
      ],
      temperature: 0.5,
      maxTokens: 1500,
      jsonMode: true,
      label: "Outline",
    });

    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      const finalArray = Array.isArray(parsed)
        ? parsed
        : Object.values(parsed).find(Array.isArray) || [];

      // 3. 将新生成的大纲保存到数据库，并更新状态
      const outlineStr = JSON.stringify(finalArray);
      if (stage) {
        await prisma.courseStage.update({
          where: { id: stage.id },
          data: { 
            learningOutline: outlineStr,
            status: "STUDYING"
          }
        });
      }

      return NextResponse.json({ sections: finalArray });
    } catch {
      console.error("Failed to parse outline JSON", content);
      return NextResponse.json(
        { error: "AI 生成的大纲格式错误" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Outline endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "生成学习大纲失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { STAGES, type StageNode } from "@/lib/core/config";
import type { KnowledgePointStatus } from "@/types";

const prisma = getPrisma();

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
        },
      },
    });

    // 如果没有记录，创建一个新的阶段记录
    if (!stage) {
      stage = await prisma.courseStage.create({
        data: {
          userId: user.id,
          courseId: selectedCourseId as string,
          status: "PRE_ASSESSMENT",
        },
      });
    }

    // 2. 验证状态是否允许生成大纲
    // 允许的状态：PRE_REPORT(已完成摸底), STUDY_OUTLINE, STUDYING
    // (修复：严禁在未做初步测评的 PRE_ASSESSMENT 状态抢跑生成错误的大纲)
    if (
      stage.status !== "PRE_REPORT" &&
      stage.status !== "STUDY_OUTLINE" &&
      stage.status !== "STUDYING"
    ) {
      return NextResponse.json(
        {
          error: "状态错误，无法生成大纲。请确认已完成该阶段课前诊断。",
          currentStatus: stage.status,
          validStatuses: ["PRE_REPORT", "STUDY_OUTLINE", "STUDYING"],
        },
        { status: 400 }
      );
    }

    // 3. 强制重新生成大纲（移除已有的缓存判断，确保每次都能根据最新诊断生成）

    const selectedStage = STAGES.find((s: StageNode) => s.id === selectedCourseId);
    const courseTitle = selectedStage?.title || "未知阶段";
    const coreKnowledge = selectedStage?.coreKnowledge || [];

    // 构建诊断参考信息（辅助标注重点和教学方向）
    let diagRef = "";
    if (diagnosisReport?.knowledgePoints) {
      const specificWeaknesses = diagnosisReport?.knowledgePoints
        ?.filter((kp: KnowledgePointStatus) => kp.mastery === "low" || kp.mastery === "medium")
        .map(
          (kp: KnowledgePointStatus) =>
            `  · ${kp.name}: 掌握度=${kp.mastery}, 建议=${kp.action}\n    教学指导: ${kp.teachingAdvice || "无"}`
        )
        .join("\n");

      diagRef = `
## 用户的课前诊断报告
以下诊断信息用于：1）确定每个知识点的学习深度(status)；2）指导 description 的教学方向
${specificWeaknesses}
角色建议: ${diagnosisReport.roleAdvice || "无"}`;
    }
    // 将 coreKnowledge 列表直接构造为必须生成的小节骨架
    const knowledgeList = coreKnowledge
      .map((k: string, i: number) => `  ${i + 1}. ${k}`)
      .join("\n");

    const systemPrompt = `
你是一位经验丰富的 JavaScript 课程架构师与技术导师。
你的任务是根据【课程信息 + 用户画像 + 课前诊断报告】为用户生成一份结构清晰、教学顺序合理的 **两级学习大纲（Two-Level Learning Outline）**。
该大纲将作为后续 AI 教程生成的结构蓝图，因此必须具有清晰的教学逻辑与精准的学习深度控制。
--------------------------------------------------
# 课程信息
阶段名称：
${courseTitle}
核心知识点（严格按教学顺序）：
${knowledgeList}
--------------------------------------------------
# 用户信息
角色定位：
${user.rolePosition || "学习者"}
用户画像：
${user.roleReport || "无"}
技术水平：
${user.skillLevel || "beginner"}
水平说明：
- beginner: 初学者；intermediate: 有一定经验；advanced: 有丰富项目经验
职业身份：
${user.careerIdentity || "未知"}
编程经验：
${user.experienceLevel || "未知"}
学习目标：
${user.learningGoal || "未知"}
兴趣领域：
${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
偏好场景：
${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
目标水平：
${user.targetLevel || "未知"}
每周学习时间：
${user.weeklyStudyTime || "未知"}
补充说明：
${user.additionalNotes || "无"}
--------------------------------------------------
# 诊断参考信息（辅助标注重点和教学方向）
${diagRef}
--------------------------------------------------
# 生成大纲的核心原则
1. 两级结构规则

- **一级菜单**：每个核心知识点 **必须生成一个独立的一级菜单，且名称不能有任何改变**
- **二级菜单**：每个一级菜单下 **必须生成至少一个子章节**
- **小节数量**：一级菜单数量必须与核心知识点数量一致
- **顺序规则**：一级菜单顺序必须 **严格保持与核心知识点列表一致**
- **子章节数量**：根据用户的技术水平、学习时间和掌握程度动态调整
  - beginner: 3-5个详细的子章节（从基础到进阶）
  - intermediate: 2-4个中等难度的子章节
  - advanced: 1-3个高级主题的子章节
--------------------------------------------------
2. 一级菜单规则
一级菜单的 title 必须：
- 以该核心知识点为核心，且名称不能有任何改变
示例：
知识点：闭包  
一级菜单标题：闭包
--------------------------------------------------
3. 二级子章节规则
二级子章节的 title 必须：
- 围绕一级菜单的核心知识点展开
- 根据用户的技术水平和学习目标定制
- 体现从基础到进阶的学习路径
- 结合用户的职业身份、兴趣领域，技术水平等设计（水平高的子章节内容深度就更高，水平低的就更基础）
示例：
一级菜单：变量与常量
二级子章节：
- 变量的声明与赋值
- 常量的使用场景
- 变量作用域基础
- 变量提升与暂时性死区
--------------------------------------------------
4. description 生成规则
description 用 **一小段话（≤100字）** 描述本章节会学习的内容。
description 应结合：
- 课程目标
- 用户技术水平
- 诊断报告中的 teachingAdvice
重点说明：
- 学什么
- 为什么学
- 如何应用
--------------------------------------------------
5. 学习深度（status）判定规则
status 只能是：
learn  
reinforce  
skip  
判定优先级如下：
① 如果诊断报告中存在该知识点：
action = skip → status = skip  
action = reinforce → status = reinforce  
action = learn → status = learn  
② 如果存在 score：
score ≥ 80 → skip  
50 ≤ score < 80 → reinforce  
score < 50 → learn  
③ 如果诊断报告中没有该知识点：
默认 status = learn
--------------------------------------------------
6. 教学重点调整
根据 status 调整 description 的教学方向：
skip
- 以快速复习为主
- 强调关键概念回顾
reinforce
- 重点通过代码示例巩固
- 解决常见误区
learn
- 从基础概念讲起
- 逐步建立理解
--------------------------------------------------
7. 用户角色适配
根据用户角色定位调整学习侧重点。
例如：
前端工程师
- 强调 DOM / 浏览器行为
Node开发
- 强调运行机制
面试准备
- 强调原理与陷阱
--------------------------------------------------
# 输出要求（非常重要）
必须只输出 JSON 数组，不允许任何解释文字。
JSON结构必须完全符合：
[
  {
    "id": "section_1",
    "title": "一级菜单标题",
    "description": "一级菜单描述",
    "status": "learn 或 reinforce 或 skip",
    "children": [
      {
        "id": "sub_section_1_1",
        "title": "二级子章节标题",
        "description": "二级子章节描述",
        "status": "learn 或 reinforce 或 skip"
      }
    ]
  }
]
--------------------------------------------------
# 输出前检查
在输出之前请确认：
1. 一级菜单数量 = 核心知识点数量
2. 一级菜单顺序与知识点顺序完全一致
3. 每个一级菜单至少有一个子章节
4. 子章节数量根据用户水平合理调整
5. status 只使用 learn / reinforce / skip
6. description ≤ 100 字
7. JSON 格式合法可解析
8. 绝对禁止输出任何 markdown 标记（如 \`\`\`json ）
9. 绝对禁止输出任何解释文字或注释
10. 绝对禁止输出任何 emoji 表情
11. 只输出纯 JSON 数组，能被 JSON.parse() 直接解析
只输出 JSON。`;

    const { invokeGeneralAgent } = await import("@/lib/services/ai/ai.service");

    let content = await invokeGeneralAgent({
      userIdentifier: user.id,
      systemPrompt,
      input: "请生成 JSON 学习大纲。",
      temperature: 0.5,
      tools: [], // 禁用工具调用以减少 token 开销
    });
    console.log(systemPrompt);
    console.log("AI Response:", content);

    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

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
            status: "STUDYING",
          },
        });
      }

      return NextResponse.json({ sections: finalArray });
    } catch {
      console.error("Failed to parse outline JSON", content);
      return NextResponse.json({ error: "AI 生成的大纲格式错误" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Outline endpoint error:", error);
    return new Response(JSON.stringify({ error: "生成学习大纲失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

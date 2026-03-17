import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/core/db";
import { STAGES } from "@/lib/core/config";
import { type StageNode, type AssessmentQuestion } from "@/types";

const prisma = getPrisma();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const username = data.username;
    const selectedCourseId = data.selectedCourseId;

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    if (!selectedCourseId) {
      console.error(`[Assessment] 缺少 selectedCourseId 参数`);
      return NextResponse.json({ error: "Missing selectedCourseId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.roleReport) {
      console.error(`[Assessment] 用户 ${username} 未完成入学引导或roleReport为空`);
      return NextResponse.json(
        { error: "User role position not found. Please complete orientation first." },
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

    // 2. 检查并返回缓存，增加并发保护逻辑
    if (stage?.preQuestions) {
      try {
        let questions = JSON.parse(stage.preQuestions);

        // --- 核心优化：Token 节流与阻塞等待逻辑 ---
        // 如果题目是空数组，说明另一个进程正在生成中
        if (Array.isArray(questions) && questions.length === 0) {
          let attempts = 0;
          const maxAttempts = 20; // 最多等待 15 秒

          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待 1 秒
            attempts++;

            // 重新查询数据库
            const updatedStage = await prisma.courseStage.findUnique({
              where: { id: stage.id },
            });

            if (updatedStage?.preQuestions && updatedStage.preQuestions !== "[]") {
              return NextResponse.json({ questions: JSON.parse(updatedStage.preQuestions) });
            }
          }
          // 如果超时了还没有生成，我们允许当前请求通过并触发重新生成（或者是 AI 服务挂了的重试逻辑）
        } else if (Array.isArray(questions) && questions.length > 0) {
          return NextResponse.json({ questions });
        }
      } catch (e) {
        console.error("Failed to parse stored preQuestions", e);
      }
    }

    // --- 并发控制：如果记录不存在，尝试创建一个占位符 ---
    if (!stage) {
      try {
        stage = await prisma.courseStage.create({
          data: {
            userId: user.id,
            courseId: selectedCourseId as string,
            status: "PRE_ASSESSMENT",
            preQuestions: "[]", // 初始占位符
          },
        });
      } catch (e: any) {
        // 如果创建失败（唯一约束冲突），说明另一个请求抢先创建了
        stage = await prisma.courseStage.findUnique({
          where: {
            userId_courseId: { userId: user.id, courseId: selectedCourseId as string },
          },
        });
        // 再次检查是否已经有题目了
        if (stage?.preQuestions && stage.preQuestions !== "[]") {
          return NextResponse.json({ questions: JSON.parse(stage.preQuestions) });
        }
      }
    }

    // 查找用户选中的课程以提取专属于这节课的测试点
    const selectedStage = STAGES.find((s: StageNode) => s.id === selectedCourseId);
    const coreKnowledgeStr = selectedStage?.coreKnowledge.join("、");

    if (!selectedStage) {
      console.error(`[Assessment] 无法找到课程阶段，selectedCourseId: ${selectedCourseId}`);
      return NextResponse.json({ error: "Invalid selectedCourseId" }, { status: 400 });
    }

    const systemPrompt = `
你是一位资深的前端架构师和技术面试官，专门为 JavaScript 学习者设计【课前诊断测试】。
你的目标是生成能够【真实检测用户理解深度】的题目，而不是考察死记硬背。
--------------------------------------------------
# 任务
针对当前课程阶段【${selectedStage?.title || "当前阶段"}】生成 **3 道高质量诊断题**，用于判断用户是否真正掌握该阶段的核心知识点。

课程信息：
课程名称：
${selectedStage?.title}
本阶段核心知识点（只能从此列表中选择）：
${coreKnowledgeStr}
--------------------------------------------------
# 用户上下文
用户角色定位：
${user.roleReport}
用户技术水平：
${user.skillLevel || "beginner"}
职业身份：
${user.careerIdentity || "未知"}
编程经验：
${user.experienceLevel || "未知"}
学习目标：
${user.learningGoal || "未知"}
兴趣领域：
${Array.isArray(user.interestAreas) ? user.interestAreas.join("、") : typeof user.interestAreas === "string" ? user.interestAreas : "未知"}
偏好场景（设计需要场景的的题目时优先考虑）：
${Array.isArray(user.preferredScenarios) ? user.preferredScenarios.join("、") : typeof user.preferredScenarios === "string" ? user.preferredScenarios : "未知"}
目标水平：
${user.targetLevel || "未知"}
每周学习时间：
${user.weeklyStudyTime || "未知"}
水平说明：
- beginner: 初学者，代码不超过 6 行，单一知识点
- intermediate: 有一定经验，代码不超过 10 行，可以包含概念组合
- advanced: 有丰富项目经验，代码不超过 12 行，必须包含常见陷阱
--------------------------------------------------
# 题目设计原则
所有题目必须符合以下原则：
1. 拒绝死记硬背  
绝对不要出现：
- “什么是闭包”
- “什么是Promise”
- “解释this”
必须使用：
- 代码阅读
- 输出预测
- Bug排查
- 行为分析

2. 每题必须考察一个知识点  
targetKnowledge **必须且只能**从以下列表中选择：
${coreKnowledgeStr}
禁止创造新的知识点名称。

3. 每题必须包含一个常见陷阱（Pitfall）
例如：
变量声明
- 误认为 let 会变量提升
this
- 误认为 this 指向定义位置
Promise
- 误认为 Promise 同步执行

4. 代码片段规则
如果题目包含代码：
- 必须 ≤ 12 行
- 必须围绕 targetKnowledge
- 不允许出现无关逻辑

5. 题型多样性
3 道题必须至少包含 **2 种不同题型**：
可选题型(部分)：
- 输出预测（output_prediction）
- Bug排查（bug_detection）
- 行为分析（behavior_analysis）
- 代码阅读（code_reading）
--------------------------------------------------
# 题目质量要求
要根据用户的水平调整题目难度，beginner 题目难度低，intermediate 题目难度中等，advanced 题目难度高。
错误选项必须代表真实的常见误区。
不要出现明显错误或无意义选项。
保证正确选项的位置一定要随机（不能所有题目的正确答案都是A选项之类）
--------------------------------------------------
# 输出格式（严格 JSON）
你必须 **只输出一个合法 JSON 数组**。
禁止输出：
- markdown
- 解释文字
- 注释
- trailing comma
- 代码块标记
确保输出可以被：
JSON.parse()
直接解析。
--------------------------------------------------
# JSON对象结构
[
  {
    "id": "q1",
    "type": "select",
    "conceptType": "output_prediction",
    "targetKnowledge": "必须是给定知识点列表中的一个",
    "questionText": "题目描述，需要清晰表达问题场景。不要在这里写大段代码。",
    "hasCode": true,
    "codeBlock": "需要分析的 JavaScript 代码。如果没有代码则为空字符串。",
    "options": ["选项A","选项B","选项C","选项D", ...],
    "correctAnswers": ["正确选项内容"]
  }
]
--------------------------------------------------
# 最终检查规则（生成前请自检）
在输出之前，请确保：
1. 题目数量必须 = 3
2. 每题 targetKnowledge 必须来自给定列表
3. 至少包含 2 种不同 conceptType
4. JSON 格式完全合法
5. correctAnswers 必须和 options 中的字符串完全一致，并且确保并验证正确选项是正确的
6. 绝对禁止输出任何 markdown 标记（如 \`\`\`json ）
7. 绝对禁止输出任何解释文字或注释
8. 绝对禁止输出任何 emoji 表情
9. 只输出纯 JSON 数组，能被 JSON.parse() 直接解析
--------------------------------------------------
请直接输出 JSON 数组。`;

    // (AI Calling logic)
    const { invokeGeneralAgent } = await import("@/lib/services/ai/ai.service");

    let content = await invokeGeneralAgent({
      userIdentifier: user.id,
      systemPrompt,
      input: "请生成 JSON 测试题目。",
      temperature: 0.7,
      tools: [], // 明确禁用工具调用以减少 token 开销
    });

    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(content);
      const finalArray = Array.isArray(parsed)
        ? parsed
        : Object.values(parsed).find(Array.isArray) || [];

      const cleanedArray = finalArray.map((q: any) => {
        if (!q.questionText && q.question) q.questionText = q.question;
        if (typeof q.hasCode !== "boolean") q.hasCode = false;
        if (!q.codeBlock) q.codeBlock = "";
        if (!q.options) q.options = [];
        return q;
      });

      const preQuestionsStr = JSON.stringify(cleanedArray);

      // 关键：双重检查锁定 (Double-Check Locking)
      // 在更新前再次确认数据库，防止覆盖掉竞速成功的另一个请求
      const latestStage = await prisma.courseStage.findUnique({
        where: { id: (stage as any).id },
      });

      if (latestStage?.preQuestions && latestStage.preQuestions !== "[]") {
        // 已经有题目了，说明有并发请求先完成了，我们放弃本次生成，使用已有的
        return NextResponse.json({ questions: JSON.parse(latestStage.preQuestions) });
      }

      await prisma.courseStage.update({
        where: { id: (stage as any).id },
        data: { preQuestions: preQuestionsStr },
      });

      return NextResponse.json({ questions: cleanedArray });
    } catch (parseError: any) {
      console.error("Failed to parse AI response as JSON:", parseError.message);
      console.error("Raw AI response:", content);
      return NextResponse.json(
        {
          error: "AI 生成的问题格式错误",
          details: parseError.message,
          rawResponse: content.substring(0, 500), // 只返回前500字符避免泄露过多信息
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Assessment endpoint error:", error);
    return NextResponse.json(
      { error: "生成摸底表单失败，请稍后重试", details: error.message },
      { status: 500 }
    );
  }
}

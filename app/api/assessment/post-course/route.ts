import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai";
import { STAGES } from "@/lib/courseConfig";
import type { AssessmentQuestion } from "@/types";

const prisma = getPrisma();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { username, selectedCourseId, diagnosisReport, sections } = data;

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
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
        },
      },
    });

    // 2. 检查并返回缓存，增加并发保护逻辑
    if (stage?.postQuestions) {
      try {
        let questions = JSON.parse(stage.postQuestions);

        // --- 核心优化：Token 节流与阻塞等待逻辑 ---
        // 如果题目是空数组，说明另一个进程正在生成中
        if (Array.isArray(questions) && questions.length === 0) {
          console.log(
            `[Post-Assessment] Race condition detected for ${username}. Waiting for generation...`
          );
          let attempts = 0;
          const maxAttempts = 20; // 最多等待 20 秒

          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待 1 秒
            attempts++;

            // 重新查询数据库
            const updatedStage = await prisma.courseStage.findUnique({
              where: { id: stage.id },
            });

            if (updatedStage?.postQuestions && updatedStage.postQuestions !== "[]") {
              console.log(
                `[Post-Assessment] Generation finished for ${username} after ${attempts}s.`
              );
              return NextResponse.json({ questions: JSON.parse(updatedStage.postQuestions) });
            }
          }
          console.log(
            `[Post-Assessment] Wait timed out for ${username}. Proceeding to re-generate.`
          );
          // 超时放行重试
        } else if (Array.isArray(questions) && questions.length > 0) {
          return NextResponse.json({ questions });
        }
      } catch (e) {
        console.error("Failed to parse stored postQuestions", e);
      }
    }

    // --- 并发控制：触发生成前打上空数组标签作为“生成中锁” ---
    if (stage) {
      await prisma.courseStage.update({
        where: { id: stage.id },
        data: { postQuestions: "[]" },
      });
    }

    const selectedStage = STAGES.find((s) => s.id === selectedCourseId);
    const courseInfo = selectedStage
      ? `课程：${selectedStage.title}\n目标：${selectedStage.learningObjective}\n核心知识点：${selectedStage.coreKnowledge.join("、")}`
      : "课程详细信息缺失";

    const sectionsInfo =
      sections && sections.length > 0
        ? `实际学习过的大题：\n${sections.map((s: { title: string; description: string }) => `- ${s.title}: ${s.description}`).join("\n")}`
        : "实际学习的大纲信息缺失";

    const systemPrompt = `你是一位严厉且实战经验极佳的 JavaScript 技术面试官。
你的任务是为刚完成【${selectedStage?.title || "当前阶段"}】学习的用户设计一份**课后结课测验**。

## 评估目标与出题基调 (最高优先级)
这是一份极其硬核的实战测验。不要采用任何教科书式的名词解释，抛弃掉一切 Emoji (💡⚠️等) 和多余的感谢语。
你必须假定用户马上就要在真实的开发环境中编写相关特性，你需要做的是通过题目**排雷**。

## 动态测验难度 (极其重要)
用户当前的技术水平等级为：**【${user.skillLevel || "beginner"}】**
- **beginner (初学者)**: 考查基础语法的防呆点、日常开发的常见报错分析，代码片段应直白易懂。
- **intermediate (进阶者)**: 考查代码性能、边界边缘情况、异步陷阱以及该阶段知识在实际框架中的变体。
- **advanced (高阶/资深)**: 极其硬核的底层原理、内存泄漏排查、Event Loop 微任务宏任务乱序、V8 引擎级别或设计模式的究极拷问。
题目难度必须与该等级**高度咬合**，不要降级或越级出题！

## 出题参考维度
- **用户角色**: ${user.roleReport || "前端/Node 开发工程师"}
- **初始诊断痛点**: ${diagnosisReport?.summary || "无"}
- **核心覆盖面**: ${courseInfo}
- **复习线索**: ${sectionsInfo}

## 核心出题规范
1. **职场压迫感 (Role-based Context)**
   - 绝大多数题目的题干必须是以【你正在负责xxx的具体业务】为开头。
   - 例如：而不是问“闭包是什么”，你要问“你正在开发电商系统的购物车组件，遇到以下代码泄漏问题……” 

2. **微代码鉴错 (Micro-code Debugging)**
   - **题目必须尽可能多地包含代码段 (必须有 hasCode: true)**。
   - 所有代码段严格遵循**“微代码法则”（绝对不超过 15 行）**。
   - 考法应为：抛出一个看起来没问题、或业务中极易写错的短片段，让用户判断输出结果或指出潜在 Bug。

3. **对齐学习大纲的"杀人诛心"**
   - 确保测验覆盖《核心知识点》中列出的关键项目。
   - 设计 1-2 道涉及“非常易混淆的防呆点”的面经级别题目。

## 输出格式
严格输出 JSON 数组格式，不要包含 \`\`\`json 标记或任何其他辅助文本。每道题结构如下：
[
  {
    "id": "pq_uuid",
    "type": "select",
    "questionText": "场景描述 + 具体问题（不许有Emoji,不要有大段代码）",
    "hasCode": true,
    "codeBlock": "极简业务代码段",
    "options": ["选项A", "选项B", "选项C", "选项D"]
  }
]

共生成 5 道题。仅输出 JSON 数组，必须能通过 JSON.parse() 解析。`;

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

    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(content);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      // 3. 关键：双重检查锁定 (Double-Check Locking)
      const latestStage = await prisma.courseStage.findUnique({
        where: { id: stage!.id },
      });

      if (latestStage?.postQuestions && latestStage.postQuestions !== "[]") {
        // 已经有题目了，说明有并发请求先完成了，我们放弃本次生成，使用已有的
        return NextResponse.json({ questions: JSON.parse(latestStage.postQuestions) });
      }

      const postQuestionsStr = JSON.stringify(questions);
      if (stage) {
        await prisma.courseStage.update({
          where: { id: stage.id },
          data: {
            postQuestions: postQuestionsStr,
            status: "POST_ASSESSMENT",
          },
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

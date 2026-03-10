import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { callAI } from "@/lib/ai";
import { STAGES } from "@/lib/courseConfig";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const username = data.username;
    const selectedCourseId = data.selectedCourseId;

    if (!username) {
       return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
       where: { username }
    });

    if (!user || !user.rolePosition) {
       return NextResponse.json({ error: "User role position not found. Please complete orientation first." }, { status: 400 });
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

    // 2. 如果已有记录且包含预生成的题目，则直接返回
    if (stage?.preQuestions) {
      try {
        return NextResponse.json({ questions: JSON.parse(stage.preQuestions) });
      } catch (e) {
        console.error("Failed to parse stored preQuestions", e);
      }
    }

    // 查找用户选中的课程以提取专属于这节课的测试点
    const selectedStage = STAGES.find(s => s.id === selectedCourseId);
    const courseFocus = selectedStage 
      ? `目前用户即将学习的内容是【${selectedStage.title}】。此阶段的目标是：“${selectedStage.learningObjective}”。\n此阶段的核心知识点包含：${selectedStage.coreKnowledge.join("、")}。` 
      : "（当前未获取到明确的阶段课程）";

    const systemPrompt = `你是一位资深的 JavaScript 课程评估师，擅长设计"以小见大"的诊断性题目。
你的任务是为选择【${selectedStage?.title || "当前阶段"}】课程的用户设计一份**课前摸底表单**。

## 评估目标
1. **识别舒适区与盲区**：通过 3 道题，快速判断用户对该课程核心知识点的掌握程度。
2. **区分理论与实战**：不仅考概念，更要考在特定职业场景下的应用。
3. **为教学提供输入**：你的题目解析/用户答案将直接决定后续教程的讲解深度。

## 出题参考维度
- **用户角色定位**: ${user.rolePosition}
- **用户角色描述**: ${user.roleReport}
- **用户技术水平**: ${user.skillLevel || "beginner"}
- **本阶段课程重点**:
${courseFocus}

## 出题规则
- **题型**：全部为单选题（select）或多选题（checkbox）。
- **结构**：每个题目必须包含以下字段：
  - \`id\`：题目的唯一标识符，建议格式为 pq1, pq2...（例如 pq1、pq2）
  - \`type\`：题型，必须为 "select"（单选题）或 "checkbox"（多选题）
  - \`questionText\`：题目内容，清晰描述问题，可包含技术术语和场景描述，题目中不要有代码
  - \`hasCode\`：是否包含代码块，boolean 类型（true/false）
  - \`codeBlock\`：代码块内容，string 类型，包含相关代码片段，无代码时为空字符串，必须是和题目相关的代码片段才生成，否则不生成
  - \`options\`：选项数组，string 类型，每个选项为一个字符串（如 ["选项A", "选项B", "选项C", "选项D"]）
- **难度梯度**：主要参考用户的技术水平和课程重点，合理分配题目难度
- **职业化场景**：如果用户是“全栈开发”，题目应多涉及 API 交互和性能；如果是“初学者”，应多涉及语法逻辑。

## 输出格式
严格仅输出一个 JSON 数组，不要包裹在 \`\`\`json 中；不要输出任何其他文本！
示例：
[
  {
    "id": "pq1",
    "type": "select",
    "questionText": "关于闭包，以下描述正确的是？",
    "hasCode": true,
    "codeBlock": "function outer() { ... }",
    "options": ["A", "B", "C", "D"]
  },
  ...
]`;

    // (AI Calling logic)
    let content = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成 JSON 测试题目。" },
      ],
      temperature: 0.7,
      maxTokens: 2500,
      jsonMode: true,
      label: "Assessment",
    });
    console.log("AI Response:", content.substring(0, 200) + "..."); // 只输出前200字符
    
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(content);
        const finalArray = Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray) || [];
        
        const cleanedArray = finalArray.map((q: any) => {
          if (!q.questionText && q.question) q.questionText = q.question;
          if (typeof q.hasCode !== "boolean") q.hasCode = false;
          if (!q.codeBlock) q.codeBlock = "";
          if (!q.options) q.options = [];
          return q;
        });

        // 3. 将新生成的题目保存到数据库
        const preQuestionsStr = JSON.stringify(cleanedArray);
        if (stage) {
          await prisma.courseStage.update({
            where: { id: stage.id },
            data: { preQuestions: preQuestionsStr }
          });
        } else {
          await prisma.courseStage.create({
            data: {
              userId: user.id,
              courseId: selectedCourseId as string,
              status: "PRE_ASSESSMENT",
              preQuestions: preQuestionsStr
            }
          });
        }
        
        return NextResponse.json({ questions: cleanedArray });
    } catch (parseError: any) {
        console.error("Failed to parse AI response as JSON:", parseError.message);
        console.error("Raw AI response:", content);
        return NextResponse.json({ 
          error: "AI 生成的问题格式错误",
          details: parseError.message,
          rawResponse: content.substring(0, 500) // 只返回前500字符避免泄露过多信息
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Assessment endpoint error:", error);
    return NextResponse.json(
      { error: "生成摸底表单失败，请稍后重试", details: error.message },
      { status: 500 }
    );
  }
}

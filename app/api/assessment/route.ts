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

    // 查找用户选中的课程以提取专属于这节课的测试点
    const selectedStage = STAGES.find(s => s.id === selectedCourseId);
    const courseFocus = selectedStage 
      ? `目前用户即将学习的内容是【${selectedStage.title}】。此阶段的目标是：“${selectedStage.learningObjective}”。\n此阶段的核心知识点包含：${selectedStage.coreKnowledge.join("、")}。` 
      : "（当前未获取到明确的阶段课程）";

    const systemPrompt = `你是一位资深的 JavaScript 课程评估师，擅长设计"以小见大"的诊断性题目。

## 出题方法论："由小见大"
你设计的每一道题都不应该只考察一个孤立的语法细节，而应该：
- **一道题覆盖一个核心知识领域**：题目表面考的是某个具体写法，但选项的设计应该能暴露用户对该知识点整体的理解深度
- **选项之间体现不同理解层次**：正确答案对应深层理解，干扰项分别对应常见误解、浅层记忆、完全不了解
- **6-8 道题覆盖所有核心知识点**：每道题主要映射一个核心知识点

## 用户信息
- 角色定位: ${user.rolePosition}
- 画像报告: ${user.roleReport || "无"}
- 技术水平: ${user.skillLevel || "beginner"}

## 难度自适应规则
请根据用户的技术水平和画像报告动态调整题目难度：
- **beginner（零基础/小白）**：题目侧重基本概念理解和简单代码阅读，代码不超过 5 行，避免复杂嵌套和边界情况
- **intermediate（有一定基础）**：题目涉及常见陷阱和易混淆概念，代码可包含组合场景（如闭包+作用域），考察实际运用能力
- **advanced（基础较好）**：题目考察深层原理和边界情况（如类型隐式转换、原型链查找顺序），代码场景更贴近真实工程，干扰项更具迷惑性

同时参考用户的画像报告中对其能力的描述，进一步微调题目深度。如果画像中提及用户对某方面已有了解，该方面的题目应适当提高难度；反之则降低。

## 课程信息
${courseFocus}

## 输出格式（极其严格，不允许任何偏差）
绝对不要输出任何无关的文字。严格仅输出一个合法的 JSON 数组。
每道题的结构如下：
[
  {
    "id": "q1",
    "type": "select",
    "questionText": "纯文字题干描述，不包含任何代码、不包含任何选项",
    "hasCode": true,
    "codeBlock": "console.log('hello');\\nlet x = 10;",
    "options": ["选项A", "选项B", "选项C", "选项D"]
  }
]

### 各字段说明
- **id**: 题目编号，格式 q1, q2, q3...
- **type**: "select"（单选）或 "checkbox"（多选）
- **questionText**: 纯文字的题干。绝对不要在这里写代码！绝对不要在这里写选项！不用提示多选！只写人话描述，如"以下代码的输出结果是？"
- **hasCode**: 布尔值。如果该题目需要展示一段代码供用户阅读，则为 true
- **codeBlock**: 当 hasCode 为 true 时，这里填纯 JavaScript 代码字符串（不要用 \`\`\` 包裹，不要加 markdown 格式，只放纯代码文本），换行用 \\n。当 hasCode 为 false 时，设为空字符串 ""
- **options**: 选项数组，选项中也不要带 A/B/C/D 前缀编号

## 关键约束
1. 共 6-8 道题，确保该阶段的每个核心知识点至少被一道题覆盖
2. 题型以 select（单选）为主，适当搭配 1-2 道 checkbox（多选）
3. 题目要简洁精炼，用户 3-5 分钟内能完成全部作答
4. 选项不要出"以上都不对"或"以上都对"这类无效选项
5. 尽量使用代码场景（hasCode: true），让用户"做中检测"
6. **questionText 中绝对不能包含代码片段和选项文字，代码只能放 codeBlock，选项只能放 options**
7. **hasCode 的黄金原则：代码必须是解题的必要条件。如果不看代码也能直接回答（比如"以下描述正确的是？"这类纯概念题），则必须设 hasCode 为 false。只有当题目要求用户阅读代码并分析执行结果、找出错误或推断行为时，才设 hasCode 为 true。反例：题干问"关于数组方法的描述正确的是？"然后附一段不影响答题的示例代码 → 这种必须 hasCode: false**`;

    let content = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请生成 JSON 测试题目。" },
      ],
      temperature: 0.7,
      maxTokens: 1500,
      jsonMode: true,
      label: "Assessment",
    });
    
    // 尝试清洗非标准 JSON 输出
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(content);
        // 如果包裹在某一个 root key 中比如 { "questions": [...] }, 则提取数组
        const finalArray = Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray) || [];
        
        // 标准化：确保每个题目都有新 Schema 字段
        const cleanedArray = finalArray.map((q: any) => {
          // 兼容旧字段：如果 AI 还是用了 question 而不是 questionText
          if (!q.questionText && q.question) {
            q.questionText = q.question;
          }
          // 确保 hasCode 和 codeBlock 字段存在
          if (typeof q.hasCode !== "boolean") {
            q.hasCode = false;
          }
          if (!q.codeBlock) {
            q.codeBlock = "";
          }
          // 确保 options 存在
          if (!q.options) q.options = [];
          return q;
        });
        
        return NextResponse.json({ questions: cleanedArray });
    } catch (parseError) {
        console.error("Failed to parse AI response as JSON", content);
        return NextResponse.json({ error: "AI 生成的问题格式错误" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Assessment endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "生成摸底表单失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

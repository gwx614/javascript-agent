import { DEFAULT_MODEL } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // 组装用户提交的完整问卷数据作为上下文
    const promptContext = data
      .map((item: any) => `问题${item.id}: ${item.question}\n回答: ${Array.isArray(item.answer) ? item.answer.join("、") : item.answer}`)
      .join("\n\n");

    const systemPrompt = `你是一个资深的 JavaScript 导师。
    根据用户提交的 10 道详细学习情况调研问卷（JSON），请生成一份结构化的学习分析报告。
    
    用户的调研回答如下：
    ${promptContext}

    报告必须包含以下板块：
    1. 【现状与特质洞察】：基于用户的背景、痛点和目标，深入分析其学习特质。
    2. 【定制化学习路径】：给出前 3 个阶段的具体行动建议和要掌握的核心概念。
    3. 【避坑指南】：针对用户的难点痛点，给出 1~2 条前车之鉴。
    4. 【导师寄语】：一句温暖且激励的话。
    
    格式要求：使用 Markdown 排版。保持在400字左右，语气专业且温暖。
    
    进阶要求（可选）：针对该用户的目标，在末尾附赠一个针对他痛点或基础水平的思考小挑战。`;

    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
    const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    
    const requestBody = {
      model: DEFAULT_MODEL || "glm-4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `这是用户的真实学习画像：\n${JSON.stringify(data, null, 2)}` }
      ],
      temperature: 0.8,
      max_tokens: 800
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Onboarding API Error]:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const reportText = result.choices?.[0]?.message?.content || "无法生成报告，可能未获取到有效内容。";

    return Response.json({ report: reportText });

  } catch (error: any) {
    console.error("Onboarding endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "分析生成失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

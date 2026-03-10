import { callAI } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // 组装用户提交的完整问卷数据作为上下文
    const promptContext = data
      .map((item: any) => `问题${item.id}: ${item.question}\n回答: ${Array.isArray(item.answer) ? item.answer.join("、") : item.answer}`)
      .join("\n\n");
    console.log(promptContext)

    const systemPrompt = `你是一个资深的 JavaScript 导师。
    根据用户提交的详细学习情况调研问卷，请直接为该用户生成一个准确的【专属角色定位】。
    
    用户的调研回答如下：
    ${promptContext}

    要求：
    绝对不要输出任何无关的寒暄、废话或多余的排版格式。请严格遵循以下输出结构：
    
    【角色定位】：[填写一个简短有力、响亮的角色名]
    
    [正文：用一段100~200字左右的连贯文字，简单准确地结合问卷介绍他为什么属于这个定位（注意使用"你"来称呼用户）]`;

    const reportText = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `这是用户的真实学习画像：\n${JSON.stringify(data, null, 2)}` },
      ],
      temperature: 0.8,
      maxTokens: 800,
      label: "Onboarding",
    }) || "无法生成报告，可能未获取到有效内容。";

    return Response.json({ report: reportText });

  } catch (error: any) {
    console.error("Onboarding endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "分析生成失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

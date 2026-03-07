import { JS_LEARNING_SYSTEM_PROMPT, DEFAULT_MODEL } from "@/lib/ai";

/**
 * 流式对话 API 路由
 *
 * POST /api/chat
 * 接收 Vercel AI SDK v5 格式的 UIMessage 列表，返回 UIMessageStream 格式响应。
 * 前端使用 useChat hook 的 DefaultChatTransport 自动消费此 API。
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { messages } = payload;
    
    // 从 headers 中读取 user 数据 (前端通过 DefaultChatTransport 传入)
    let user = null;
    const userHeader = req.headers.get("x-user-data");
    if (userHeader) {
      try {
        user = JSON.parse(decodeURIComponent(userHeader));
      } catch (e) {
        console.error("Failed to parse user header", e);
      }
    }

    const coreMessages = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => {
        let textContent = "";
        
        if (Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("");
        }
        
        if (!textContent && m.content) {
          textContent = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        }

        return {
          role: m.role as "user" | "assistant",
          content: textContent || " ",
        };
      });

    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
    const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    
    // 注入角色的系统提示词
    const dynamicSystemPrompt = user?.rolePosition 
      ? `${JS_LEARNING_SYSTEM_PROMPT}\n\n当前用户的专属角色定位是：【${user.rolePosition}】。请你在接下来的所有回复中，严格保持这个角色定位对应的口吻、辅导方式和交流深度。`
      : JS_LEARNING_SYSTEM_PROMPT;

    const requestBody = {
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        ...coreMessages
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true
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
      console.error("[AI API Error]:", errorText);
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let messageId = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          let buffer = "";
          let isFirstChunk = true;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              
              if (trimmed.startsWith("data: ")) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  const content = data.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    try {
                      if (isFirstChunk) {
                        const startMessage = JSON.stringify({
                          type: "text-start",
                          id: messageId
                        });
                        controller.enqueue(encoder.encode(`data: ${startMessage}\n\n`));
                        isFirstChunk = false;
                      }
                      
                      const uiMessage = JSON.stringify({
                        type: "text-delta",
                        id: messageId,
                        delta: content
                      });
                      controller.enqueue(encoder.encode(`data: ${uiMessage}\n\n`));
                    } catch (enqueueError) {
                      if (enqueueError instanceof Error && controller.desiredSize === null) {
                        return;
                      }
                      throw enqueueError;
                    }
                  }
                } catch (e) {
                  console.error("Error parsing SSE data:", e);
                }
              }
            }
          }

          try {
            if (!isFirstChunk) {
              const endMessage = JSON.stringify({
                type: "text-end",
                id: messageId
              });
              controller.enqueue(encoder.encode(`data: ${endMessage}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (closeError) {
            if (closeError instanceof Error && !closeError.message.includes('closed')) {
              console.error("Error closing stream:", closeError);
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          try {
            controller.error(error);
          } catch {
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1"
      }
    });
  } catch (error: any) {
    console.error("[Chat API Error Stack]:", error?.stack || error);
    console.error("[Chat API Error Details]:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return new Response(
      JSON.stringify({ error: "AI 服务暂时不可用，请检查 API Key 配置" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

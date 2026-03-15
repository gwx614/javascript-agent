import { DEFAULT_MODEL, AI_API_URL, getAIApiKey } from "./client";

/**
 * 通用 AI 调用函数（非流式）
 */
export async function callAI(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  label?: string;
  timeout?: number;
}): Promise<string> {
  const {
    messages,
    temperature = 0.6,
    maxTokens = 2000,
    jsonMode = false,
    label = "AI",
    timeout = 55000,
  } = options;

  const apiKey = getAIApiKey();

  const requestBody: any = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${label} API Error]:`, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`AI 请求超时（${timeout}ms），请稍后重试`);
    }
    throw error;
  }
}

/**
 * 通用 AI 流式调用函数
 */
export async function streamAI(options: {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  label?: string;
}): Promise<ReadableStream> {
  const { messages, temperature = 0.6, maxTokens = 3000, label = "AI Stream" } = options;

  const apiKey = getAIApiKey();
  const requestBody = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${label} Error]:`, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const messageId = crypto.randomUUID();

  return new ReadableStream({
    async start(controller) {
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

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
                  if (isFirstChunk) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "text-start", id: messageId })}\n\n`
                      )
                    );
                    isFirstChunk = false;
                  }
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "text-delta",
                        id: messageId,
                        delta: content,
                      })}\n\n`
                    )
                  );
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        if (!isFirstChunk) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text-end", id: messageId })}\n\n`)
          );
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

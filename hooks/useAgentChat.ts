import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function useAgentChat(user: Record<string, any> | null) {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // 这里保留初始 header 作为一个默认值（可能为 null）
      headers: user
        ? {
            "x-user-data": encodeURIComponent(JSON.stringify(user)),
          }
        : undefined,
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const isThinking = status === "submitted";

  const handleSend = (text: string) => {
    // 关键修复：在发送时实时传入最新的 user 数据
    // 这解决了 hydration 延迟或初始化时 user 为 null 的问题
    sendMessage(
      { text },
      {
        headers: user
          ? {
              "x-user-data": encodeURIComponent(JSON.stringify(user)),
            }
          : undefined,
        body: {
          user: user,
          userId: user?.id, // 关键：显式传递 userId 供后端校验
        },
      }
    );
  };

  return {
    messages,
    isThinking,
    isBusy,
    handleSend,
    stop,
  };
}

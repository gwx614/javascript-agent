import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function useAgentChat(user: Record<string, any> | null) {
  console.log("[useAgentChat] 用户数据:", user);
  console.log("[useAgentChat] 用户 ID:", user?.id);

  if (!user) {
    console.warn("[useAgentChat] 警告: 用户数据为 null,聊天功能可能无法正常查询用户数据");
  }

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
          user: user, // 同时在 body 中也传一份作为备份
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

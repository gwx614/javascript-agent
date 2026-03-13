import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function useAgentChat(user: Record<string, any> | null) {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
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
    sendMessage({ text });
  };

  return {
    messages,
    isThinking,
    isBusy,
    handleSend,
    stop,
  };
}

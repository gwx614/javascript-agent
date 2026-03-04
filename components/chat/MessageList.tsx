"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { MessageItem } from "./MessageItem";
import { Bot, Sparkles } from "lucide-react";

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
}

/**
 * 消息列表组件
 * - 展示所有对话消息
 * - 新消息到达时自动滚动到底部
 * - 消息为空时展示欢迎占位界面
 * - AI 思考中时显示打字动画
 */
export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 空状态：欢迎界面
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">你好，我是 JS 小智！</h2>
          <p className="text-muted-foreground max-w-sm leading-relaxed">
            你的专属 JavaScript 学习导师。无论是基础语法还是高级特性，我都能帮你搞定。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full max-w-md mt-2">
          {[
            "什么是闭包？",
            "Promise 和 async/await 的区别",
            "解释事件循环机制",
            "如何优化 JavaScript 性能？",
          ].map((suggestion) => (
            <div
              key={suggestion}
              className="px-3 py-2 text-xs text-left text-foreground/70 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors cursor-pointer"
            >
              💡 {suggestion}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* AI 思考中动画 */}
      {isLoading && (
        <div className="flex gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5 px-4 py-3 bg-muted/50 border border-border rounded-2xl rounded-tl-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

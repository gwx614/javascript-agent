"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";
import { Bot, User } from "lucide-react";

interface MessageItemProps {
  message: UIMessage;
}

/**
 * 单条消息组件
 *
 * ai v5 中 UIMessage 使用 parts 数组存储内容：
 * - 文本内容：parts.filter(p => p.type === 'text')
 */
export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  // 提取所有文本部分的内容
  const textContent = message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

  if (!textContent) return null;

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像区域 */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white",
          isUser
            ? "bg-gradient-to-br from-violet-500 to-purple-600"
            : "bg-gradient-to-br from-emerald-500 to-teal-600"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm"
            : "bg-muted/50 border border-border text-foreground rounded-tl-sm"
        )}
      >
        <div className="whitespace-pre-wrap break-words">{textContent}</div>
      </div>
    </div>
  );
}

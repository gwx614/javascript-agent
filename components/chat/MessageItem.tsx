"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
            ? "bg-gradient-to-br from-blue-500 to-cyan-500"
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
            ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-tr-sm"
            : "bg-muted/50 border border-border text-foreground rounded-tl-sm"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{textContent}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {textContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

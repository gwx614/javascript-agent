"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  isLoading: boolean;
  onSend: (text: string) => void;
  onStop?: () => void;
}

/**
 * 聊天输入框组件（ai v5 版本）
 *
 * ai v5 中 useChat 不再提供 input/handleInputChange，
 * 改为本地管理 input state，发送时调用 sendMessage({ text })。
 *
 * 功能：
 * - Enter 发送，Shift + Enter 换行
 * - 加载中禁用输入，显示停止按钮
 * - 自动扩展高度
 */
export function ChatInput({ isLoading, onSend, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="relative flex items-end gap-2 bg-card/50 border border-border hover:border-border/80 focus-within:border-primary/50 rounded-2xl p-3 transition-all duration-200">
        {/* 文本输入区域 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="向 JS 小智提问...（Enter 发送，Shift+Enter 换行）"
          rows={1}
          className={cn(
            "flex-1 bg-transparent text-foreground placeholder:text-muted-foreground",
            "text-sm leading-relaxed resize-none outline-none",
            "min-h-[24px] max-h-[200px] overflow-y-auto",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />

        {/* 发送/停止按钮 */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-500 flex items-center justify-center transition-all duration-200"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              input.trim()
                ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/30"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2">
        AI 回答仅供参考，建议结合官方文档学习
      </p>
    </div>
  );
}

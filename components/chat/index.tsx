"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";
import { Bot, User, Send, Square, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Types ---
interface AiAssistantProps {
  messages: UIMessage[];
  isThinking: boolean; // status === "submitted"
  isBusy: boolean; // status === "submitted" || status === "streaming"
  onSend: (text: string) => void;
  onStop: () => void;
  className?: string;
}

interface ChatInputProps {
  isLoading: boolean;
  onSend: (text: string) => void;
  onStop?: () => void;
}

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
}

interface MessageItemProps {
  message: UIMessage;
}

// --- Internal Components ---

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const textContent = message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

  if (!textContent) return null;

  return (
    <div
      className={cn(
        "flex px-4 py-2 duration-300 animate-in fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border/40 bg-muted/40 text-foreground"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{textContent}</div>
        ) : (
          <div className="prose prose-sm max-w-none break-words dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 监听滚动事件，判断用户是否手动向上滚动
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // 扩大判定范围：距离底部 100px 以内认为是在底部，重新锁定自动滚动
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      // 使用 behavior: "auto" 确保在流式输出这类高频更新场景下的瞬时准确性
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, isLoading, shouldAutoScroll]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">你好，我是 JS 小智</h2>
          <p className="max-w-[240px] px-2 text-sm leading-relaxed text-muted-foreground">
            你的专属前端导师。
            <br />
            遇到不懂的语法或报错，随时问我！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex h-full flex-col overflow-y-auto py-4"
    >
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex flex-col gap-2 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <Bot className="h-3 w-3 animate-pulse" />
            <span>JS 小智正在思考并查找资料...</span>
          </div>
          <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/40 bg-muted/30 px-3 py-2">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:300ms]" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function ChatInput({ isLoading, onSend, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
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
    <div className="px-3 pb-3 pt-2 text-center">
      <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/50 p-2.5 text-left transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 hover:border-border/80">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="向 JS 小智提问...（Shift+Enter 换行）"
          rows={1}
          className={cn(
            "flex-1 bg-transparent text-foreground placeholder:text-muted-foreground",
            "resize-none text-sm leading-relaxed outline-none",
            "max-h-[200px] min-h-[24px] overflow-y-auto",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        AI 回答仅供参考，建议结合官方文档学习
      </p>
    </div>
  );
}

// --- Main Exported Component ---

export function AiAssistant({
  messages,
  isThinking,
  isBusy,
  onSend,
  onStop,
  className,
}: AiAssistantProps) {
  return (
    <aside className={cn("flex flex-col border-l border-border bg-muted/10", className)}>
      <main className="w-full flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isThinking} />
      </main>

      <footer className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-md">
        <ChatInput isLoading={isBusy} onSend={onSend} onStop={onStop} />
      </footer>
    </aside>
  );
}

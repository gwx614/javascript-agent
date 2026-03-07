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
  isBusy: boolean;     // status === "submitted" || status === "streaming"
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
        "flex px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/40 border border-border/40 text-foreground rounded-tl-sm"
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

function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">你好，我是 JS 小智</h2>
          <p className="text-sm text-muted-foreground max-w-[240px] px-2 leading-relaxed">
            你的专属前端导师。<br/>遇到不懂的语法或报错，随时问我！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex px-4 py-2">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 border border-border/40 rounded-2xl rounded-tl-sm">
            <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
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
      <div className="relative flex items-end gap-2 bg-card/50 border border-border hover:border-border/80 focus-within:border-primary/50 rounded-2xl p-2.5 transition-[border-color,box-shadow] duration-200 text-left">
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

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
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

// --- Main Exported Component ---

export function AiAssistant({ 
  messages, 
  isThinking, 
  isBusy, 
  onSend, 
  onStop,
  className
}: AiAssistantProps) {
  return (
    <aside className={cn(
      "flex flex-col border-l border-border bg-muted/10",
      className
    )}>
      <main className="flex-1 overflow-y-auto w-full">
        <MessageList messages={messages} isLoading={isThinking} />
      </main>

      <footer className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-md">
        <ChatInput
          isLoading={isBusy}
          onSend={onSend}
          onStop={onStop}
        />
      </footer>
    </aside>
  );
}

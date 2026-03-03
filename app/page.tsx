"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Bot, Github, BookOpen } from "lucide-react";

/**
 * 主聊天页面（ai v5 版本）
 *
 * useChat v5 返回的关键字段：
 * - messages: UIMessage[]   对话消息列表（每条消息用 parts 数组存储内容）
 * - sendMessage({ text })   发送新消息（取代旧的 handleSubmit）
 * - status                  'ready' | 'submitted' | 'streaming' | 'error'
 * - stop                    停止 AI 生成
 *
 * API 端点通过 transport 配置，默认发往 /api/chat。
 * 可自定义 transport: new DefaultChatTransport({ url: '/api/chat' })
 */
export default function ChatPage() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat"
    })
  });

  // 是否正在加载（submitted 或 streaming 状态）
  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* ========== 顶部标题栏 ========== */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">JS 小智</h1>
            <p className="text-xs text-muted-foreground">JavaScript 学习助手</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 在线状态 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">在线</span>
          </div>

          <a
            href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="MDN 文档"
          >
            <BookOpen className="w-4 h-4" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ========== 消息列表区域 ========== */}
      <main className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </main>

      {/* ========== 底部输入区域 ========== */}
      <footer className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm">
        <ChatInput
          isLoading={isLoading}
          onSend={handleSend}
          onStop={stop}
        />
      </footer>
    </div>
  );
}

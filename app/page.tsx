"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Bot, Github, BookOpen, LogOut, Loader2 } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat"
    })
  });

  // 验证登录状态
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.replace("/login");
    } else {
      try {
        const user = JSON.parse(userStr);
        if (user && user.username) {
          setUsername(user.username);
          setIsAuthenticated(true);
        } else {
          router.replace("/login");
        }
      } catch (e) {
        router.replace("/login");
      }
    }
  }, [router]);

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.replace("/login");
  };

  // 是否正在加载（submitted 或 streaming 状态）
  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  // 如果还没验证通过，显示加载状态
  // 这个设计可以防止用户在未登录时瞬间看到聊天界面结构导致抖动（Flash of Unauthenticated Content）
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* ========== 顶部标题栏 ========== */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">JS 小智</h1>
            <p className="text-xs text-muted-foreground mr-1">欢迎回来, {username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 在线状态 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mr-2">
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
          <button
            onClick={handleLogout}
            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors ml-1"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
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

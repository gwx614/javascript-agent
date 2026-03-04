"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Bot, Github, BookOpen, LogOut, Loader2, Settings } from "lucide-react";
import { LearningProfileModal } from "@/components/LearningProfileModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ChatPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
          
          // 开发阶段：强制每次进入都显示
          setShowOnboarding(true);
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

  const handleOnboardingComplete = () => {
    localStorage.setItem("onboarded", "true");
    setShowOnboarding(false);
  };

  // 是否正在加载（submitted 或 streaming 状态）
  const isBusy = status === "submitted" || status === "streaming";
  // 仅在已提交但尚未开始流式返回时处于“思考中”状态
  const isThinking = status === "submitted";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  // 如果还没验证通过，显示加载状态
  // 这个设计可以防止用户在未登录时瞬间看到聊天界面结构导致抖动（Flash of Unauthenticated Content）
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {showOnboarding && (
        <LearningProfileModal 
          mode="onboarding" 
          onComplete={handleOnboardingComplete} 
        />
      )}
      {showSettings && (
        <LearningProfileModal 
          mode="settings" 
          onComplete={() => {}} 
          onClose={() => setShowSettings(false)} 
        />
      )}
      
      {/* ========== 顶部标题栏 ========== */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">JS 小智</h1>
            <p className="text-xs text-muted-foreground mr-1">@{username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 在线状态 */}
          <Badge variant="secondary" className="mr-3 gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 transition-colors">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            在线
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 text-muted-foreground hover:text-foreground rounded-xl"
            title="学习资料设置"
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground rounded-xl" asChild>
            <a href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript" target="_blank" rel="noopener noreferrer" title="MDN 文档">
              <BookOpen className="w-5 h-5" />
            </a>
          </Button>

          <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground rounded-xl" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" title="GitHub">
              <Github className="w-5 h-5" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-9 h-9 text-muted-foreground hover:text-red-500 rounded-xl"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ========== 消息列表区域 ========== */}
      <main className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isThinking} />
      </main>

      {/* ========== 底部输入区域 ========== */}
      <footer className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm">
        <ChatInput
          isLoading={isBusy}
          onSend={handleSend}
          onStop={stop}
        />
      </footer>
    </div>
  );
}

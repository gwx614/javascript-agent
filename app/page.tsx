"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { Loader2 } from "lucide-react";
import { LearningProfileModal } from "@/components/LearningProfileModal";

export default function ChatPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: user ? {
        "x-user-data": encodeURIComponent(JSON.stringify(user))
      } : undefined
    })
  });

  // 验证登录状态
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.replace("/login");
    } else {
      try {
        const parsedUser = JSON.parse(userStr);
        if (parsedUser && parsedUser.username) {
          setUsername(parsedUser.username);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // 如果用户已登录，每次刷新都展示学习问卷弹窗 (开发或特定需求)
          setShowOnboarding(true);
        } else {
          router.replace("/login");
        }
      } catch (e) {
        router.replace("/login");
      }
    }
  }, [router]);

  // 监听角色定位更新事件
  useEffect(() => {
    const handleProfileUpdate = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
        } catch (e) {}
      }
    };
    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
  }, []);

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
    <div className="flex flex-col h-[calc(100vh-73px)] max-w-3xl mx-auto w-full">
      {showOnboarding && (
        <LearningProfileModal 
          mode="onboarding" 
          onComplete={handleOnboardingComplete} 
        />
      )}

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

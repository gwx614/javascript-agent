"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { cn } from "@/lib/utils";
import { AiAssistant } from "@/components/chat";
import { Loader2 } from "lucide-react";
import { LearningProfileModal } from "@/components/LearningProfileModal";
import { LearningSidebar } from "@/components/learning/LearningSidebar";
import { LearningContent } from "@/components/learning/LearningContent";
import { useUIStore } from "@/store/useUIStore";
import { useUserStore } from "@/store/useUserStore";

export default function ChatPage() {
  const router = useRouter();

  const user = useUserStore(state => state.user);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const hasOnboarded = useUserStore(state => state.hasOnboarded);
  const setOnboarded = useUserStore(state => state.setOnboarded);
  const hasHydrated = useUserStore(state => state._hasHydrated);
  
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);

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
    // 只有在 hydration 完成后才进行跳转判断
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleOnboardingComplete = () => {
    setOnboarded(true);
  };

  // 是否正在加载（submitted 或 streaming 状态）
  const isBusy = status === "submitted" || status === "streaming";
  // 仅在已提交但尚未开始流式返回时处于“思考中”状态
  const isThinking = status === "submitted";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  // 如果还没加载完成或未鉴权，显示加载状态
  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-73px)] w-full overflow-hidden bg-background">
      {!hasOnboarded && (
        <LearningProfileModal 
          mode="onboarding" 
          onComplete={handleOnboardingComplete} 
        />
      )}

      {/* ========== 左侧：学习目录 ========== */}
      <LearningSidebar />
  
      {/* ========== 中间：学习主体内容 ========== */}
      <LearningContent />
  
      {/* ========== 右侧：AI 助教聊天 ========== */}
      <AiAssistant
        messages={messages}
        isThinking={isThinking}
        isBusy={isBusy}
        onSend={handleSend}
        onStop={stop}
        className={cn(
          "hidden lg:flex border-l border-border transition-[width,max-width] duration-300 ease-in-out shrink-0 overflow-hidden",
          isSidebarOpen 
            ? "w-[35%] max-w-[448px]" 
            : "w-[45%] max-w-full"
        )}
      />
    </div>
  );
}

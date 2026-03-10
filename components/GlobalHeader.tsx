"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bot, LogOut, UserRoundPen, Sun, Moon, Check } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { LearningProfileModal } from "@/components/LearningProfileModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUIStore } from "@/store/useUIStore";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { STAGES } from "@/lib/courseConfig";

export function GlobalHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  
  const user = useUserStore(state => state.user);
  const logout = useUserStore(state => state.logout);
  const setSelectedCourseId = useUserStore(state => state.setSelectedCourseId);

  const currentStage = useUIStore(state => state.currentStage);
  const setCurrentStage = useUIStore(state => state.setCurrentStage);

  const handleStageChange = async (stageTitle: string) => {
    setCurrentStage(stageTitle);
    
    // 找到对应的stage id
    const stage = STAGES.find(s => s.title === stageTitle);
    if (stage) {
      setSelectedCourseId(stage.id);
      
      // 设置当前阶段ID
      useLearningStore.getState().setCurrentStageId(stage.id);
      
      // 重新加载学习大纲
      if (user?.username) {
        useLearningStore.getState().setLoadingOutline(stage.id, true);
        try {
          const res = await fetch("/api/learning/outline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: user.username,
              selectedCourseId: stage.id,
              diagnosisReport: useUserStore.getState().diagnosisReport,
            }),
          });
          const data = await res.json();
          if (data.sections) {
            useLearningStore.getState().setSections(stage.id, data.sections);
          }
        } catch (err) {
          console.error("Failed to load outline", err);
        } finally {
          useLearningStore.getState().setLoadingOutline(stage.id, false);
        }
      }
    }
  };

  const handleLogout = () => {
    if (!isConfirmingLogout) {
      setIsConfirmingLogout(true);
      // 3秒后自动重置状态
      setTimeout(() => setIsConfirmingLogout(false), 3000);
      return;
    }
    logout();
    router.replace("/login");
  };

  // Do not render the header on the login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      {showSettings && (
        <LearningProfileModal 
          mode="settings" 
          onComplete={() => {}} 
          onClose={() => setShowSettings(false)} 
        />
      )}
      <header className="flex-shrink-0 relative z-10 w-full border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3 w-full">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-foreground">JS 小智</h1>
              {user?.username && <p className="text-xs text-muted-foreground mr-1">@{user.username}</p>}
            </div>

            {/* Stage Switcher Dropdown */}
            <div className="ml-2 hidden sm:block">
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="w-auto h-9 bg-transparent border-none shadow-none focus:ring-0 text-muted-foreground hover:text-foreground transition-colors font-bold gap-1.5 px-2 text-base">
                  <SelectValue placeholder="切换阶段" />
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.title} value={stage.title}>
                      {stage.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 text-muted-foreground hover:text-foreground hover:border-primary/30"
            title="学习角色定位"
          >
            <UserRoundPen className="w-5 h-5" />
          </button>
          
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            aria-label={theme === "light" ? "切换到暗黑模式" : "切换到白天模式"}
            title={theme === "light" ? "切换到暗黑模式" : "切换到白天模式"}
          >
            <div className="relative w-5 h-5">
              {/* 太阳图标 */}
              <Sun
                className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
                  theme === "light"
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-90 scale-0"
                }`}
              />
              {/* 月亮图标 */}
              <Moon
                className={`absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300 ${
                  theme === "dark"
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 -rotate-90 scale-0"
                }`}
              />
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg ${
              isConfirmingLogout 
                ? "text-red-600 border-red-500 bg-red-500/10 animate-pulse" 
                : "text-muted-foreground border-border hover:text-red-500 hover:border-red-500/30"
            }`}
            title={isConfirmingLogout ? "再次点击确认退出" : "退出登录"}
          >
            {isConfirmingLogout ? <Check className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
          </button>
          </div>
        </div>
      </header>
    </>
  );
}

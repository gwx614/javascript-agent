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

  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const setSelectedCourseId = useUserStore((state) => state.setSelectedCourseId);

  // 核心修复：坚决废弃冗余的 UI currentStage，唯一真理必须且只能是 selectedCourseId
  const currentStageName = STAGES.find((s) => s.id === selectedCourseId)?.title || "切换阶段";

  const handleStageChange = async (stageTitle: string) => {
    // 找到对应的stage id
    const stage = STAGES.find((s) => s.title === stageTitle);
    if (stage) {
      setSelectedCourseId(stage.id);

      // 设置当前阶段ID到学习存储
      useLearningStore.getState().setCurrentStageId(stage.id);

      // 注意：这里不再主动发起 outline 或内容类的网络请求。
      // 网络请求以及后端的 Sync 状态对齐工作，完全交由 app/page.tsx 的 syncStage 和路权分发（useEffect）负责，
      // 这避免了前端 UI 纯视觉组件抢跑触发 AI 大纲生成 API 而产生导致数据库被并发复写等严重状态管理竞态（Race Condition）问题。
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
      <header className="relative z-10 w-full flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex w-full items-center justify-between px-6 py-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-foreground">JS 小智</h1>
              {user?.username && (
                <p className="mr-1 text-xs text-muted-foreground">@{user.username}</p>
              )}
            </div>

            {/* Stage Switcher Dropdown */}
            <div className="ml-2 hidden sm:block">
              <Select value={currentStageName} onValueChange={handleStageChange}>
                <SelectTrigger className="h-9 w-auto gap-1.5 border-none bg-transparent px-2 text-base font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus:ring-0">
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-primary/30 hover:text-foreground hover:shadow-lg"
              title="学习角色定位"
            >
              <UserRoundPen className="h-5 w-5" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
              aria-label={theme === "light" ? "切换到暗黑模式" : "切换到白天模式"}
              title={theme === "light" ? "切换到暗黑模式" : "切换到白天模式"}
            >
              <div className="relative h-5 w-5">
                {/* 太阳图标 */}
                <Sun
                  className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 ${
                    theme === "light"
                      ? "rotate-0 scale-100 opacity-100"
                      : "rotate-90 scale-0 opacity-0"
                  }`}
                />
                {/* 月亮图标 */}
                <Moon
                  className={`absolute inset-0 h-5 w-5 text-blue-400 transition-all duration-300 ${
                    theme === "dark"
                      ? "rotate-0 scale-100 opacity-100"
                      : "-rotate-90 scale-0 opacity-0"
                  }`}
                />
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`flex h-10 w-10 items-center justify-center rounded-full border bg-background/80 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                isConfirmingLogout
                  ? "animate-pulse border-red-500 bg-red-500/10 text-red-600"
                  : "border-border text-muted-foreground hover:border-red-500/30 hover:text-red-500"
              }`}
              title={isConfirmingLogout ? "再次点击确认退出" : "退出登录"}
            >
              {isConfirmingLogout ? <Check className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

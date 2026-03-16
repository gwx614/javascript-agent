"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bot, LogOut, UserRoundPen, Sun, Moon, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { LearningProfileModal } from "@/components/learning/LearningProfileModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { STAGES, StageNode } from "@/lib/core/config";

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
  const courseStatus = useUserStore((state) => state.courseStatus);

  const activeStageName =
    STAGES.find((s: StageNode) => s.id === selectedCourseId)?.title || "切换阶段";

  const handleStageChange = async (stageTitle: string) => {
    const stage = STAGES.find((s: StageNode) => s.title === stageTitle);
    if (stage) {
      setSelectedCourseId(stage.id);
      useLearningStore.getState().setCurrentStageId(stage.id);
    }
  };

  const handleLogout = () => {
    if (!isConfirmingLogout) {
      setIsConfirmingLogout(true);
      setTimeout(() => setIsConfirmingLogout(false), 3000);
      return;
    }
    logout();
    router.replace("/login");
  };

  if (pathname === "/login") return null;

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
        <div className="relative flex min-h-[64px] w-full items-center justify-between px-6 py-2">
          {/* Left Area (Z-20 to be above the center bridge) */}
          <div className="z-20 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-foreground">JS 小智</h1>
                {user?.username && (
                  <p className="text-[10px] leading-none text-muted-foreground/60">
                    @{user.username}
                  </p>
                )}
              </div>
              <div className="hidden lg:block">
                <Select value={activeStageName} onValueChange={handleStageChange}>
                  <SelectTrigger className="h-8 w-auto gap-1 border-none bg-transparent px-2 text-sm font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus:ring-0">
                    <SelectValue placeholder="切换阶段" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[180px]">
                    {STAGES.map((stage: StageNode) => (
                      <SelectItem key={stage.title} value={stage.title}>
                        {stage.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Center Area: Timeline Progress (Geometric Absolute Center) */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center xl:flex">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 p-1 backdrop-blur-md">
              {[
                { label: "摸底", statuses: ["PRE_ASSESSMENT"] },
                { label: "诊断", statuses: ["PRE_REPORT"] },
                { label: "方案", statuses: ["STUDY_OUTLINE", "STUDYING"] },
                { label: "测试", statuses: ["POST_ASSESSMENT"] },
                { label: "结课", statuses: ["POST_REPORT", "COMPLETED"] },
              ].map((step, index, arr) => {
                const currentStatus =
                  (selectedCourseId && courseStatus[selectedCourseId]) || "PRE_ASSESSMENT";
                const statusToIndex: Record<string, number> = {
                  PRE_ASSESSMENT: 0,
                  PRE_REPORT: 1,
                  STUDY_OUTLINE: 2,
                  STUDYING: 2,
                  POST_ASSESSMENT: 3,
                  POST_REPORT: 4,
                  COMPLETED: 4,
                };
                const currentActiveIndex = statusToIndex[currentStatus] ?? 0;
                const isCompleted = index < currentActiveIndex;
                const isActive = index === currentActiveIndex;

                return (
                  <div key={step.label} className="flex items-center">
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-700 ease-in-out",
                        isActive
                          ? "scale-105 bg-background text-primary shadow-md shadow-primary/10 ring-1 ring-primary/30"
                          : isCompleted
                            ? "bg-primary/5 text-primary/80 hover:bg-primary/10"
                            : "text-muted-foreground/30"
                      )}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-all duration-1000 ease-out",
                          isCompleted || isActive
                            ? "scale-125 bg-primary shadow-[0_0_12px_rgba(var(--primary),0.6)]"
                            : "scale-100 bg-muted-foreground/20"
                        )}
                      />
                      <span
                        className={cn(
                          "whitespace-nowrap text-[11px] font-bold tracking-tight transition-opacity duration-500",
                          isActive ? "opacity-100" : "opacity-60"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < arr.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 h-[1.5px] w-3 transition-colors duration-700",
                          isCompleted ? "bg-primary/30" : "bg-border/30"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Area (Z-20 to be above the center bridge) */}
          <div className="z-20 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-foreground hover:shadow-md"
              title="学习角色定位"
            >
              <UserRoundPen className="h-4 w-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-md"
              title={theme === "light" ? "切换到暗黑模式" : "切换到白天模式"}
            >
              <div className="relative h-4 w-4">
                <Sun
                  className={cn(
                    "absolute inset-0 h-4 w-4 text-yellow-500 transition-all duration-300",
                    theme === "light"
                      ? "rotate-0 scale-100 opacity-100"
                      : "rotate-90 scale-0 opacity-0"
                  )}
                />
                <Moon
                  className={cn(
                    "absolute inset-0 h-4 w-4 text-blue-400 transition-all duration-300",
                    theme === "dark"
                      ? "rotate-0 scale-100 opacity-100"
                      : "-rotate-90 scale-0 opacity-0"
                  )}
                />
              </div>
            </button>

            <button
              onClick={handleLogout}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110",
                isConfirmingLogout
                  ? "animate-pulse border-red-500 bg-red-500/10 text-red-600"
                  : "border-border text-muted-foreground hover:border-red-500/30 hover:text-red-500"
              )}
              title={isConfirmingLogout ? "再次点击确认退出" : "退出登录"}
            >
              {isConfirmingLogout ? <Check className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, PanelLeftClose, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useLearningStore } from "@/store/useLearningStore";
import { useUserStore } from "@/store/useUserStore";

function getStatusIcon(status: string, isActive: boolean) {
  // 活跃状态显示一个实心的精致圆点
  if (isActive) {
    return (
      <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
    );
  }

  // 非活跃状态根据知识点状态显示不同的空心圆点或淡色圆点
  switch (status) {
    case "skip":
      // 已掌握：淡灰色小圆点
      return <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />;
    case "reinforce":
      // 需强化：淡琥珀色圆圈
      return <div className="h-2 w-2 rounded-full border border-amber-500/50" />;
    default:
      // 需学习：普通圆圈
      return <div className="h-2 w-2 rounded-full border border-muted-foreground/40" />;
  }
}

export function LearningSidebar() {
  const isOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const stageTitle = useUIStore((state) => state.currentStage);

  const user = useUserStore((state) => state.user);
  const setHasCompletedCourse = useUserStore((state) => state.setHasCompletedCourse);
  const hasCompletedCourse = useUserStore((state) => state.hasCompletedCourse);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const setCourseStatus = useUserStore((state) => state.setCourseStatus);
  const diagnosisReport = useUserStore((state) => state.diagnosisReport);

  // 直接访问store中的状态，避免使用getStageState导致的引用问题
  const stageStates = useLearningStore((state) => state.stageStates);
  const currentStageState = selectedCourseId ? stageStates[selectedCourseId] : null;

  const sections = currentStageState?.sections || [];
  const activeSectionId = currentStageState?.activeSectionId || null;
  const loadingOutline = currentStageState?.loadingOutline || false;
  const sectionContents = currentStageState?.sectionContents || {};

  // 展开/收起状态
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleSectionClick = async (sectionId: string) => {
    if (!selectedCourseId) return;

    useLearningStore.getState().setActiveSectionId(selectedCourseId, sectionId);

    // 如果已有缓存，不再请求
    if (sectionContents[sectionId]) return;

    // 查找对应的章节（可能是子章节）
    let targetSection = null;
    for (const section of sections) {
      if (section.id === sectionId) {
        targetSection = section;
        break;
      }
      for (const subSection of section.children) {
        if (subSection.id === sectionId) {
          targetSection = subSection;
          break;
        }
      }
      if (targetSection) break;
    }

    if (!targetSection) return;

    useLearningStore.getState().setLoadingContent(selectedCourseId, true);
    useLearningStore.getState().setSectionContent(selectedCourseId, sectionId, ""); // 清空初始内容

    try {
      const res = await fetch("/api/learning/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user?.username,
          selectedCourseId,
          sectionId: targetSection.id, // 明确发送 AI 生成的 ID
          sectionTitle: targetSection.title,
          sectionDescription: targetSection.description,
          sectionStatus: targetSection.status,
          diagnosisReport,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // 处理数据模式
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              // 处理核心增量内容
              if (data.type === "text-delta" && data.delta) {
                accumulatedContent += data.delta;

                // 处理可能被包裹的标记
                let displayContent = accumulatedContent;
                if (displayContent.startsWith("```markdown")) {
                  displayContent = displayContent.replace(/^```markdown\n?/i, "");
                }

                useLearningStore
                  .getState()
                  .setSectionContent(selectedCourseId, sectionId, displayContent);
              }
            } catch (e) {
              // 处理非 JSON 的纯文本返回（例如数据库缓存直接返回的内容）
              if (!trimmed.includes("{")) {
                accumulatedContent += trimmed.slice(6);
                useLearningStore
                  .getState()
                  .setSectionContent(selectedCourseId, sectionId, accumulatedContent);
              }
            }
          }
        }
      }

      // 最终清理结尾的 ```
      useLearningStore.getState().setSectionContent(
        selectedCourseId,
        sectionId,
        accumulatedContent
          .replace(/^```markdown\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim()
      );
    } catch (err) {
      console.error("Failed to stream content:", err);
      useLearningStore
        .getState()
        .setSectionContent(selectedCourseId, sectionId, "⚠️ 生成教程内容失败，请稍后重试。");
    } finally {
      useLearningStore.getState().setLoadingContent(selectedCourseId, false);
    }
  };

  return (
    <aside
      className={cn(
        "relative flex hidden flex-shrink-0 flex-col overflow-hidden border-border bg-card/30 transition-[width,opacity] duration-300 ease-in-out md:flex",
        isOpen ? "w-72 border-r opacity-100" : "w-0 border-r-0 opacity-0"
      )}
    >
      <div className="absolute inset-0 flex h-full w-72 flex-col">
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/50 px-5">
          <div className="flex items-center gap-2.5 truncate pr-8">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate text-sm font-bold tracking-tight text-foreground/80">
              {stageTitle}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 h-8 w-8 rounded-md text-muted-foreground/60 transition-colors hover:bg-muted"
            title="收起侧边栏"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1.5 p-4">
            {loadingOutline ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/60">
                <Loader2 className="mb-3 h-5 w-5 animate-spin" />
                <span className="text-xs font-medium">生成学习大纲中...</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
                <span className="text-xs">暂无学习内容</span>
              </div>
            ) : (
              sections.map((section) => {
                const isSectionActive = activeSectionId === section.id;
                const isSubSectionActive = section.children.some(
                  (sub) => activeSectionId === sub.id
                );
                const isAnyActive = isSectionActive || isSubSectionActive;
                const isExpanded = expandedSections[section.id] || isAnyActive;
                const isSkip = section.status === "skip";
                const isReinforce = section.status === "reinforce";

                return (
                  <div key={section.id} className="space-y-1">
                    {/* 一级菜单 */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200",
                        isAnyActive
                          ? "bg-primary/5 font-bold text-primary"
                          : "text-foreground/90 hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <div className="flex h-6 w-5 shrink-0 items-center justify-center">
                        {getStatusIcon(section.status, isAnyActive)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "break-words text-sm font-bold leading-snug transition-colors",
                            isSkip && !isAnyActive && "font-normal italic opacity-40",
                            isAnyActive && "text-primary"
                          )}
                        >
                          {section.title}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider opacity-60",
                              isReinforce
                                ? "text-amber-600"
                                : isSkip
                                  ? "text-muted-foreground"
                                  : "text-primary/70"
                            )}
                          >
                            {section.status === "reinforce"
                              ? "需强化"
                              : section.status === "skip"
                                ? "已掌握，可复习"
                                : "待学习"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({section.children.length} 小节)
                          </span>
                        </div>
                      </div>
                      <div
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* 二级菜单 */}
                    <div
                      className={`ml-8 space-y-1 overflow-hidden border-l-2 border-border/20 pl-2 transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      {isExpanded &&
                        section.children.map((subSection) => {
                          const isSubActive = activeSectionId === subSection.id;
                          const subIsSkip = subSection.status === "skip";
                          const subIsReinforce = subSection.status === "reinforce";

                          return (
                            <button
                              key={subSection.id}
                              onClick={() => handleSectionClick(subSection.id)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all duration-200 hover:translate-x-1",
                                isSubActive
                                  ? "bg-primary/5 font-medium text-primary"
                                  : "text-foreground/70 hover:bg-muted/30 hover:text-foreground"
                              )}
                            >
                              <div className="flex h-5 w-4 shrink-0 items-center justify-center">
                                {getStatusIcon(subSection.status, isSubActive)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "break-words text-xs leading-snug transition-colors",
                                    subIsSkip && !isSubActive && "font-normal italic opacity-40",
                                    isSubActive && "text-primary"
                                  )}
                                >
                                  {subSection.title}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* 侧边栏底部 - 固定区域 */}
        <div className="border-t border-border/50 bg-card/50 p-4 pb-10 backdrop-blur-sm">
          <Button
            className="group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-xl font-bold shadow-lg shadow-primary/20"
            onClick={() => {
              setHasCompletedCourse(true);
              if (selectedCourseId) {
                setCourseStatus(selectedCourseId, "POST_ASSESSMENT");
              }
            }}
            disabled={hasCompletedCourse || loadingOutline || sections.length === 0}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 transition-opacity group-hover:opacity-90" />
            <CheckCircle2 className="relative z-10 h-4 w-4" />
            <span className="relative z-10">完成学习，开始测验</span>
          </Button>
          <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">
            完成本阶段所有内容后开启
          </p>
        </div>
      </div>
    </aside>
  );
}

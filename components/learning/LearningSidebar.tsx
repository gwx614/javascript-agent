"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  PanelLeftClose,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useLearningStore } from "@/store/useLearningStore";
import { useUserStore } from "@/store/useUserStore";

function getStatusIcon(status: string, isActive: boolean) {
  // 活跃状态显示一个实心的精致圆点
  if (isActive) {
    return <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" />;
  }
  
  // 非活跃状态根据知识点状态显示不同的空心圆点或淡色圆点
  switch (status) {
    case "skip":
      // 已掌握：淡灰色小圆点
      return <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />;
    case "reinforce":
      // 需强化：淡琥珀色圆圈
      return <div className="w-2 h-2 rounded-full border border-amber-500/50" />;
    default:
      // 需学习：普通圆圈
      return <div className="w-2 h-2 rounded-full border border-muted-foreground/40" />;
  }
}

export function LearningSidebar() {
  const isOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const stageTitle = useUIStore((state) => state.currentStage);

  const sections = useLearningStore((state) => state.sections);
  const activeSectionId = useLearningStore((state) => state.activeSectionId);
  const setActiveSectionId = useLearningStore((state) => state.setActiveSectionId);
  const loadingOutline = useLearningStore((state) => state.loadingOutline);
  const sectionContents = useLearningStore((state) => state.sectionContents);
  const setSectionContent = useLearningStore((state) => state.setSectionContent);
  const setLoadingContent = useLearningStore((state) => state.setLoadingContent);

  const user = useUserStore((state) => state.user);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const diagnosisReport = useUserStore((state) => state.diagnosisReport);

  const handleSectionClick = async (sectionId: string) => {
    setActiveSectionId(sectionId);

    // 如果已有缓存，不再请求
    if (sectionContents[sectionId]) return;

    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    setLoadingContent(true);
    setSectionContent(sectionId, ""); // 清空初始内容

    try {
      const res = await fetch("/api/learning/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user?.username,
          selectedCourseId,
          sectionTitle: section.title,
          sectionDescription: section.description,
          sectionStatus: section.status,
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
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text-delta" && data.delta) {
                accumulatedContent += data.delta;
                
                // 处理可能被包裹的 ```markdown
                let displayContent = accumulatedContent;
                if (displayContent.startsWith("```markdown")) {
                  displayContent = displayContent.replace(/^```markdown\n?/i, "");
                }
                
                setSectionContent(sectionId, displayContent);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // 最终清理结尾的 ```
      setSectionContent(
        sectionId,
        accumulatedContent
          .replace(/^```markdown\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim()
      );
    } catch (err) {
      console.error("Failed to stream content:", err);
      setSectionContent(sectionId, "⚠️ 生成教程内容失败，请稍后重试。");
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <aside
      className={cn(
        "flex-shrink-0 flex flex-col border-border bg-card/30 hidden md:flex transition-[width,opacity] duration-300 ease-in-out overflow-hidden relative",
        isOpen ? "w-64 opacity-100 border-r" : "w-0 opacity-0 border-r-0"
      )}
    >
      <div className="w-64 h-full flex flex-col absolute inset-0">
        <div className="h-14 px-5 flex items-center justify-between border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-8">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground/80 truncate">{stageTitle}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground/60 transition-colors absolute right-3"
            title="收起侧边栏"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1.5">
            {loadingOutline ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/60">
                <Loader2 className="w-5 h-5 animate-spin mb-3" />
                <span className="text-xs font-medium">生成学习大纲中...</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
                <span className="text-xs">暂无学习内容</span>
              </div>
            ) : (
              [...sections]
                .sort((a, b) => {
                  const weights = { reinforce: 0, learn: 1, skip: 2 };
                  return weights[a.status] - weights[b.status];
                })
                .map((section, index) => {
                  const isActive = activeSectionId === section.id;
                  const isSkip = section.status === "skip";
                  const isReinforce = section.status === "reinforce";
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      className={cn(
                        "group w-full flex items-start gap-3 text-left p-2.5 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/5 text-primary font-bold"
                          : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                      )}
                    >
                      <div className="shrink-0 flex items-center justify-center w-5 h-6">
                        {getStatusIcon(section.status, isActive)}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <div
                          className={cn(
                            "text-sm leading-snug transition-colors break-words",
                            isSkip && !isActive && "opacity-40 font-normal italic",
                            isActive && "text-primary"
                          )}
                        >
                          {section.title}
                        </div>
                        
                        {/* 状态补充说明 - 极简文字标签 */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold opacity-60",
                            isReinforce ? "text-amber-600" : isSkip ? "text-muted-foreground" : "text-primary/70"
                          )}>
                            {section.status === "reinforce" ? "需强化" : section.status === "skip" ? "已掌握，可复习" : "待学习"}
                          </span>
                          {isActive && (
                            <span className="text-[10px] bg-primary/10 px-1 rounded-sm text-primary font-medium">正在进行</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}

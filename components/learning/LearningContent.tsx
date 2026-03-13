"use client";

import { Button } from "@/components/ui/button";
import { PanelLeftOpen, Loader2, BookText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/store/useUIStore";
import { useLearningStore } from "@/store/useLearningStore";
import { useUserStore } from "@/store/useUserStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function LearningContent() {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);

  // 直接访问store中的状态，避免使用getStageState导致的引用问题
  const stageStates = useLearningStore((state) => state.stageStates);
  const currentStageState = selectedCourseId ? stageStates[selectedCourseId] : null;

  const sections = currentStageState?.sections || [];
  const activeSectionId = currentStageState?.activeSectionId || null;
  const sectionContents = currentStageState?.sectionContents || {};
  const loadingContent = currentStageState?.loadingContent || false;

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const markdownContent = activeSectionId ? sectionContents[activeSectionId] : null;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-background">
      {/* 顶部标题栏 */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center justify-center border-b border-border bg-card/40 px-4 backdrop-blur-sm">
        {!isSidebarOpen && (
          <div className="absolute left-4 duration-300 animate-in fade-in zoom-in">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
              title="展开侧边栏"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="truncate px-12 text-center">
          <h1 className="truncate text-base font-bold tracking-tight md:text-lg">
            {activeSection ? activeSection.title : "选择一个小节开始学习"}
          </h1>
        </div>
      </div>

      {/* 内容区 */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-6xl p-6 pb-20 md:p-8">
          {loadingContent && !markdownContent ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
              <h3 className="animate-pulse text-lg font-bold">AI 正在为你生成教程...</h3>
              <p className="mt-2 text-sm">根据你的学习水平量身定制中</p>
            </div>
          ) : markdownContent ? (
            <article className="relative duration-500 animate-in fade-in slide-in-from-bottom-4">
              <div className="paper-sheet group min-h-[600px] transition-all duration-500">
                {/* 笔记横格线内容区 */}
                <div className="notebook-lines notebook-padding min-h-[700px]">
                  <div className="prose-notebook prose prose-slate max-w-none text-[15px] dark:prose-invert prose-headings:tracking-tight prose-p:leading-[2.2rem] prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-pre:border prose-pre:border-border/50 prose-pre:bg-muted/50">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="handwritten-quote" {...props} />
                        ),
                      }}
                    >
                      {markdownContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {loadingContent && (
                <div className="mt-8 flex animate-pulse items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI 正在继续生成中...</span>
                </div>
              )}
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="mb-6 rounded-2xl bg-primary/5 p-4">
                <BookText className="h-12 w-12 text-primary/40" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground/60">选择左侧小节开始学习</h3>
              <p className="max-w-sm text-center text-sm">
                AI
                将根据你的诊断结果，为每个知识点生成专属教程。已掌握的知识点会以精炼复习模式呈现。
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}

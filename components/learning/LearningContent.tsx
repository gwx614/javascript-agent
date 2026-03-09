"use client";

import { Button } from "@/components/ui/button";
import { PanelLeftOpen, Loader2, BookText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/store/useUIStore";
import { useLearningStore } from "@/store/useLearningStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function LearningContent() {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const sections = useLearningStore((state) => state.sections);
  const activeSectionId = useLearningStore((state) => state.activeSectionId);
  const sectionContents = useLearningStore((state) => state.sectionContents);
  const loadingContent = useLearningStore((state) => state.loadingContent);

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const markdownContent = activeSectionId
    ? sectionContents[activeSectionId]
    : null;

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background relative">
      {/* 顶部标题栏 */}
      <div className="h-14 px-4 flex items-center justify-center flex-shrink-0 border-b border-border bg-card/40 backdrop-blur-sm z-10 sticky top-0">
        {!isSidebarOpen && (
          <div className="absolute left-4 animate-in fade-in zoom-in duration-300">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-md bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              title="展开侧边栏"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
          </div>
        )}

        <div className="px-12 text-center truncate">
          <h1 className="text-base md:text-lg font-bold tracking-tight truncate">
            {activeSection ? activeSection.title : "选择一个小节开始学习"}
          </h1>
        </div>
      </div>

      {/* 内容区 */}
      <ScrollArea className="flex-1">
        <div className="p-6 md:p-8 max-w-4xl mx-auto pb-20">
          {loadingContent && !markdownContent ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <h3 className="text-lg font-bold animate-pulse">
                AI 正在为你生成教程...
              </h3>
              <p className="text-sm mt-2">
                根据你的学习水平量身定制中
              </p>
            </div>
          ) : markdownContent ? (
            <article className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
              <div className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-headings:tracking-tight prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-code:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline max-w-none text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdownContent}
                </ReactMarkdown>
              </div>
              
              {loadingContent && (
                <div className="flex items-center gap-2 mt-8 text-muted-foreground text-sm border-t pt-4 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 正在继续生成中...</span>
                </div>
              )}
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="p-4 rounded-2xl bg-primary/5 mb-6">
                <BookText className="w-12 h-12 text-primary/40" />
              </div>
              <h3 className="text-lg font-bold text-foreground/60 mb-2">
                选择左侧小节开始学习
              </h3>
              <p className="text-sm max-w-sm text-center">
                AI 将根据你的诊断结果，为每个知识点生成专属教程。已掌握的知识点会以精炼复习模式呈现。
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}

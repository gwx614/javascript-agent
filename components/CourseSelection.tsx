"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { STAGES } from "@/lib/courseConfig";

export function CourseSelection({ onStart }: { onStart: (stageId: string) => void }) {
  return (
    <div className="flex flex-col h-[90vh] max-h-[850px] bg-background/50 animate-in slide-in-from-right duration-500 overflow-hidden">
      <div className="text-center mb-6 mt-6">
        <h2 className="text-2xl font-black tracking-tight mb-2">学习路线图</h2>
        <p className="text-sm text-muted-foreground px-4">请选择你想开始学习的阶段。</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-2 pb-10">
        <div className="relative border-l-2 border-primary/20 ml-[23px] pb-6 mt-4">
          {STAGES.map((stage) => {
            return (
              <div key={stage.id} className="relative pl-10 mb-8 transition-all hover:scale-[1.01] group">
                {/* 节点图标 */}
                <div className="absolute -left-[25px] top-6 w-12 h-12 bg-background text-foreground rounded-full flex items-center justify-center border-[3px] border-primary/30 shadow-sm group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <span className="font-bold text-lg">{stage.order}</span>
                </div>

                {/* 卡片内容 */}
                <Card className="overflow-hidden transition-all duration-300 cursor-pointer border-border/40 hover:border-primary/40 hover:shadow-md"
                  onClick={() => onStart(stage.id)}
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
                          {stage.icon}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold">阶段 {stage.order}: {stage.title}</h3>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 font-medium">
                        🎯 目标: {stage.learningObjective}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {stage.coreKnowledge.map((k, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium border bg-background/50 border-border/50 text-muted-foreground">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 flex justify-end">
                      <Button onClick={(e) => { e.stopPropagation(); onStart(stage.id); }} className="font-bold rounded-lg px-6 h-10 w-full sm:w-auto text-sm shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                        开始学习
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STAGES } from "@/lib/courseConfig";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CourseSelection({ onStart }: { onStart: (stageId: string) => void }) {
  return (
    <div className="flex h-[90vh] max-h-[850px] flex-col overflow-hidden bg-background/50 duration-500 animate-in slide-in-from-right">
      <div className="mb-6 mt-6 text-center">
        <DialogTitle className="mb-2 text-2xl font-black tracking-tight">学习路线图</DialogTitle>
        <DialogDescription className="px-4 text-sm text-muted-foreground">
          请选择你想开始学习的阶段。
        </DialogDescription>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-10">
        <div className="relative ml-[23px] mt-4 border-l-2 border-primary/20 pb-6">
          {STAGES.map((stage) => {
            return (
              <div
                key={stage.id}
                className="group relative mb-8 pl-10 transition-all hover:scale-[1.01]"
              >
                {/* 节点图标 */}
                <div className="absolute -left-[25px] top-6 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-primary/30 bg-background text-foreground shadow-sm transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <span className="text-lg font-bold">{stage.order}</span>
                </div>

                {/* 卡片内容 */}
                <Card
                  className="cursor-pointer overflow-hidden border-border/40 transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                  onClick={() => onStart(stage.id)}
                >
                  <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                          {stage.icon}
                        </div>
                        <h3 className="text-base font-bold sm:text-lg">
                          阶段 {stage.order}: {stage.title}
                        </h3>
                      </div>

                      <p className="mb-3 text-xs font-medium text-muted-foreground sm:text-sm">
                        🎯 目标: {stage.learningObjective}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {stage.coreKnowledge.map((k, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 justify-end">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStart(stage.id);
                        }}
                        className="h-10 w-full rounded-lg px-6 text-sm font-bold shadow-md shadow-primary/20 transition-transform group-hover:scale-105 sm:w-auto"
                      >
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

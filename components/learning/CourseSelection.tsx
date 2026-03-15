"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STAGES } from "@/lib/config";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { Check, Clock, Play, Award } from "lucide-react";

export function CourseSelection({ onStart }: { onStart: (stageId: string) => void }) {
  const courseStatus = useUserStore((state) => state.courseStatus);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const stageAssessed = useUserStore((state) => state.isStageAssessed);
  const stageStates = useLearningStore((state) => state.stageStates);

  // 获取课程状态
  const getCourseState = (stageId: string) => {
    const status = courseStatus[stageId];
    const isAssessed = stageAssessed(stageId);
    const hasOutline = stageStates[stageId]?.sections?.length > 0;
    const isCompleted = ["POST_REPORT", "COMPLETED"].includes(status || "");

    if (isCompleted) {
      return "completed";
    } else if (isAssessed && hasOutline) {
      return "in-progress";
    } else if (isAssessed) {
      return "diagnosed";
    } else {
      return "not-started";
    }
  };

  return (
    <div className="flex h-[90vh] max-h-[850px] flex-col overflow-hidden bg-background/50 duration-500 animate-in slide-in-from-right">
      <div className="mb-6 mt-6 text-center">
        <DialogTitle className="mb-2 text-2xl font-black tracking-tight">学习路线图</DialogTitle>
        <DialogDescription className="px-4 text-sm text-foreground/70">
          请选择你想开始学习的阶段。
        </DialogDescription>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-10">
        <div className="relative ml-[23px] mt-4 border-l-2 border-primary/20 pb-6">
          {STAGES.map((stage) => {
            const courseState = getCourseState(stage.id);
            const isSelected = selectedCourseId === stage.id;

            // 根据状态获取显示文本
            const getButtonText = () => {
              switch (courseState) {
                case "completed":
                  return "已完成";
                case "in-progress":
                  return "继续学习";
                case "diagnosed":
                  return "开始学习";
                case "not-started":
                default:
                  return "开始学习";
              }
            };

            // 根据状态获取按钮样式
            const getButtonClass = () => {
              switch (courseState) {
                case "completed":
                  return "bg-green-100 text-green-700 hover:bg-green-200 shadow-md shadow-green-200";
                case "in-progress":
                  return "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20";
                case "diagnosed":
                case "not-started":
                default:
                  return "bg-background border border-border/50 text-foreground hover:bg-muted/50 shadow-md shadow-primary/10";
              }
            };

            // 根据状态获取图标
            const getStatusIcon = () => {
              switch (courseState) {
                case "completed":
                  return <Award className="h-4 w-4" />;
                case "in-progress":
                  return <Clock className="h-4 w-4" />;
                case "diagnosed":
                case "not-started":
                default:
                  return <Play className="h-4 w-4" />;
              }
            };

            return (
              <div
                key={stage.id}
                className="group relative mb-8 pl-10 transition-all hover:scale-[1.01]"
              >
                {/* 节点图标 */}
                <div
                  className={`absolute -left-[25px] top-6 flex h-12 w-12 items-center justify-center rounded-full border-[3px] shadow-sm transition-all duration-300 ${courseState === "completed" ? "border-green-500 bg-green-100 text-green-700" : courseState === "in-progress" ? "border-primary bg-primary text-white" : "border-primary/30 bg-background text-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"}`}
                >
                  {courseState === "completed" ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-bold">{stage.order}</span>
                  )}
                </div>

                {/* 卡片内容 */}
                <Card
                  className={`cursor-pointer overflow-hidden transition-all duration-300 ${isSelected ? "border-primary shadow-md shadow-primary/20" : courseState === "completed" ? "border-green-200 bg-green-50" : courseState === "in-progress" ? "border-primary/30 bg-primary/5" : "border-border/40 hover:border-primary/40 hover:shadow-md"}`}
                  onClick={() => onStart(stage.id)}
                >
                  <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div
                          className={`shrink-0 rounded-lg p-2 ${courseState === "completed" ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}
                        >
                          {stage.icon}
                        </div>
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-base font-bold sm:text-lg ${isSelected ? "text-primary" : "text-foreground"}`}
                          >
                            阶段 {stage.order}: {stage.title}
                          </h3>
                          {courseState === "completed" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                              <Check className="h-3 w-3" />
                              已完成
                            </span>
                          )}
                          {courseState === "in-progress" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                              <Clock className="h-3 w-3" />
                              学习中
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mb-3 text-xs font-medium text-foreground/80 sm:text-sm">
                        🎯 目标: {stage.learningObjective}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {stage.coreKnowledge.map((k, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-foreground/70 sm:text-xs"
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
                        className={`flex h-10 w-full items-center gap-2 rounded-lg px-6 text-sm font-bold transition-transform group-hover:scale-105 sm:w-auto ${getButtonClass()}`}
                        disabled={courseState === "completed"}
                      >
                        {getStatusIcon()}
                        {getButtonText()}
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

"use client";

import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, ArrowLeft, ArrowRight, Target, Zap, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinalLearningReport({
  report,
  questions,
  onSelectNextCourse,
}: {
  report: any;
  questions: any[];
  onSelectNextCourse: () => void;
}) {
  const setStageAssessed = useUserStore((state) => state.setStageAssessed);
  const setHasCompletedCourse = useUserStore((state) => state.setHasCompletedCourse);
  const setFinalReport = useUserStore((state) => state.setFinalReport);
  const setDiagnosisReport = useUserStore((state) => state.setDiagnosisReport);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const resetAllLearning = useLearningStore((state) => state.resetAll);

  const handleRestart = async () => {
    // 1. 询问用户是否确认（可选，但安全起见）
    if (!confirm("确定要重置本阶段的所有进度吗？此操作将彻底删除你的练习反馈和大纲。")) return;

    // 2. 调用后端接口进行物理删除
    const user = useUserStore.getState().user;
    if (user?.username && selectedCourseId) {
      try {
        await fetch("/api/user/reset-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            courseId: selectedCourseId,
          }),
        });
      } catch {
        // 重置失败时静默处理
      }
    }

    // 3. 同步重置前端状态：重置评估状态和大纲，重新生成大纲
    if (selectedCourseId) {
      setStageAssessed(selectedCourseId, false);
      useUserStore.getState().setCourseStatus(selectedCourseId, "PRE_ASSESSMENT");
    }
    setHasCompletedCourse(false);
    setFinalReport(null);
    setDiagnosisReport(null);

    // 彻底重置 learningStore 中的这个阶段
    if (selectedCourseId) {
      useLearningStore.getState().resetStage(selectedCourseId);
    }
  };

  const handleNextStep = () => {
    onSelectNextCourse();
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center justify-between border-b bg-primary/5 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <Trophy className="h-8 w-8 text-primary shadow-sm" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground/90">结课评估报告</h2>
            <p className="text-sm font-medium text-muted-foreground">Progress & Mastery Report</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-4xl font-black leading-none text-primary">{report.totalScore}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Final Score
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-4xl space-y-10 p-8 pb-16">
          {/* 总览卡片 */}
          <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-primary/5 p-8">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Trophy className="h-32 w-32 rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="mb-4 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                {report.levelLabel}
              </div>
              <h3 className="mb-3 text-xl font-bold">{report.summary}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {report.detailedAnalysis}
              </p>
            </div>
          </section>

          {/* 知识点掌握情况 */}
          <section>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <Target className="h-5 w-5 text-primary" />
              关键知识点达成
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {report.knowledgeMastery.map((kp: any, i: number) => (
                <div
                  key={i}
                  className="group rounded-2xl border bg-card p-5 transition-all hover:border-primary/30"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className="text-sm font-bold transition-colors group-hover:text-primary">
                      {kp.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                        kp.mastery === "high"
                          ? "bg-green-100 text-green-700"
                          : kp.mastery === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      )}
                    >
                      {kp.mastery}
                    </span>
                  </div>
                  <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        kp.mastery === "high"
                          ? "bg-green-500"
                          : kp.mastery === "medium"
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}
                      style={{ width: `${kp.score}%` }}
                    />
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">{kp.insight}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 建议与决策 */}
          <section className="rounded-3xl border-2 border-dashed border-border bg-card p-8">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground/80">
              <Zap className="h-5 w-5 text-amber-500" />
              AI 专家学习建议
            </h3>
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/30 p-5">
                <p className="text-sm font-medium italic leading-relaxed text-foreground/80">
                  &quot;{report.recommendation.reason}&quot;
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="flex h-20 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border/30 bg-background text-lg font-semibold transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-2 text-foreground/80">
                    <RotateCcw className="h-5 w-5 transition-transform hover:rotate-[-45deg]" />
                    <span>重新学习该阶段</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground/70">
                    夯实基础，再次挑战
                  </span>
                </Button>

                <Button
                  onClick={handleNextStep}
                  className="flex h-20 flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 animate-pulse" />
                    <span>
                      {report.recommendation.action === "next" ? "开启下一阶段" : "选择其他课程"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white/80">继续学习别的阶段</span>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

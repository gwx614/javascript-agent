"use client";

import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, ArrowLeft, ArrowRight, Target, Zap, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinalLearningReport({ report, questions, onSelectNextCourse }: { report: any, questions: any[], onSelectNextCourse: () => void }) {
  const setStageAssessed = useUserStore((state) => state.setStageAssessed);
  const setHasCompletedCourse = useUserStore((state) => state.setHasCompletedCourse);
  const setFinalReport = useUserStore((state) => state.setFinalReport);
  const setDiagnosisReport = useUserStore((state) => state.setDiagnosisReport);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const resetAllLearning = useLearningStore((state) => state.resetAll);
  
  const handleRestart = () => {
    // 重新学习本阶段：重置评估状态和大纲，重新生成大纲
    if (selectedCourseId) {
      setStageAssessed(selectedCourseId, false);
    }
    setHasCompletedCourse(false);
    setFinalReport(null);
    resetAllLearning();
  };

  const handleNextStep = () => {
    onSelectNextCourse();
  };

  return (
    <div className="flex-1 w-full h-full bg-background overflow-hidden flex flex-col">
      <div className="px-8 py-6 border-b bg-primary/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Trophy className="w-8 h-8 text-primary shadow-sm" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground/90">结课评估报告</h2>
            <p className="text-sm text-muted-foreground font-medium">Progress & Mastery Report</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-4xl font-black text-primary leading-none">{report.totalScore}</div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-1">Final Score</div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-8 space-y-10 pb-16">
          {/* 总览卡片 */}
          <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-32 h-32 rotate-12" />
             </div>
             <div className="relative z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4 uppercase tracking-widest">
                  {report.levelLabel}
                </div>
                <h3 className="text-xl font-bold mb-3">{report.summary}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {report.detailedAnalysis}
                </p>
             </div>
          </section>

          {/* 知识点掌握情况 */}
          <section>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-primary" />
              关键知识点达成
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.knowledgeMastery.map((kp: any, i: number) => (
                <div key={i} className="bg-card border rounded-2xl p-5 hover:border-primary/30 transition-all group">
                   <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-sm group-hover:text-primary transition-colors">{kp.name}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
                        kp.mastery === 'high' ? "bg-green-100 text-green-700" :
                        kp.mastery === 'medium' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}>
                        {kp.mastery}
                      </span>
                   </div>
                   <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                      <div 
                        className={cn("h-full transition-all duration-1000", 
                          kp.mastery === 'high' ? "bg-green-500" :
                          kp.mastery === 'medium' ? "bg-amber-500" : "bg-red-500"
                        )} 
                        style={{ width: `${kp.score}%` }} 
                      />
                   </div>
                   <p className="text-xs text-muted-foreground leading-snug">{kp.insight}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 建议与决策 */}
          <section className="bg-card border-2 border-dashed border-border rounded-3xl p-8">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-foreground/80">
              <Zap className="w-5 h-5 text-amber-500" />
              AI 专家学习建议
            </h3>
            <div className="space-y-4">
              <div className="bg-muted/30 p-5 rounded-2xl">
                 <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                   &quot;{report.recommendation.reason}&quot;
                 </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  onClick={handleRestart}
                  variant="outline" 
                  className="flex-1 h-16 rounded-2xl border-2 hover:bg-muted/50 font-bold text-base flex flex-col items-center justify-center gap-1"
                >
                  <div className="flex items-center gap-2 text-muted-foreground group">
                    <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
                    <span>重新学习该阶段</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 font-medium">夯实基础，再次挑战</span>
                </Button>

                <Button 
                   onClick={handleNextStep}
                   className="flex-1 h-16 rounded-2xl font-black text-base flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 animate-pulse" />
                    <span>{report.recommendation.action === 'next' ? '开启下一阶段' : '选择其他课程'}</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-medium">{report.recommendation.nextStep}</span>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

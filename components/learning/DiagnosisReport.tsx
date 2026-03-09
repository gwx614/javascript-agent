"use client";

import { useUserStore } from "@/store/useUserStore";
import { DiagnosisReport as DiagnosisReportType, KnowledgePointStatus, QuestionAnalysis } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  TrendingUp,
  Target,
  XCircle,
  ClipboardList,
} from "lucide-react";

function getMasteryColor(mastery: string) {
  switch (mastery) {
    case "high":
      return "bg-emerald-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-red-500";
    default:
      return "bg-muted";
  }
}

function getMasteryBgLight(mastery: string) {
  switch (mastery) {
    case "high":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "low":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getMasteryPercent(mastery: string) {
  switch (mastery) {
    case "high":
      return 90;
    case "medium":
      return 55;
    case "low":
      return 20;
    default:
      return 0;
  }
}

function getMasteryLabel(mastery: string) {
  switch (mastery) {
    case "high":
      return "掌握良好";
    case "medium":
      return "部分掌握";
    case "low":
      return "需要学习";
    default:
      return "未知";
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case "skip":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "reinforce":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "learn":
      return <BookOpen className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "skip":
      return "可跳过";
    case "reinforce":
      return "需强化";
    case "learn":
      return "需学习";
    default:
      return "";
  }
}

interface AssessmentQuestionItem {
  id: string;
  questionText?: string;
  question?: string;
  hasCode?: boolean;
  codeBlock?: string;
  options?: string[];
  [key: string]: any;
}

interface DiagnosisReportProps {
  report: DiagnosisReportType;
  questions?: AssessmentQuestionItem[];
  onStartLearning: () => void;
}

export function DiagnosisReport({ report, questions = [], onStartLearning }: DiagnosisReportProps) {
  const { overallLevel, summary, questionAnalysis, knowledgePoints, learningPath, roleAdvice } = report;
  const correctCount = (questionAnalysis || []).filter((qa) => qa.isCorrect).length;
  const totalCount = (questionAnalysis || []).length;

  return (
    <div className="flex-1 w-full h-full bg-muted/10">
      <div className="w-full h-full bg-card border-none overflow-hidden flex flex-col">
        {/* ========== Header ========== */}
        <div className="px-6 py-4 border-b bg-primary/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">学习诊断报告</h2>
                <p className="text-muted-foreground text-sm mt-0.5">{summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              {overallLevel}
            </div>
          </div>
        </div>

        {/* ========== 滚动内容区 ========== */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* ---- 逐题分析 ---- */}
            {questionAnalysis && questionAnalysis.length > 0 && (
              <section>
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  答题分析
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {correctCount}/{totalCount} 题正确
                  </span>
                </h3>
                <div className="space-y-3">
                  {questionAnalysis.map((qa: QuestionAnalysis) => {
                    const q = questions[qa.questionIndex - 1];
                    const qText = q?.questionText || q?.question || "";
                    return (
                      <div
                        key={qa.questionIndex}
                        className={`rounded-xl p-4 border transition-colors ${
                          qa.isCorrect
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-red-500/5 border-red-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {qa.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">第 {qa.questionIndex} 题</span>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  qa.isCorrect
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                                }`}
                              >
                                {qa.isCorrect ? "正确" : "错误"}
                              </span>
                            </div>
                            {qText && (
                              <p className="text-sm font-medium text-foreground/80 mb-2">
                                {qText}
                              </p>
                            )}
                            {q?.hasCode && q?.codeBlock && (
                              <pre className="bg-muted/50 border border-border/50 rounded-lg p-3 overflow-x-auto text-xs mb-2">
                                <code className="text-foreground/90 font-mono whitespace-pre">{q.codeBlock}</code>
                              </pre>
                            )}
                            {!qa.isCorrect && (
                              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                                ✅ 正确答案：{qa.correctAnswer}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {qa.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---- 知识点掌握度矩阵 ---- */}
            <section>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                核心知识点诊断
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {knowledgePoints.map((kp: KnowledgePointStatus, i: number) => (
                  <div
                    key={i}
                    className="bg-background rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* 知识点名称 + 状态标签 */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm">{kp.name}</span>
                      <div className="flex items-center gap-1.5">
                        {getActionIcon(kp.action)}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getMasteryBgLight(kp.mastery)}`}>
                          {getActionLabel(kp.action)}
                        </span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${getMasteryColor(kp.mastery)}`}
                        style={{ width: `${getMasteryPercent(kp.mastery)}%` }}
                      />
                    </div>

                    {/* 掌握度文字 + 角色提示 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {getMasteryLabel(kp.mastery)}
                      </span>
                      {kp.note && (
                        <span className="text-xs text-primary/80 font-medium truncate max-w-[60%] text-right">
                          💡 {kp.note}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ---- 推荐学习路径 ---- */}
            <section>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                推荐学习路径
              </h3>
              <div className="flex flex-wrap gap-2 items-center">
                {learningPath.map((item: string, i: number) => {
                  const kp = knowledgePoints.find((k) => k.name === item);
                  const isSkip = kp?.action === "skip";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isSkip
                            ? "bg-muted/50 text-muted-foreground line-through border-border/30"
                            : "bg-primary/5 text-foreground border-primary/20 hover:bg-primary/10"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground mr-1.5">
                          {i + 1}.
                        </span>
                        {item}
                      </div>
                      {i < learningPath.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ---- 角色化建议 ---- */}
            <section>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                专属学习建议
              </h3>
              <div className="bg-primary/5 rounded-xl p-5 border border-primary/15 text-sm leading-relaxed text-foreground/80">
                {roleAdvice}
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* ========== 底部按钮 ========== */}
        <div className="px-6 py-3 border-t bg-muted/5 shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            以上内容由 AI 根据你的答题情况智能生成
          </p>
          <Button
            onClick={onStartLearning}
            className="px-8 h-10 rounded-xl font-bold shadow-md shadow-primary/20"
          >
            开始学习 <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

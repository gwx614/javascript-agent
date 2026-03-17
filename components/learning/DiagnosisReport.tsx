"use client";

import { useUserStore } from "@/store/useUserStore";
import {
  type DiagnosisReport as DiagnosisReportType,
  type KnowledgePointStatus,
  type QuestionAnalysis,
} from "@/types";
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
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "reinforce":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "learn":
      return <BookOpen className="h-4 w-4 text-red-500" />;
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
  const {
    overallLevel = "未知",
    summary = "",
    questionAnalysis = [],
    knowledgePoints = [],
    learningPath = [],
    roleAdvice = "",
  } = report;
  const correctCount = questionAnalysis.filter((qa) => qa.isCorrect).length;
  const totalCount = questionAnalysis.length;

  return (
    <div className="h-full w-full flex-1 bg-muted/10">
      <div className="flex h-full w-full flex-col overflow-hidden border-none bg-card">
        {/* ========== Header ========== */}
        <div className="shrink-0 border-b bg-primary/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">学习诊断报告</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              <TrendingUp className="h-4 w-4" />
              {overallLevel}
            </div>
          </div>
        </div>

        {/* ========== 滚动内容区 ========== */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* ---- 逐题分析 ---- */}
            {questionAnalysis && questionAnalysis.length > 0 && (
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  答题分析
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
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
                        className={`rounded-xl border p-4 transition-colors ${
                          qa.isCorrect
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {qa.isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-sm font-bold">第 {qa.questionIndex} 题</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  qa.isCorrect
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                                }`}
                              >
                                {qa.isCorrect ? "正确" : "错误"}
                              </span>
                            </div>
                            {qText && (
                              <p className="mb-2 text-sm font-medium text-foreground/80">{qText}</p>
                            )}
                            {q?.hasCode && q?.codeBlock && (
                              <pre className="mb-2 overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-3 text-xs">
                                <code className="whitespace-pre font-mono text-foreground/90">
                                  {q.codeBlock}
                                </code>
                              </pre>
                            )}
                            {!qa.isCorrect && (
                              <p className="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                ✅ 正确答案：{qa.correctAnswer}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed text-muted-foreground">
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
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-5 w-5 text-primary" />
                核心知识点诊断
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {knowledgePoints.map((kp: KnowledgePointStatus, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* 知识点名称 + 状态标签 */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold">{kp.name}</span>
                      <div className="flex items-center gap-1.5">
                        {getActionIcon(kp.action)}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getMasteryBgLight(kp.mastery)}`}
                        >
                          {getActionLabel(kp.action)}
                        </span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${getMasteryColor(kp.mastery)}`}
                        style={{ width: `${getMasteryPercent(kp.mastery)}%` }}
                      />
                    </div>

                    {/* 掌握度文字 + 角色提示 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {getMasteryLabel(kp.status)}
                      </span>
                      {kp.teachingAdvice && (
                        <span className="max-w-[60%] truncate text-right text-xs font-medium text-primary/80">
                          💡 {kp.teachingAdvice}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ---- 推荐学习路径 ---- */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
                <ArrowRight className="h-5 w-5 text-primary" />
                推荐学习路径
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {(learningPath || []).map((item: string, i: number) => {
                  const kp = (knowledgePoints || []).find((k) => k.name === item);
                  const isSkip = kp?.action === "skip";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          isSkip
                            ? "border-border/30 bg-muted/50 text-muted-foreground line-through"
                            : "border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10"
                        }`}
                      >
                        <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                        {item}
                      </div>
                      {i < learningPath.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ---- 角色化建议 ---- */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-5 w-5 text-primary" />
                专属学习建议
              </h3>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-5 text-sm leading-relaxed text-foreground/80">
                {roleAdvice}
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* ========== 底部按钮 ========== */}
        <div className="relative z-10 flex shrink-0 items-center justify-between border-t bg-card px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <p className="text-xs text-muted-foreground">以上内容由 AI 根据你的答题情况智能生成</p>
          <Button
            onClick={() => onStartLearning()}
            size="lg"
            className="h-11 rounded-xl px-10 font-bold shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            开始学习 <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

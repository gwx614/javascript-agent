"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { DiagnosisReport as DiagnosisReportType } from "@/types";
import { Loader2, ArrowRight, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DiagnosisReport } from "./DiagnosisReport";

interface AssessmentQuestion {
  id: string;
  type: "select" | "checkbox";
  questionText: string;
  hasCode: boolean;
  codeBlock: string;
  options: string[];
  question?: string;
}

export function AssessmentForm() {
  const user = useUserStore((state) => state.user);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const setStageAssessed = useUserStore((state) => state.setStageAssessed);
  const setDiagnosisReport = useUserStore((state) => state.setDiagnosisReport);

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeDiagnosisReport = useUserStore((state) => state.diagnosisReport);
  const [report, setReport] = useState<DiagnosisReportType | null>(storeDiagnosisReport);

  useEffect(() => {
    setReport(storeDiagnosisReport);
  }, [storeDiagnosisReport]);

  useEffect(() => {
    let ignore = false;

    async function loadQuestions() {
      if (!user?.username || report) return;

      try {
        setLoading(true);
        const res = await fetch("/api/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username, selectedCourseId }),
        });
        const data = await res.json();

        if (!ignore) {
          if (data.error) {
            setError(data.error);
          } else {
            setQuestions(data.questions || []);
          }
        }
      } catch {
        if (!ignore) {
          setError("获取摸底题目失败，请刷新重试。");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      ignore = true;
    };
  }, [user, selectedCourseId, report]);

  const handleSelectChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleCheckboxChange = (qId: string, val: string, checked: boolean) => {
    setAnswers((prev) => {
      const existing = (prev[qId] as string[]) || [];
      if (checked) {
        return { ...prev, [qId]: [...existing, val] };
      } else {
        return { ...prev, [qId]: existing.filter((item) => item !== val) };
      }
    });
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => {
      const ans = answers[q.id];
      return !ans || (Array.isArray(ans) && ans.length === 0);
    });

    if (unanswered.length > 0) {
      alert("请先完成所有题目再提交哦！");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assessment/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user?.username,
          selectedCourseId,
          questions,
          answers,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else if (data.report) {
        setReport(data.report);
        setDiagnosisReport(data.report);
        if (selectedCourseId) {
          useUserStore.getState().setCourseStatus(selectedCourseId, "PRE_REPORT");
        }
      }
    } catch {
      alert("提交诊断失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartLearning = async () => {
    if (!selectedCourseId || !user?.username) return;

    try {
      await fetch("/api/user/sync-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          courseId: selectedCourseId,
          newStage: "STUDY_OUTLINE",
        }),
      });
      useUserStore.getState().setStageAssessed(selectedCourseId, true);
      useUserStore.getState().setCourseStatus(selectedCourseId, "STUDY_OUTLINE");
    } catch {
      // 静默处理错误
    }
  };

  if (report) {
    return (
      <DiagnosisReport
        report={report}
        questions={questions}
        onStartLearning={handleStartLearning}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background/50">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h3 className="animate-pulse text-xl font-bold text-muted-foreground">
          正在为你量身定制摸底测试...
        </h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 font-bold text-red-500">{error}</div>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 text-muted-foreground">没有生成任何题目，请返回重新定位角色。</div>
        <Button onClick={() => selectedCourseId && setStageAssessed(selectedCourseId, true)}>
          跳过返回
        </Button>
      </div>
    );
  }

  // ========== 答题表单 ==========
  return (
    <div className="h-full w-full flex-1 bg-muted/10">
      <div className="flex h-full w-full flex-col overflow-hidden border-none bg-card">
        <div className="flex shrink-0 items-center justify-between border-b bg-primary/5 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <BrainCircuit className="h-6 w-6 text-primary" />
              课前摸底测试
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              这些问题由 AI 根据你的角色专属生成，帮助我们更精准地推送学习内容。
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            共 {questions.length} 题
          </div>
        </div>

        <ScrollArea className="flex-1 px-8 py-6">
          <div className="space-y-8 pb-8">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
                <div className="space-y-3">
                  <div className="flex gap-3 text-lg font-bold leading-snug">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span>{q.questionText || q.question}</span>
                      {q.type === "checkbox" && (
                        <span className="relative top-[-1px] ml-2 text-xs font-normal text-muted-foreground">
                          (多选)
                        </span>
                      )}
                    </div>
                  </div>

                  {q.hasCode && q.codeBlock && (
                    <div className="ml-10">
                      <pre className="overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-4 text-sm">
                        <code className="whitespace-pre font-mono text-foreground/90">
                          {q.codeBlock}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>

                <div className="pl-10">
                  {q.type === "select" ? (
                    <RadioGroup
                      value={(answers[q.id] as string) || ""}
                      onValueChange={(val) => handleSelectChange(q.id, val)}
                      className="space-y-3"
                    >
                      {(q.options || []).map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-3 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                        >
                          <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                          <Label
                            htmlFor={`${q.id}-${i}`}
                            className="flex-1 cursor-pointer text-base font-normal"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-3">
                      {(q.options || []).map((opt, i) => {
                        const isChecked = ((answers[q.id] as string[]) || []).includes(opt);
                        return (
                          <div
                            key={i}
                            className="flex items-center space-x-3 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`${q.id}-${i}`}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(q.id, opt, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`${q.id}-${i}`}
                              className="flex-1 cursor-pointer text-base font-normal"
                            >
                              {opt}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end gap-4 border-t bg-card/50 px-8 py-5">
          <div className="text-sm text-muted-foreground">
            已完成 {Object.keys(answers).length} / {questions.length} 题
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="min-w-[140px] gap-2 font-bold"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                提交并查看报告
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

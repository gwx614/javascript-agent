"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { Loader2, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FinalLearningReport } from "./FinalLearningReport";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface AssessmentQuestion {
  id: string;
  type: "select" | "checkbox";
  questionText: string;
  hasCode: boolean;
  codeBlock: string;
  options: string[];
}

export function PostCourseAssessmentForm({
  onSelectNextCourse,
}: {
  onSelectNextCourse: () => void;
}) {
  const user = useUserStore((state) => state.user);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const diagnosisReport = useUserStore((state) => state.diagnosisReport);
  // 直接访问store中的状态，避免使用getStageState导致的引用问题
  const stageStates = useLearningStore((state) => state.stageStates);
  // 使用useMemo缓存sections，避免每次渲染都创建新的引用
  const sections = useMemo(() => {
    return selectedCourseId ? stageStates[selectedCourseId]?.sections || [] : [];
  }, [selectedCourseId, stageStates]);
  const finalReport = useUserStore((state) => state.finalReport);
  const setFinalReport = useUserStore((state) => state.setFinalReport);
  const { dialogState, closeDialog, showWarning, showError } = useConfirmDialog();

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadQuestions() {
      // 如果已经有最终报告，不加载问题
      if (!user?.username || finalReport) return;
      try {
        setLoading(true);
        const res = await fetch("/api/assessment/post-course", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            selectedCourseId,
            diagnosisReport,
            sections,
          }),
        });
        const data = await res.json();

        if (!ignore) {
          if (data.error) {
            setError(data.error);
          } else {
            setQuestions(data.questions || []);
          }
        }
      } catch (err) {
        if (!ignore) {
          setError("获取结课题目失败，请刷新重试。");
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
  }, [user, selectedCourseId, diagnosisReport, sections, finalReport]);

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
      showWarning(
        "还有未完成的题目",
        `你还有 ${unanswered.length} 道题目未完成，请完成所有题目，让我们更准确地评估你的进步！`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assessment/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user?.username,
          selectedCourseId,
          diagnosisReport,
          questions,
          answers,
        }),
      });
      const data = await res.json();
      if (data.error) {
        showError("提交失败", data.error);
      } else if (data.report) {
        setFinalReport(data.report);
        if (selectedCourseId) {
          useUserStore.getState().setCourseStatus(selectedCourseId, "POST_REPORT");
        }
      }
    } catch (err) {
      showError("生成报告失败", "生成报告失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (finalReport) {
    return (
      <FinalLearningReport
        report={finalReport}
        questions={questions}
        onSelectNextCourse={onSelectNextCourse}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background/50">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h3 className="animate-pulse text-xl font-bold text-muted-foreground">
          正在为你准备结课挑战...
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

  return (
    <div className="h-full w-full flex-1 bg-muted/10">
      <div className="flex h-full w-full flex-col overflow-hidden border-none bg-card">
        <div className="flex shrink-0 items-center justify-between border-b bg-primary/5 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <GraduationCap className="h-6 w-6 text-primary" />
              结课实战测试
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              恭喜你完成了本阶段学习！通过这个测试，我们将评估你的最终掌握情况。
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
                      <span>{q.questionText}</span>
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
                              onCheckedChange={(c) => handleCheckboxChange(q.id, opt, c as boolean)}
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

        <div className="flex shrink-0 justify-end border-t bg-muted/5 px-6 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 rounded-xl px-8 font-bold shadow-md shadow-primary/20"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在生成深度报告...
              </>
            ) : (
              <>
                提交挑战 <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        description={dialogState.description}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        showCancel={dialogState.showCancel}
      />
    </div>
  );
}

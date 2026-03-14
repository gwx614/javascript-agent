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
  // 兼容旧字段
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

  // 诊断报告（本地视图状态），优先使用 store 中持久化的结果以支持断点续传
  const storeDiagnosisReport = useUserStore((state) => state.diagnosisReport);
  const [report, setReport] = useState<DiagnosisReportType | null>(storeDiagnosisReport);

  // 监听持久化的 store 变化，如果有了报告也要及时更新本地视图，如果清空了也要跟着清空
  useEffect(() => {
    setReport(storeDiagnosisReport);
  }, [storeDiagnosisReport]);

  useEffect(() => {
    let ignore = false;

    async function loadQuestions() {
      // 如果已经有缓存的报告了，说明已经测完了，不需要再去拉题目
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
      } catch (err) {
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
    // 验证
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
    } catch (err) {
      alert("提交诊断失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartLearning = async () => {
    console.log("handleStartLearning triggered", { selectedCourseId });
    if (!selectedCourseId || !user?.username) {
      console.error("Missing selectedCourseId or user in handleStartLearning");
      return;
    }

    // 关键修复：除了设置前端UI跳过测验页的本地状态，还必须向后端明确声明：
    // “该用户结束课前诊断阶段，进入请求生成大纲（STUDY_OUTLINE）的状态流水线”
    try {
      await fetch("/api/user/sync-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          courseId: selectedCourseId,
          newStage: "STUDY_OUTLINE", // 推动后端状态机过河
        }),
      });
      // 告诉页面可以进入左侧双栏的正常学习形态了
      useUserStore.getState().setStageAssessed(selectedCourseId, true);
      useUserStore.getState().setCourseStatus(selectedCourseId, "STUDY_OUTLINE");
      console.log("Stage advanced to STUDY_OUTLINE and assessed state flag set.");
    } catch (err) {
      console.error("Failed to sync stage transition", err);
    }
  };

  // ========== 如果已经有诊断报告了，展示报告页 ==========
  if (report) {
    return (
      <DiagnosisReport
        report={report}
        questions={questions}
        onStartLearning={handleStartLearning}
      />
    );
  }

  // ========== 加载中 ==========
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

  // ========== 错误 ==========
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 font-bold text-red-500">{error}</div>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  // ========== 没有题目 ==========
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI 正在分析你的答卷...
              </>
            ) : (
              <>
                提交测试 <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

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

interface AssessmentQuestion {
  id: string;
  type: "select" | "checkbox";
  questionText: string;
  hasCode: boolean;
  codeBlock: string;
  options: string[];
}

export function PostCourseAssessmentForm({ onSelectNextCourse }: { onSelectNextCourse: () => void }) {
  const user = useUserStore((state) => state.user);
  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const diagnosisReport = useUserStore((state) => state.diagnosisReport);
  // 直接访问store中的状态，避免使用getStageState导致的引用问题
  const stageStates = useLearningStore((state) => state.stageStates);
  // 使用useMemo缓存sections，避免每次渲染都创建新的引用
  const sections = useMemo(() => {
    return selectedCourseId ? stageStates[selectedCourseId]?.sections || [] : [];
  }, [selectedCourseId, stageStates]);
  const setFinalReport = useUserStore((state) => state.setFinalReport);

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 最终报告（本地视图状态）
  const [report, setLocalReport] = useState<any | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      if (!user?.username) return;
      try {
        setLoading(true);
        const res = await fetch("/api/assessment/post-course", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: user.username, 
            selectedCourseId,
            diagnosisReport,
            sections
          }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setQuestions(data.questions || []);
        }
      } catch (err) {
        setError("获取结课题目失败，请刷新重试。");
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [user, selectedCourseId, diagnosisReport, sections]);

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
      alert("请完成所有题目，让我们更准确地评估你的进步！");
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
        alert(data.error);
      } else if (data.report) {
        setLocalReport(data.report);
        setFinalReport(data.report);
      }
    } catch (err) {
      alert("生成报告失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (report) {
    return <FinalLearningReport report={report} questions={questions} onSelectNextCourse={onSelectNextCourse} />;
  }

  if (loading) {
    return (
      <div className="flex w-full h-full flex-col items-center justify-center bg-background/50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h3 className="text-xl font-bold animate-pulse text-muted-foreground">
          正在为你准备结课挑战...
        </h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full h-full flex-col items-center justify-center">
        <div className="text-red-500 font-bold mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full bg-muted/10">
      <div className="w-full h-full bg-card border-none overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b bg-primary/5 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              结课实战测试
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              恭喜你完成了本阶段学习！通过这个测试，我们将评估你的最终掌握情况。
            </p>
          </div>
          <div className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
            共 {questions.length} 题
          </div>
        </div>

        <ScrollArea className="flex-1 px-8 py-6">
          <div className="space-y-8 pb-8">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-background rounded-xl p-6 shadow-sm border space-y-4">
                <div className="space-y-3">
                  <div className="font-bold text-lg flex gap-3 leading-snug">
                    <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-sm mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span>{q.questionText}</span>
                      {q.type === "checkbox" && (
                        <span className="text-xs text-muted-foreground font-normal ml-2 relative top-[-1px]">
                          (多选)
                        </span>
                      )}
                    </div>
                  </div>
                  {q.hasCode && q.codeBlock && (
                    <div className="ml-10">
                      <pre className="bg-muted/50 border border-border/50 rounded-lg p-4 overflow-x-auto text-sm">
                        <code className="text-foreground/90 font-mono whitespace-pre">{q.codeBlock}</code>
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
                        <div key={i} className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                          <Label htmlFor={`${q.id}-${i}`} className="flex-1 cursor-pointer font-normal text-base">
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
                          <div key={i} className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={`${q.id}-${i}`}
                              checked={isChecked}
                              onCheckedChange={(c) => handleCheckboxChange(q.id, opt, c as boolean)}
                            />
                            <Label htmlFor={`${q.id}-${i}`} className="flex-1 cursor-pointer font-normal text-base">
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

        <div className="px-6 py-3 border-t bg-muted/5 shrink-0 flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} className="px-8 h-10 rounded-xl font-bold shadow-md shadow-primary/20">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 正在生成深度报告...
              </>
            ) : (
              <>
                提交挑战 <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

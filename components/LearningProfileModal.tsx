"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  Target, 
  BrainCircuit, 
  Clock, 
  Layout, 
  Code2, 
  AlertCircle, 
  Briefcase,
  Sparkles,
  Save
} from "lucide-react";
import { formQuestions, defaultFormData, Question } from "@/lib/onboardingConfig";

// Shadcn UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface LearningProfileModalProps {
  mode: "onboarding" | "settings";
  onComplete: () => void;
  onClose?: () => void;
}

export function LearningProfileModal({ mode, onComplete, onClose }: LearningProfileModalProps) {
  const [step, setStep] = useState(mode === "onboarding" ? 1 : 2);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    const saved = localStorage.getItem("learningProfile");
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse learningProfile", e);
      }
    }
  }, []);

  const handleNext = () => setStep(step + 1);

  const handleSkipAI = () => {
    localStorage.setItem("onboarded", "true");
    onComplete();
  };

  const handleSaveSettings = () => {
    localStorage.setItem("learningProfile", JSON.stringify(formData));
    if (onClose) onClose();
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setStep(4);
    
    localStorage.setItem("learningProfile", JSON.stringify(formData));
    localStorage.setItem("onboarded", "true");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Construct detailed Q&A block instead of raw form dictionary
        body: JSON.stringify(
          formQuestions.map(q => ({
            id: q.id,
            question: q.question,
            answer: (formData as any)[q.id]
          }))
        )
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      } else {
        setReport("生成失败，未获取到报告。");
      }
    } catch (e) {
      setReport("网络错误，导致 AI 无法生成报告。");
    } finally {
      setLoading(false);
    }
  };

  const icons = {
    level: <BrainCircuit className="w-4 h-4 text-blue-500" />,
    goal: <Target className="w-4 h-4 text-purple-500" />,
    time: <Clock className="w-4 h-4 text-orange-500" />,
    style: <Layout className="w-4 h-4 text-emerald-500" />,
    html: <Code2 className="w-4 h-4 text-cyan-500" />,
    struggle: <AlertCircle className="w-4 h-4 text-red-500" />,
    career: <Briefcase className="w-4 h-4 text-indigo-500" />
  };

  const renderField = (field: Question) => {
    const value = (formData as any)[field.id];

    if (field.type === "select") {
      return (
        <Select 
          value={value} 
          onValueChange={(val) => setFormData({...formData, [field.id]: val})}
        >
          <SelectTrigger className="h-12 rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-colors focus:ring-2 focus:ring-primary/20">
            <SelectValue placeholder="请选择..." />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-none shadow-xl">
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt} className="rounded-md cursor-pointer">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (field.type === "textarea") {
      return (
        <textarea
          className="w-full min-h-[100px] p-4 text-sm rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-colors focus:ring-2 focus:ring-primary/20 resize-none outline-none"
          placeholder={field.placeholder || "请输入..."}
          value={value}
          onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <div className="flex flex-col gap-3 mt-2">
          {field.options.map(opt => {
            const isChecked = Array.isArray(value) && value.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded-sm border-muted text-primary focus:ring-primary/20 bg-background"
                  checked={isChecked}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...(Array.isArray(value) ? value : []), opt]
                      : (Array.isArray(value) ? value.filter(v => v !== opt) : []);
                    setFormData({...formData, [field.id]: newValues});
                  }}
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            )
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if(!open && onClose) onClose(); }}>
      <DialogContent 
        hideClose={mode === "onboarding"}
        className="max-w-4xl p-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl"
      >
        
        {/* Step 1: Welcome (Onboarding Only) */}
        {step === 1 && mode === "onboarding" && (
          <div className="p-10 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <span className="text-4xl">👋</span>
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tight text-center">你好！我是 JS 小智</DialogTitle>
              <DialogDescription className="text-lg leading-relaxed text-center pt-4">
                我将作为你的专属 JavaScript 学习助手，根据你的水平动态调整学习路径。开启奇妙之旅前，先互相了解下吧。
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-10">
              <Button 
                size="lg" 
                onClick={handleNext} 
                className="h-14 px-10 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                开始了解 <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Form (Both modes) */}
        {step === 2 && (
          <div className="flex flex-col h-[90vh] max-h-[850px] animate-in slide-in-from-right duration-500">
            <DialogHeader className="p-8 pb-4">
              <DialogTitle className="text-2xl font-black tracking-tight">个性化你的学习</DialogTitle>
              <DialogDescription className="text-base">填写这些信息，AI 将为你推荐最适合的学习深度。</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-8">
              <div className="space-y-8 pb-8">
                {formQuestions.map((field, index) => (
                  <div key={field.id} className="space-y-3 group bg-card p-5 rounded-xl shadow-sm border border-border/10">
                    <label className="text-base font-bold flex items-start gap-2 group-hover:text-primary transition-colors leading-relaxed">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs mt-0.5">
                        {index + 1}
                      </span>
                      <span>{field.question}</span>
                    </label>
                    <div className="pl-8 pt-1">
                      {renderField(field)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-8 pt-4 border-t bg-muted/5 flex justify-end gap-3 rounded-b-2xl">
              {mode === "settings" ? (
                <>
                  <Button variant="ghost" onClick={onClose} className="rounded-lg font-bold">取消</Button>
                  <Button onClick={handleSaveSettings} className="rounded-lg font-bold shadow-lg shadow-primary/20">
                    <Save className="mr-2 w-4 h-4" /> 保存修改
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext} className="h-12 px-10 rounded-lg font-bold shadow-lg shadow-primary/20">
                  提交并继续
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Confirmation (Onboarding Only) */}
        {step === 3 && mode === "onboarding" && (
          <div className="p-10 text-center animate-in slide-in-from-right duration-500">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-primary shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tight text-center">信息已就绪！</DialogTitle>
              <DialogDescription className="text-lg leading-relaxed text-center pt-4">
                现在我可以基于这些信息为你生成一份<strong className="text-foreground font-bold">个性化学习路线</strong>。是否立刻开启 AI 分析？
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 max-w-sm mx-auto w-full mt-10">
              <Button onClick={handleGenerateReport} className="h-14 rounded-xl font-bold text-lg shadow-xl shadow-primary/20">
                生成 AI 学习报告 <Sparkles className="ml-2 w-5 h-5 text-yellow-400 fill-yellow-400" />
              </Button>
              <Button variant="secondary" onClick={handleSkipAI} className="h-14 rounded-xl font-bold text-lg">
                跳过并进入系统
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: AI Result (Onboarding Only) */}
        {step === 4 && (
          <div className="flex flex-col h-[90vh] max-h-[850px] p-10 animate-in slide-in-from-bottom duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="relative mb-10">
                  <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">正在同步智慧...</h3>
                <p className="text-muted-foreground animate-pulse text-lg">AI 助手正在深度定制你的学习方案</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-3xl font-black text-center flex items-center justify-center gap-3 tracking-tight">
                    <BrainCircuit className="w-10 h-10 text-primary" />
                    你的专属 AI 导师报告
                  </DialogTitle>
                </DialogHeader>
                <Card className="flex-1 overflow-hidden border border-border/50 bg-background/50 shadow-sm rounded-xl">
                  <CardContent className="h-full p-0">
                    <ScrollArea className="h-full">
                      <div className="p-8 prose prose-slate dark:prose-invert max-w-none text-foreground/90">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {report}
                        </ReactMarkdown>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                <div className="flex justify-center mt-10">
                  <Button onClick={onComplete} className="h-14 w-full max-w-sm rounded-xl font-black text-xl shadow-xl shadow-primary/20">
                    开启学习之旅
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

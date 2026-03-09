"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, ArrowRight, CheckCircle2, Target, BrainCircuit, Clock, Layout, Code2, AlertCircle, Briefcase, Sparkles, Save } from "lucide-react";
import { formQuestions, defaultFormData } from "@/lib/onboardingConfig";
import { Question } from "@/types";
import { CourseSelection } from "./CourseSelection";
import { useUserStore } from "@/store/useUserStore";

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

interface LearningProfileModalProps {
  mode: "onboarding" | "settings";
  onComplete: () => void;
  onClose?: () => void;
}

export function LearningProfileModal({ mode, onComplete, onClose }: LearningProfileModalProps) {
  const [step, setStep] = useState(mode === "onboarding" ? 1 : 3);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [roleName, setRoleName] = useState("");
  const [formData, setFormData] = useState(defaultFormData);
  
  const user = useUserStore(state => state.user);
  const updateUser = useUserStore(state => state.updateUser);
  const setOnboarded = useUserStore(state => state.setOnboarded);

  useEffect(() => {
    const saved = localStorage.getItem("learningProfile");
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse learningProfile", e);
      }
    }
    
    // 如果是设置模式，尝试恢复已有的角色名称
    if (mode === "settings" && user) {
      if (user.rolePosition) {
        setRoleName(user.rolePosition);
        if (user.roleReport) {
          setReport(user.roleReport);
        } else {
          setReport("这是你当前保存的专属角色！如果想改变学习侧重点，可以点击重新定位获取全新角色。");
        }
      }
    }
  }, [mode, user]);

  const handleNext = () => setStep(step + 1);

  const handleSkipAI = () => {
    setOnboarded(true);
    setStep(4);
  };

  const handleSaveSettings = async () => {
    localStorage.setItem("learningProfile", JSON.stringify(formData));
    
    // Also try saving to DB if user is logged in
    if (user?.username) {
      try {
        await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            rolePosition: roleName,
            formData
          })
        });
        
        // Update user store
        updateUser({
          rolePosition: roleName
        });
      } catch (e) {
        console.error("Failed to save profile to DB", e);
      }
    }

    if (onClose) onClose();
  };

  const handleGenerateRole = async () => {
    setLoading(true);
    setStep(3);
    
    localStorage.setItem("learningProfile", JSON.stringify(formData));

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          formQuestions.map(q => ({
            id: q.id,
            question: q.question,
            answer: (formData as Record<string | number, unknown>)[q.id]
          }))
        )
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        // Try to extract a short role name from the report if provided in a specific format, otherwise use a default
        const match = data.report.match(/【角色定位】[:：]\s*(.+?)(?=\n|$)/);
        const extractedRole = match ? match[1].trim() : "JavaScript 探索者";
        setRoleName(extractedRole);

        // Save to Database
        if (user?.username) {
          try {
            // 从第一题的答案映射 skillLevel
            const levelAnswer = String((formData as any)[1] || "");
            let skillLevel = "beginner";
            if (levelAnswer.startsWith("有一定基础")) {
              skillLevel = "intermediate";
            } else if (levelAnswer.startsWith("基础较好")) {
              skillLevel = "advanced";
            }

            const saveRes = await fetch("/api/user/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: user.username,
                rolePosition: extractedRole,
                roleReport: data.report,
                skillLevel,
                formData
              })
            });
            const saveData = await saveRes.json();
            if (saveData.success) {
               // Update Zustand User Store
               updateUser({ 
                 rolePosition: extractedRole,
                 roleReport: data.report,
                 skillLevel
               });
            }
          } catch (e) {
            console.error("Failed to save profile to DB", e);
          }
        }
      } else {
        setReport("生成失败，未获取到角色定位。");
        setRoleName("未知角色");
      }
    } catch (e) {
      setReport("网络错误，导致 AI 无法生成角色定位。");
      setRoleName("未知角色");
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
            {(field.options || []).map(opt => (
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
          {(field.options || []).map(opt => {
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
              <DialogDescription className="text-base">填写这些信息，AI 将构建专属于你的学习角色（3-5分钟）。</DialogDescription>
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
                  <Button variant="ghost" onClick={() => setStep(3)} className="rounded-lg font-bold">返回</Button>
                  <Button onClick={handleGenerateRole} className="rounded-lg font-bold shadow-lg shadow-primary/20">
                    <Sparkles className="mr-2 w-4 h-4" /> 重新生成角色
                  </Button>
                </>
              ) : (
                <Button onClick={handleGenerateRole} className="h-12 px-10 rounded-lg font-bold shadow-lg shadow-primary/20">
                  提交并生成角色
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: AI Result (Onboarding Only) */}
        {step === 3 && (
          <div className="flex flex-col max-h-[90vh] p-6 sm:p-8 animate-in slide-in-from-bottom duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">正在分析你的特质...</h3>
                <p className="text-muted-foreground animate-pulse text-lg">AI 助手正在为你匹配专属学习角色</p>
              </div>
            ) : (
              <div className="flex flex-col w-full items-center justify-start pt-6 space-y-6">
                <DialogHeader className="mb-2 shrink-0">
                  <DialogTitle className="text-3xl font-black text-center flex items-center justify-center gap-3 tracking-tight">
                    <BrainCircuit className="w-8 h-8 text-primary" />
                    你的专属角色
                  </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="w-full flex-1 max-w-3xl">
                  <div className="w-full bg-primary/5 rounded-2xl p-6 sm:p-8 border border-primary/20 shadow-inner flex flex-col items-center text-center">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary mb-6">{roleName}</h2>
                    <div className="w-full prose prose-slate dark:prose-invert prose-p:leading-relaxed text-foreground/80 max-w-none text-left p-2 sm:p-4 text-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {report.replace(new RegExp(`【角色定位】[:：]\\s*${roleName}`), '')}
                      </ReactMarkdown>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex justify-center shrink-0 w-full pt-2 gap-4">
                  {mode === "settings" ? (
                    <>
                      <Button variant="outline" onClick={() => setStep(2)} className="h-14 w-full max-w-[200px] rounded-xl font-bold text-lg">
                        重新定位
                      </Button>
                      <Button onClick={onClose} className="h-14 w-full max-w-[200px] rounded-xl font-black text-xl shadow-xl shadow-primary/20">
                        确认
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setStep(4)} className="h-14 w-full max-w-sm rounded-xl font-black text-xl shadow-xl shadow-primary/20">
                      开启学习之旅 <Sparkles className="ml-2 w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Step 4: Course Selection */}
        {step === 4 && (
          <CourseSelection onStart={(stageId) => {
             useUserStore.getState().setSelectedCourseId(stageId);
             onComplete();
          }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

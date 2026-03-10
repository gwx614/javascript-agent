"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { cn } from "@/lib/utils";
import { AiAssistant } from "@/components/chat";
import { Loader2 } from "lucide-react";
import { LearningProfileModal } from "@/components/LearningProfileModal";
import { LearningSidebar } from "@/components/learning/LearningSidebar";
import { LearningContent } from "@/components/learning/LearningContent";
import { AssessmentForm } from "@/components/learning/AssessmentForm";
import { PostCourseAssessmentForm } from "@/components/learning/PostCourseAssessmentForm";
import { useUIStore } from "@/store/useUIStore";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { STAGES } from "@/lib/courseConfig";

export default function ChatPage() {
  const router = useRouter();

  const user = useUserStore(state => state.user);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const hasOnboarded = useUserStore(state => state.hasOnboarded);
  const setOnboarded = useUserStore(state => state.setOnboarded);
  const hasHydrated = useUserStore(state => state._hasHydrated);
  const hasCompletedCourse = useUserStore(state => state.hasCompletedCourse);
  const finalReport = useUserStore(state => state.finalReport);
  const isStageAssessed = useUserStore(state => state.isStageAssessed);
  
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);
  const setCurrentStage = useUIStore(state => state.setCurrentStage);

  const selectedCourseId = useUserStore(state => state.selectedCourseId);
  const diagnosisReport = useUserStore(state => state.diagnosisReport);
  
  // 使用阶段特定的评估状态
  const stageAssessed = useUserStore(state => state.isStageAssessed(state.selectedCourseId));
  const sectionsLoaded = useLearningStore(state => 
    selectedCourseId ? state.getStageState(selectedCourseId).sections.length > 0 : false);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: user ? {
        "x-user-data": encodeURIComponent(JSON.stringify(user))
      } : undefined
    })
  });

  // 验证登录状态
  useEffect(() => {
    // 只有在 hydration 完成后才进行跳转判断
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const [showModal, setShowModal] = useState(false);
  const [showCourseSelectionModal, setShowCourseSelectionModal] = useState(false);

  // 初始化时，如果没走过 onboarding，就弹出弹窗
  useEffect(() => {
    if (hasHydrated && !hasOnboarded && isAuthenticated) {
       setShowModal(true);
    }
  }, [hasHydrated, hasOnboarded, isAuthenticated]);

  const handleOnboardingComplete = () => {
    setOnboarded(true);
    // 重置当前阶段的评估状态
    if (selectedCourseId) {
      useUserStore.getState().setStageAssessed(selectedCourseId, false);
    }
    setShowModal(false);
  };

  const handleCourseSelectionComplete = () => {
    setShowCourseSelectionModal(false);
    // 选完课后，清理之前的结课状态
    useUserStore.getState().setHasCompletedCourse(false);
    useUserStore.getState().setFinalReport(null);
    // 不需要重置所有状态，因为现在每个阶段都有独立的状态
    // 强制触发重新生成大纲（通过 store 变更触发页面的 useEffect）
  };

  // 强制同步后台进度的逻辑
  useEffect(() => {
    const syncStage = async () => {
      if (!hasHydrated || !isAuthenticated || !user?.username || !selectedCourseId) return;
      
      try {
        const res = await fetch("/api/user/sync-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            courseId: selectedCourseId
          })
        });
        const data = await res.json();
        if (data && !data.error) {
          // 同步用户基础状态（是否已评估、报告等）
          useUserStore.getState().syncWithBackend(selectedCourseId, data);
          
          // 如果有大纲和教程内容，也一并同步到学习存储
          if (data.learningOutline) {
            const contentsMap: Record<string, string> = {};
            (data.sectionContents || []).forEach((sc: any) => {
              contentsMap[sc.sectionId] = sc.content;
            });
            useLearningStore.getState().syncData(selectedCourseId, data.learningOutline, contentsMap);
          }
        }
      } catch (e) {
        console.error("Failed to sync stage with backend", e);
      }
    };

    syncStage();
  }, [hasHydrated, isAuthenticated, user?.username, selectedCourseId]);

  // 进入学习区后自动加载大纲 (保留此逻辑作为兜底，但现在主要靠 syncStage)
  useEffect(() => {
    if (!stageAssessed || !user?.username || !selectedCourseId || sectionsLoaded) return;

    // 更新侧边栏标题
    const stage = STAGES.find(s => s.id === selectedCourseId);
    if (stage) setCurrentStage(stage.title);

    async function loadOutline() {
      if (!selectedCourseId) return;
      
      useLearningStore.getState().setLoadingOutline(selectedCourseId, true);
      try {
        const res = await fetch("/api/learning/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user?.username,
            selectedCourseId,
            diagnosisReport,
          }),
        });
        const data = await res.json();
        if (data.sections) {
          useLearningStore.getState().setSections(selectedCourseId, data.sections);
        }
      } catch (err) {
        console.error("Failed to load outline", err);
      } finally {
        useLearningStore.getState().setLoadingOutline(selectedCourseId, false);
      }
    }
    loadOutline();
  }, [stageAssessed, user, selectedCourseId, sectionsLoaded, diagnosisReport, setCurrentStage]);
  // 是否正在加载（submitted 或 streaming 状态）
  const isBusy = status === "submitted" || status === "streaming";
  // 仅在已提交但尚未开始流式返回时处于“思考中”状态
  const isThinking = status === "submitted";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  // 如果还没加载完成或未鉴权，显示加载状态
  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 主渲染区域根据 stageAssessed 决定中间部分是 摸底问卷 还是 正常学习区
  // 但整个页面大框架始终是被保留的，并且需要渲染 Modal 大弹框
  return (
    <div className="flex h-[calc(100vh-73px)] w-full overflow-hidden bg-background">
      {/* 弹窗层：如果 showModal 为真，一直覆盖在最上层 */}
      {showModal && (
        <LearningProfileModal 
          mode="onboarding" 
          onComplete={handleOnboardingComplete} 
        />
      )}

      {showCourseSelectionModal && (
        <LearningProfileModal 
          mode="course-selection" 
          onComplete={handleCourseSelectionComplete} 
          onClose={() => setShowCourseSelectionModal(false)}
        />
      )}

      {/* ========== 左中：根据状态切换 ========== */}
      {hasCompletedCourse ? (
        <PostCourseAssessmentForm onSelectNextCourse={() => setShowCourseSelectionModal(true)} />
      ) : hasOnboarded && !stageAssessed ? (
         <AssessmentForm />
      ) : (
         <>
           <LearningSidebar />
           <LearningContent />
         </>
      )}
  
      {/* ========== 右侧：AI 助教聊天 ========== */}
      <AiAssistant
        messages={messages}
        isThinking={isThinking}
        isBusy={isBusy}
        onSend={handleSend}
        onStop={stop}
        className={cn(
          "hidden lg:flex border-l border-border transition-[width,max-width] duration-300 ease-in-out shrink-0 overflow-hidden",
          isSidebarOpen 
            ? "w-[35%] max-w-[448px]" 
            : "w-[45%] max-w-full"
        )}
      />
    </div>
  );
}

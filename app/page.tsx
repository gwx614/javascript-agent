"use client";

import { useAppOrchestration } from "@/hooks/useAppOrchestration";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useStageSync } from "@/hooks/useStageSync";
import { useLearningOutline } from "@/hooks/useLearningOutline";
import { cn } from "@/lib/utils";
import { AiAssistant } from "@/components/chat";
import { Loader2 } from "lucide-react";
import { LearningProfileModal } from "@/components/learning/LearningProfileModal";
import { LearningSidebar } from "@/components/learning/LearningSidebar";
import { LearningContent } from "@/components/learning/LearningContent";
import { AssessmentForm } from "@/components/learning/AssessmentForm";
import { PostCourseAssessmentForm } from "@/components/learning/PostCourseAssessmentForm";
import { useUIStore } from "@/store/useUIStore";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";
import { STAGES } from "@/lib/config";

export default function ChatPage() {
  const user = useUserStore((state) => state.user);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const hasOnboarded = useUserStore((state) => state.hasOnboarded);
  const setOnboarded = useUserStore((state) => state.setOnboarded);
  const hasHydrated = useUserStore((state) => state._hasHydrated);
  const hasCompletedCourse = useUserStore((state) => state.hasCompletedCourse);
  const finalReport = useUserStore((state) => state.finalReport);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  const selectedCourseId = useUserStore((state) => state.selectedCourseId);
  const diagnosisReport = useUserStore((state) => state.diagnosisReport);

  // 使用阶段特定的评估状态
  const stageAssessed = useUserStore((state) => state.isStageAssessed(state.selectedCourseId));
  const sectionsLoaded = useLearningStore((state) =>
    selectedCourseId ? state.getStageState(selectedCourseId).sections.length > 0 : false
  );

  const { messages, isThinking, isBusy, handleSend, stop } = useAgentChat(user);

  const {
    showModal,
    showCourseSelectionModal,
    setShowCourseSelectionModal,
    handleOnboardingComplete,
    handleCourseSelectionComplete,
  } = useAppOrchestration(hasHydrated, isAuthenticated, hasOnboarded, selectedCourseId);

  // 强制同步后台进度的逻辑
  useStageSync(hasHydrated, isAuthenticated, user?.username, selectedCourseId);

  // 进入学习区后自动加载大纲 (保留此逻辑作为兜底，但现在主要靠 syncStage)
  useLearningOutline(
    stageAssessed,
    user?.username,
    selectedCourseId,
    sectionsLoaded,
    diagnosisReport
  );

  // 如果还没加载完成或未鉴权，显示加载状态
  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 主渲染区域根据 stageAssessed 决定中间部分是 摸底问卷 还是 正常学习区
  // 但整个页面大框架始终是被保留的，并且需要渲染 Modal 大弹框
  return (
    <div className="flex h-[calc(100vh-73px)] w-full overflow-hidden bg-background">
      {/* 弹窗层：如果 showModal 为真，一直覆盖在最上层 */}
      {showModal && (
        <LearningProfileModal mode="onboarding" onComplete={handleOnboardingComplete} />
      )}

      {showCourseSelectionModal && (
        <LearningProfileModal
          mode="course-selection"
          onComplete={handleCourseSelectionComplete}
          onClose={() => setShowCourseSelectionModal(false)}
        />
      )}

      {/* ========== 左中：根据状态切换 ========== */}
      {finalReport ? (
        <PostCourseAssessmentForm onSelectNextCourse={() => setShowCourseSelectionModal(true)} />
      ) : hasCompletedCourse ? (
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
          "hidden shrink-0 overflow-hidden border-l border-border transition-[width,max-width] duration-300 ease-in-out lg:flex",
          isSidebarOpen ? "w-[35%] max-w-[448px]" : "w-[45%] max-w-full"
        )}
      />
    </div>
  );
}

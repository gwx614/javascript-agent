import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";

export function useAppOrchestration(
  hasHydrated: boolean,
  isAuthenticated: boolean,
  hasOnboarded: boolean,
  selectedCourseId: string | null
) {
  const router = useRouter();
  const setOnboarded = useUserStore((state) => state.setOnboarded);

  const [showModal, setShowModal] = useState(false);
  const [showCourseSelectionModal, setShowCourseSelectionModal] = useState(false);

  // 验证登录状态
  useEffect(() => {
    // 只有在 hydration 完成后才进行跳转判断
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

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
  };

  return {
    showModal,
    showCourseSelectionModal,
    setShowCourseSelectionModal,
    handleOnboardingComplete,
    handleCourseSelectionComplete,
  };
}

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useLearningStore } from "@/store/useLearningStore";

export function useStageSync(
  hasHydrated: boolean,
  isAuthenticated: boolean,
  username: string | undefined,
  selectedCourseId: string | null
) {
  useEffect(() => {
    let ignore = false;

    const syncStage = async () => {
      if (!hasHydrated || !isAuthenticated || !username || !selectedCourseId) return;

      try {
        const res = await fetch("/api/user/sync-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            courseId: selectedCourseId,
          }),
        });
        const data = await res.json();

        if (!ignore && data && !data.error) {
          // 同步用户基础状态（是否已评估、报告等）
          useUserStore.getState().syncWithBackend(selectedCourseId, data);

          // 如果有大纲和教程内容，也一并同步到学习存储
          if (data.learningOutline) {
            const contentsMap: Record<string, string> = {};
            (data.sectionContents || []).forEach((sc: any) => {
              contentsMap[sc.sectionId] = sc.content;
            });
            useLearningStore
              .getState()
              .syncData(selectedCourseId, data.learningOutline, contentsMap);
          } else {
            // 如果云端并不存在该阶段的大纲，强制清除本地废弃缓存
            useLearningStore.getState().resetStage(selectedCourseId);
          }
        }
      } catch (e) {
        if (!ignore) {
          console.error("Failed to sync stage with backend", e);
        }
      }
    };

    syncStage();

    return () => {
      ignore = true;
    };
  }, [hasHydrated, isAuthenticated, username, selectedCourseId]);
}

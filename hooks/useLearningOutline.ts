import { useEffect } from "react";
import { useLearningStore } from "@/store/useLearningStore";

export function useLearningOutline(
  stageAssessed: boolean,
  username: string | undefined,
  selectedCourseId: string | null,
  sectionsLoaded: boolean,
  diagnosisReport: any
) {
  useEffect(() => {
    let ignore = false;

    if (!stageAssessed || !username || !selectedCourseId || sectionsLoaded) return;

    async function loadOutline() {
      if (!selectedCourseId) return;

      useLearningStore.getState().setLoadingOutline(selectedCourseId, true);
      try {
        const res = await fetch("/api/learning/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            selectedCourseId,
            diagnosisReport,
          }),
        });
        const data = await res.json();
        if (!ignore && data.sections) {
          useLearningStore.getState().setSections(selectedCourseId, data.sections);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load outline", err);
        }
      } finally {
        if (!ignore) {
          useLearningStore.getState().setLoadingOutline(selectedCourseId, false);
        }
      }
    }
    loadOutline();

    return () => {
      ignore = true;
    };
  }, [stageAssessed, username, selectedCourseId, sectionsLoaded, diagnosisReport]);
}

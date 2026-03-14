import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile, DiagnosisReport } from "@/types";
import { useLearningStore } from "./useLearningStore";

export interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  selectedCourseId: string | null;
  diagnosisReport: DiagnosisReport | null;
  hasCompletedCourse: boolean;
  finalReport: any | null;
  _hasHydrated: boolean;
  // 阶段特定的评估状态: courseId -> boolean
  stageAssessed: Record<string, boolean>;
  // 阶段特定的原始状态枚举: courseId -> status string
  courseStatus: Record<string, string>;
  login: (user: UserProfile) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  setOnboarded: (status: boolean) => void;
  setSelectedCourseId: (id: string | null) => void;
  setDiagnosisReport: (report: DiagnosisReport | null) => void;
  setHasCompletedCourse: (status: boolean) => void;
  setFinalReport: (report: any | null) => void;
  setHasHydrated: (state: boolean) => void;
  // 阶段特定的评估状态管理
  setStageAssessed: (courseId: string, assessed: boolean) => void;
  setCourseStatus: (courseId: string, status: string) => void;
  isStageAssessed: (courseId: string | null) => boolean;
  // 用于一键同步后台状态
  syncWithBackend: (courseId: string, data: any) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasOnboarded: false,
      selectedCourseId: null,
      diagnosisReport: null,
      hasCompletedCourse: false,
      finalReport: null,
      _hasHydrated: false,
      stageAssessed: {},
      courseStatus: {},
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        // 清空学习数据缓存，防止多用户串台泄露
        useLearningStore.getState().resetAll();
        set({
          user: null,
          isAuthenticated: false,
          hasOnboarded: false,
          selectedCourseId: null,
          diagnosisReport: null,
          hasCompletedCourse: false,
          finalReport: null,
          stageAssessed: {},
          courseStatus: {},
        });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setOnboarded: (status) => set({ hasOnboarded: status }),
      setSelectedCourseId: (id) =>
        set({
          selectedCourseId: id,
          // 关键修复：当课程阶段切换时，必须即刻清空属于上一个阶段的各类专属全局临时报告，
          // 防止前端挂载太快而把 A 阶段的报告错误丢给 B 阶段的页面进而产生跨阶段污染。
          diagnosisReport: null,
          finalReport: null,
          hasCompletedCourse: false,
        }),
      setDiagnosisReport: (report) => set({ diagnosisReport: report }),
      setHasCompletedCourse: (status) => set({ hasCompletedCourse: status }),
      setFinalReport: (report) => set({ finalReport: report }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setStageAssessed: (courseId, assessed) =>
        set((state) => ({
          stageAssessed: {
            ...state.stageAssessed,
            [courseId]: assessed,
          },
        })),
      isStageAssessed: (courseId) => {
        if (!courseId) return false;
        return get().stageAssessed[courseId] || false;
      },
      setCourseStatus: (courseId, status) =>
        set((state) => ({
          courseStatus: {
            ...state.courseStatus,
            [courseId]: status,
          },
        })),
      syncWithBackend: (courseId, data) => {
        if (!data || !courseId) return;
        // 根据后端状态判断该阶段是否已完成摸底流程并进入了学习区
        // 修复：不能只排斥 PRE_ASSESSMENT。如果用户正停留在看诊断报告（PRE_REPORT），
        // 他在前端也不应该进入左侧大纲区（因为还没点"开始学习"）。
        // 因此只有在明确离开 PRE_REPORT 之后才算 "Assessed=true" 并放行到大纲区。
        const isAssessed = !["PRE_ASSESSMENT", "PRE_REPORT"].includes(data.status);
        set({
          stageAssessed: {
            ...get().stageAssessed,
            [courseId]: isAssessed,
          },
          diagnosisReport: data.preReport,
          hasCompletedCourse: ["POST_ASSESSMENT", "POST_REPORT", "COMPLETED"].includes(data.status),
          finalReport: data.postReport,
          courseStatus: {
            ...get().courseStatus,
            [courseId]: data.status,
          },
        });
      },
    }),
    {
      name: "user-storage", // key in localStorage
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

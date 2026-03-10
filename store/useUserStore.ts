import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, DiagnosisReport } from '@/types';

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
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, hasOnboarded: false, selectedCourseId: null, diagnosisReport: null, hasCompletedCourse: false, finalReport: null, stageAssessed: {} }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      setOnboarded: (status) => set({ hasOnboarded: status }),
      setSelectedCourseId: (id) => set({ selectedCourseId: id }),
      setDiagnosisReport: (report) => set({ diagnosisReport: report }),
      setHasCompletedCourse: (status) => set({ hasCompletedCourse: status }),
      setFinalReport: (report) => set({ finalReport: report }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setStageAssessed: (courseId, assessed) => set((state) => ({
        stageAssessed: {
          ...state.stageAssessed,
          [courseId]: assessed
        }
      })),
      isStageAssessed: (courseId) => {
        if (!courseId) return false;
        return get().stageAssessed[courseId] || false;
      },
      syncWithBackend: (courseId, data) => {
        if (!data || !courseId) return;
        // 根据后端状态判断该阶段是否已完成摸底
        // PRE_ASSESSMENT = 未完成摸底, 其他状态 = 已完成摸底
        const isAssessed = data.status !== "PRE_ASSESSMENT";
        set({
          stageAssessed: {
            ...get().stageAssessed,
            [courseId]: isAssessed
          },
          diagnosisReport: data.preReport,
          hasCompletedCourse: ["POST_ASSESSMENT", "POST_REPORT", "COMPLETED"].includes(data.status),
          finalReport: data.postReport,
        });
      }
    }),
    {
      name: 'user-storage', // key in localStorage
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

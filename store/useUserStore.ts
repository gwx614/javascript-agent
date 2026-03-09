import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, DiagnosisReport } from '@/types';

export interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  hasAssessed: boolean;
  selectedCourseId: string | null;
  diagnosisReport: DiagnosisReport | null;
  _hasHydrated: boolean;
  login: (user: UserProfile) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  setOnboarded: (status: boolean) => void;
  setHasAssessed: (status: boolean) => void;
  setSelectedCourseId: (id: string | null) => void;
  setDiagnosisReport: (report: DiagnosisReport | null) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasOnboarded: false,
      hasAssessed: false,
      selectedCourseId: null,
      diagnosisReport: null,
      _hasHydrated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, hasOnboarded: false, hasAssessed: false, selectedCourseId: null, diagnosisReport: null }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      setOnboarded: (status) => set({ hasOnboarded: status }),
      setHasAssessed: (status) => set({ hasAssessed: status }),
      setSelectedCourseId: (id) => set({ selectedCourseId: id }),
      setDiagnosisReport: (report) => set({ diagnosisReport: report }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'user-storage', // key in localStorage
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UIState {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  currentStage: string;
  setCurrentStage: (stage: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      currentStage: "基础语法",
      setCurrentStage: (stage) => set({ currentStage: stage }),
    }),
    {
      name: "ui-storage", // 存储在 localStorage 中的 key
    }
  )
);

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface SubSection {
  id: string;
  title: string;
  description: string;
  status: "skip" | "reinforce" | "learn";
}

export interface LearningSection {
  id: string;
  title: string;
  description: string;
  status: "skip" | "reinforce" | "learn";
  children: SubSection[];
}

export interface StageState {
  sections: LearningSection[];
  activeSectionId: string | null;
  sectionContents: Record<string, string>; // id → markdown cache
  loadingOutline: boolean;
  loadingContent: boolean;
  lastUpdated: number; // 最后更新时间戳，用于缓存过期判断
}

export interface LearningState {
  currentStageId: string | null;
  stageStates: Record<string, StageState>; // stageId → StageState
  setCurrentStageId: (stageId: string | null) => void;
  setSections: (stageId: string, sections: LearningSection[]) => void;
  setActiveSectionId: (stageId: string, id: string | null) => void;
  setSectionContent: (stageId: string, id: string, content: string) => void;
  setLoadingOutline: (stageId: string, loading: boolean) => void;
  setLoadingContent: (stageId: string, loading: boolean) => void;
  syncData: (
    stageId: string,
    sections: LearningSection[],
    contents: Record<string, string>
  ) => void;
  resetStage: (stageId: string) => void;
  resetAll: () => void;
  getStageState: (stageId: string) => StageState;
  preloadStage: (stageId: string) => void; // 预加载阶段数据
  clearExpiredCache: () => void; // 清理过期缓存
}

const createDefaultStageState = (): StageState => ({
  sections: [],
  activeSectionId: null,
  sectionContents: {},
  loadingOutline: false,
  loadingContent: false,
  lastUpdated: Date.now(),
});

// 缓存过期时间（毫秒）
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7天

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      currentStageId: null,
      stageStates: {},
      setCurrentStageId: (stageId) => set({ currentStageId: stageId }),
      setSections: (stageId, sections) =>
        set((state) => ({
          stageStates: {
            ...state.stageStates,
            [stageId]: {
              ...(state.stageStates[stageId] || createDefaultStageState()),
              sections,
              lastUpdated: Date.now(),
            },
          },
        })),
      setActiveSectionId: (stageId, id) =>
        set((state) => ({
          stageStates: {
            ...state.stageStates,
            [stageId]: {
              ...(state.stageStates[stageId] || createDefaultStageState()),
              activeSectionId: id,
              lastUpdated: Date.now(),
            },
          },
        })),
      setSectionContent: (stageId, id, content) =>
        set((state) => ({
          stageStates: {
            ...state.stageStates,
            [stageId]: {
              ...(state.stageStates[stageId] || createDefaultStageState()),
              sectionContents: {
                ...(state.stageStates[stageId] || createDefaultStageState()).sectionContents,
                [id]: content,
              },
              lastUpdated: Date.now(),
            },
          },
        })),
      setLoadingOutline: (stageId, loading) =>
        set((state) => ({
          stageStates: {
            ...state.stageStates,
            [stageId]: {
              ...(state.stageStates[stageId] || createDefaultStageState()),
              loadingOutline: loading,
            },
          },
        })),
      setLoadingContent: (stageId, loading) =>
        set((state) => ({
          stageStates: {
            ...state.stageStates,
            [stageId]: {
              ...(state.stageStates[stageId] || createDefaultStageState()),
              loadingContent: loading,
            },
          },
        })),
      syncData: (stageId, sections, contents) =>
        set((state) => ({
          stageStates: {
            ...state.stageStates,
            [stageId]: {
              ...(state.stageStates[stageId] || createDefaultStageState()),
              sections,
              sectionContents: contents,
              loadingOutline: false,
              lastUpdated: Date.now(),
            },
          },
        })),
      resetStage: (stageId) =>
        set((state) => {
          const newStageStates = { ...state.stageStates };
          delete newStageStates[stageId];
          return { stageStates: newStageStates };
        }),
      resetAll: () =>
        set({
          currentStageId: null,
          stageStates: {},
        }),
      getStageState: (stageId) => {
        const state = get();
        const stageState = state.stageStates[stageId];

        // 检查缓存是否过期
        if (stageState && Date.now() - stageState.lastUpdated > CACHE_EXPIRY_TIME) {
          // 缓存过期，返回默认状态
          return createDefaultStageState();
        }

        return stageState || createDefaultStageState();
      },
      preloadStage: (stageId) => {
        // 预加载阶段数据的逻辑可以在这里实现
        // 例如，提前从服务器获取大纲和内容
        console.log(`Preloading stage: ${stageId}`);
      },
      clearExpiredCache: () => {
        set((state) => {
          const now = Date.now();
          const newStageStates: Record<string, StageState> = {};

          // 只保留未过期的缓存
          Object.entries(state.stageStates).forEach(([stageId, stageState]) => {
            if (now - stageState.lastUpdated <= CACHE_EXPIRY_TIME) {
              newStageStates[stageId] = stageState;
            }
          });

          return { stageStates: newStageStates };
        });
      },
    }),
    {
      name: "learning-store", // 存储名称
      storage: createJSONStorage(() => localStorage), // 使用localStorage存储
      partialize: (state) => ({
        stageStates: state.stageStates,
        currentStageId: state.currentStageId,
      }), // 只存储必要的数据
    }
  )
);

import { create } from "zustand";

export interface LearningSection {
  id: string;
  title: string;
  description: string;
  status: "skip" | "reinforce" | "learn";
}

export interface LearningState {
  sections: LearningSection[];
  activeSectionId: string | null;
  sectionContents: Record<string, string>; // id → markdown cache
  loadingOutline: boolean;
  loadingContent: boolean;
  setSections: (sections: LearningSection[]) => void;
  setActiveSectionId: (id: string | null) => void;
  setSectionContent: (id: string, content: string) => void;
  setLoadingOutline: (loading: boolean) => void;
  setLoadingContent: (loading: boolean) => void;
  reset: () => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  sections: [],
  activeSectionId: null,
  sectionContents: {},
  loadingOutline: false,
  loadingContent: false,
  setSections: (sections) => set({ sections }),
  setActiveSectionId: (id) => set({ activeSectionId: id }),
  setSectionContent: (id, content) =>
    set((state) => ({
      sectionContents: { ...state.sectionContents, [id]: content },
    })),
  setLoadingOutline: (loading) => set({ loadingOutline: loading }),
  setLoadingContent: (loading) => set({ loadingContent: loading }),
  reset: () =>
    set({
      sections: [],
      activeSectionId: null,
      sectionContents: {},
      loadingOutline: false,
      loadingContent: false,
    }),
}));

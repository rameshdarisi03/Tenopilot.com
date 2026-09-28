import { create } from "zustand";

interface AiCopilotStore {
  isOpen: boolean;
  initialQuery: string;
  autoStartMic: boolean;
  openCopilot: (query?: string, startMic?: boolean) => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
}

export const useAiCopilotStore = create<AiCopilotStore>((set) => ({
  isOpen: false,
  initialQuery: "",
  autoStartMic: false,
  openCopilot: (query = "", startMic = false) =>
    set({ isOpen: true, initialQuery: query, autoStartMic: startMic }),
  closeCopilot: () => set({ isOpen: false, initialQuery: "", autoStartMic: false }),
  toggleCopilot: () =>
    set((state) => ({ isOpen: !state.isOpen, initialQuery: "", autoStartMic: false })),
}));

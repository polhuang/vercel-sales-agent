import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  detailPanelOpen: boolean;
  detailPanelRecordId: string | null;
  chatbotOpen: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  openDetailPanel: (recordId: string) => void;
  closeDetailPanel: () => void;
  toggleChatbot: () => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  detailPanelOpen: false,
  detailPanelRecordId: null,
  chatbotOpen: false,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openDetailPanel: (recordId) =>
    set({ detailPanelOpen: true, detailPanelRecordId: recordId }),
  closeDetailPanel: () =>
    set({ detailPanelOpen: false, detailPanelRecordId: null }),
  toggleChatbot: () => set((s) => ({ chatbotOpen: !s.chatbotOpen })),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}));

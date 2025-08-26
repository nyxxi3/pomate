import { create } from "zustand";

export const useMobileSidebarStore = create((set) => ({
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
}));


import { create } from "zustand";

export const useZoomStore = create((set, get) => ({
  // Zoom state
  isZoomed: false,
  zoomType: null, // 'solo' | 'room' | null
  
  // Actions
  enterZoom: (type) => {
    set({ isZoomed: true, zoomType: type });
    // Prevent body scroll when zoomed
    document.body.style.overflow = 'hidden';
  },
  
  exitZoom: () => {
    set({ isZoomed: false, zoomType: null });
    // Restore body scroll
    document.body.style.overflow = 'unset';
  },
  
  toggleZoom: (type) => {
    const { isZoomed, zoomType } = get();
    if (isZoomed && zoomType === type) {
      get().exitZoom();
    } else {
      get().enterZoom(type);
    }
  }
}));



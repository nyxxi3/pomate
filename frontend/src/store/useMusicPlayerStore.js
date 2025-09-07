import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMusicPlayerStore = create(
  persist(
    (set, get) => ({
      // Music player state
      youtubeUrl: "",
      embedUrl: "",
      error: "",
      isLoading: false,
      isLooping: false,
      isMinimized: false,
      showFavorites: false,
      newFavoriteName: "",
      isLoadingFavorites: false,
      favorites: [],
      
      // Timer integration settings
      autoPlayOnSessionStart: false,
      stopMusicOnSessionEnd: false,
      sessionEndMusicBehavior: 'pause', // 'stop' or 'pause'
      pauseMusicOnTimerPause: false,
      
      // Actions
      setYoutubeUrl: (url) => set({ youtubeUrl: url }),
      setEmbedUrl: (url) => set({ embedUrl: url }),
      setError: (error) => set({ error }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsLooping: (looping) => set({ isLooping: looping }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized }),
      setShowFavorites: (show) => set({ showFavorites: show }),
      setNewFavoriteName: (name) => set({ newFavoriteName: name }),
      setIsLoadingFavorites: (loading) => set({ isLoadingFavorites: loading }),
      setFavorites: (favorites) => set({ favorites }),
      
      // Timer integration actions
      setAutoPlayOnSessionStart: (enabled) => set({ autoPlayOnSessionStart: enabled }),
      setStopMusicOnSessionEnd: (enabled) => set({ stopMusicOnSessionEnd: enabled }),
      setSessionEndMusicBehavior: (behavior) => set({ sessionEndMusicBehavior: behavior }),
      setPauseMusicOnTimerPause: (enabled) => set({ pauseMusicOnTimerPause: enabled }),
      
      // Clear all music state
      clearMusic: () => set({
        youtubeUrl: "",
        embedUrl: "",
        error: "",
        isLoading: false,
        isLooping: false,
        isMinimized: false,
        showFavorites: false,
        newFavoriteName: "",
        isLoadingFavorites: false,
        favorites: [],
        // Keep timer integration settings when clearing music
      }),
      
      // Load music from URL
      loadMusic: (url, isLooping = false) => {
        const videoId = extractVideoId(url);
        const playlistId = extractPlaylistId(url);
        
        if (playlistId) {
          const embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&enablejsapi=1&origin=${window.location.origin}${isLooping ? '&loop=1' : ''}`;
          set({ youtubeUrl: url, embedUrl, error: "" });
        } else if (videoId) {
          const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}${isLooping ? '&loop=1&playlist=' + videoId : ''}`;
          set({ youtubeUrl: url, embedUrl, error: "" });
        } else {
          set({ error: "Please enter a valid YouTube video or playlist URL." });
        }
      },
      
      // Toggle loop
      toggleLoop: () => {
        const { isLooping, youtubeUrl, embedUrl } = get();
        const newLooping = !isLooping;
        
        if (embedUrl && youtubeUrl) {
          const videoId = extractVideoId(youtubeUrl);
          const playlistId = extractPlaylistId(youtubeUrl);
          
          if (playlistId) {
            const newEmbedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&enablejsapi=1&origin=${window.location.origin}${newLooping ? '&loop=1' : ''}`;
            set({ isLooping: newLooping, embedUrl: newEmbedUrl });
          } else if (videoId) {
            const newEmbedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}${newLooping ? '&loop=1&playlist=' + videoId : ''}`;
            set({ isLooping: newLooping, embedUrl: newEmbedUrl });
          }
        } else {
          set({ isLooping: newLooping });
        }
      },
      
      // Add favorite
      addFavorite: (favorite) => {
        const { favorites } = get();
        set({ favorites: [...favorites, favorite], newFavoriteName: "" });
      },
      
      // Remove favorite
      removeFavorite: (favoriteId) => {
        const { favorites } = get();
        set({ favorites: favorites.filter(fav => fav._id !== favoriteId) });
      },
      
      // Load favorite
      loadFavorite: (favorite) => {
        const { isLooping } = get();
        get().loadMusic(favorite.url, isLooping);
      },
    }),
    {
      name: 'music-player-storage',
      partialize: (state) => ({
        youtubeUrl: state.youtubeUrl,
        embedUrl: state.embedUrl,
        isLooping: state.isLooping,
        isMinimized: state.isMinimized,
        showFavorites: state.showFavorites,
        favorites: state.favorites,
        autoPlayOnSessionStart: state.autoPlayOnSessionStart,
        stopMusicOnSessionEnd: state.stopMusicOnSessionEnd,
        sessionEndMusicBehavior: state.sessionEndMusicBehavior,
        pauseMusicOnTimerPause: state.pauseMusicOnTimerPause,
      }),
    }
  )
);

// Helper functions
const extractVideoId = (url) => {
  const videoRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(videoRegex);
  return match ? match[1] : null;
};

const extractPlaylistId = (url) => {
  const playlistRegex = /youtube\.com\/playlist\?list=([^&\n?#]+)/;
  const match = url.match(playlistRegex);
  return match ? match[1] : null;
};

export default useMusicPlayerStore;

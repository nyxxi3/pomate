import { useEffect, useState, useRef, memo } from "react";
import { AlertCircle, Play, X, RotateCcw, Heart, Trash2, Move, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getFavorites, addFavorite, deleteFavorite } from "../lib/favoritesApi";
import useMusicPlayerStore from "../store/useMusicPlayerStore";

const MusicPlayer = memo(({ colorToken = "primary" }) => {
  const { authUser } = useAuthStore();
  const location = useLocation();
  const { isMinimized, setIsMinimized } = useMusicPlayerStore();
  const playerRef = useRef(null);
  const [isTimerIntegrationExpanded, setIsTimerIntegrationExpanded] = useState(false);
  
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  
  // Don't render anything if:
  // 1. User is not authenticated
  // 2. Player should be hidden (on auth pages)
  if (!authUser || isAuthPage) {
    return null;
  }

  // Get all state and actions from the global store
  const {
    youtubeUrl,
    embedUrl,
    error,
    isLoading,
    isLooping,
    showFavorites,
    newFavoriteName,
    isLoadingFavorites,
    favorites,
    autoPlayOnSessionStart,
    stopMusicOnSessionEnd,
    sessionEndMusicBehavior,
    pauseMusicOnTimerPause,
    setYoutubeUrl,
    setEmbedUrl,
    setError,
    setIsLoading,
    setIsLooping,
    setShowFavorites,
    setNewFavoriteName,
    setIsLoadingFavorites,
    setFavorites,
    setAutoPlayOnSessionStart,
    setStopMusicOnSessionEnd,
    setSessionEndMusicBehavior,
    setPauseMusicOnTimerPause,
    clearMusic,
    loadMusic,
    toggleLoop,
    addFavorite: addFavoriteToStore,
    removeFavorite: removeFavoriteFromStore,
    loadFavorite: loadFavoriteFromStore,
  } = useMusicPlayerStore();

  // Load favorites from database on component mount
  useEffect(() => {
    if (authUser?._id) {
      loadFavoritesFromDB();
    }
  }, [authUser?._id]);

  // Listen for timer-triggered music control events
  useEffect(() => {
    const handleMusicPlay = () => {
      if (embedUrl) {
        console.log('🎵 Timer triggered: Starting music');
        // Try multiple methods to ensure music plays
        const iframe = playerRef.current?.querySelector('iframe');
        if (iframe) {
          // Method 1: YouTube API command
          iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          
          // Method 2: Direct iframe click (fallback)
          setTimeout(() => {
            iframe.click();
          }, 100);
          
          // Method 3: Reload with autoplay parameter
          setTimeout(() => {
            const currentUrl = iframe.src;
            if (!currentUrl.includes('autoplay=1')) {
              const newUrl = currentUrl.includes('?') 
                ? `${currentUrl}&autoplay=1` 
                : `${currentUrl}?autoplay=1`;
              iframe.src = newUrl;
            }
          }, 200);
        }
      }
    };

    const handleMusicStop = () => {
      if (embedUrl) {
        console.log('🎵 Timer triggered: Stopping music (restart from beginning)');
        const iframe = playerRef.current?.querySelector('iframe');
        if (iframe) {
          // Method 1: YouTube API command to stop
          iframe.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
          
          // Method 2: Reload iframe to reset position (this will restart from beginning)
          setTimeout(() => {
            const currentUrl = iframe.src;
            // Remove autoplay and any timestamp parameters to ensure it starts from beginning
            let newUrl = currentUrl.replace('&autoplay=1', '').replace('?autoplay=1', '');
            newUrl = newUrl.replace(/&t=\d+/g, '').replace(/\?t=\d+/, '');
            
            if (newUrl !== currentUrl) {
              console.log('🎵 Reloading iframe to reset position:', newUrl);
              iframe.src = newUrl;
            }
          }, 200);
        }
      }
    };

    const handleMusicPause = () => {
      if (embedUrl) {
        console.log('🎵 Timer triggered: Pausing music (continue where left off)');
        // Only pause, do NOT reload iframe to preserve position
        const iframe = playerRef.current?.querySelector('iframe');
        if (iframe) {
          // Method 1: YouTube API command to pause
          iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          
          // Method 2: Try clicking the iframe as fallback (but don't reload)
          setTimeout(() => {
            iframe.click();
          }, 100);
          
          // Method 3: Try multiple pause commands with different formats
          setTimeout(() => {
            iframe.contentWindow?.postMessage(JSON.stringify({
              event: 'command',
              func: 'pauseVideo',
              args: ''
            }), '*');
          }, 200);
        }
      }
    };

    window.addEventListener('musicPlayer:play', handleMusicPlay);
    window.addEventListener('musicPlayer:stop', handleMusicStop);
    window.addEventListener('musicPlayer:pause', handleMusicPause);

    return () => {
      window.removeEventListener('musicPlayer:play', handleMusicPlay);
      window.removeEventListener('musicPlayer:stop', handleMusicStop);
      window.removeEventListener('musicPlayer:pause', handleMusicPause);
    };
  }, [embedUrl]);

  // Load favorites from database
  const loadFavoritesFromDB = async () => {
    if (!authUser?._id) return;
    
    try {
      setIsLoadingFavorites(true);
      const response = await getFavorites(authUser._id);
      setFavorites(response.data || []);
    } catch (error) {
      console.error("Failed to load favorites:", error);
      toast.error("Failed to load favorites");
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  // Validate and process YouTube URL
  const handleLoadVideo = () => {
    setError("");
    setIsLoading(true);

    // Trim whitespace
    const trimmedUrl = youtubeUrl.trim();
    
    if (!trimmedUrl) {
      setError("Please enter a YouTube URL.");
      setIsLoading(false);
      return;
    }

    // Use the store's loadMusic function
    loadMusic(trimmedUrl, isLooping);
    setIsLoading(false);
  };

  // Clear input and embed
  const handleClear = () => {
    clearMusic();
  };


  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLoadVideo();
    }
  };

  // Add current URL to favorites
  const addToFavorites = async () => {
    if (!authUser?._id) {
      toast.error("Please log in to save favorites");
      return;
    }

    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) {
      toast.error("No URL to save");
      return;
    }

    // Extract video/playlist ID for validation
    const videoRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const playlistRegex = /youtube\.com\/playlist\?list=([^&\n?#]+)/;
    const videoMatch = trimmedUrl.match(videoRegex);
    const playlistMatch = trimmedUrl.match(playlistRegex);
    
    if (!videoMatch && !playlistMatch) {
      toast.error("Invalid YouTube URL");
      return;
    }

    const name = newFavoriteName.trim() || `Favorite ${favorites.length + 1}`;

    try {
      console.log("Adding favorite:", { userId: authUser._id, name, url: trimmedUrl });
      const response = await addFavorite(authUser._id, name, trimmedUrl);
      console.log("Add favorite response:", response);
      addFavoriteToStore(response.data);
      toast.success("Added to favorites!");
    } catch (error) {
      console.error("Failed to add favorite:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
      toast.error(error.message || "Failed to add favorite");
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (favoriteId) => {
    if (!authUser?._id) {
      toast.error("Please log in to manage favorites");
      return;
    }

    try {
      await deleteFavorite(authUser._id, favoriteId);
      removeFavoriteFromStore(favoriteId);
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      toast.error(error.message || "Failed to remove favorite");
    }
  };

  // Load favorite URL
  const loadFavorite = (favorite) => {
    loadFavoriteFromStore(favorite);
    toast.success(`Loaded: ${favorite.name}`);
  };

  // Determine container classes based on display mode
  const containerClasses = `music-player-floating fixed bottom-4 right-4 bg-base-100 rounded-xl shadow-lg border border-base-300 z-50 transition-all duration-300 ${
        isMinimized ? 'w-20 h-12 p-2' : 'w-[28rem] max-w-[calc(100vw-2rem)] p-4'
      }`;

  // Create the player content
  const playerContent = (
    <div 
      ref={playerRef}
      className={containerClasses}
    >
      {/* Header */}
      <div className={`flex items-center ${isMinimized ? 'justify-between w-full' : 'gap-2'}`}>
        <div className={`${isMinimized ? 'w-12 h-8' : 'w-8 h-8'} bg-${colorToken} rounded-lg flex items-center justify-center`}>
          <Play className="w-5 h-5 text-primary-content" />
        </div>
        {!isMinimized && (
          <h3 className="text-3xl font-semibold text-base-content font-fredoka">Music Player</h3>
        )}
        <div className={`${isMinimized ? '' : 'ml-auto'} flex items-center gap-2`}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`btn btn-xs btn-ghost opacity-50 hover:opacity-100 ${isMinimized ? 'btn-circle' : ''}`}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? "+" : "−"}
          </button>
        </div>
      </div>

      {/* Content - hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Input Section */}
          <div className="space-y-3 mb-4 flex-1">
            {/* URL Input Row */}
            <div className="flex flex-col gap-2">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Paste YouTube video or playlist URL here..."
                className="input input-bordered w-full"
                disabled={isLoading}
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleLoadVideo}
                  className={`btn btn-${colorToken} btn-sm ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? '' : 'Load'}
                </button>
                {(youtubeUrl || embedUrl) && (
                  <button
                    onClick={handleClear}
                    className="btn btn-outline btn-error btn-sm"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Control Buttons Row */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleLoop}
                className={`btn btn-xs ${isLooping ? `btn-${colorToken}` : 'btn-outline'}`}
                title={isLooping ? "Disable loop" : "Enable loop"}
              >
                <RotateCcw className="w-3 h-3" />
                Loop
              </button>
              
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className="btn btn-xs btn-outline"
              >
                <Heart className="w-3 h-3" />
                Favorites ({favorites.length}/10)
              </button>
            </div>


            {/* Timer Integration Settings */}
            <div className="space-y-2 mt-3 pt-3 border-t border-base-300">
              <button
                onClick={() => setIsTimerIntegrationExpanded(!isTimerIntegrationExpanded)}
                className="flex items-center gap-2 w-full text-left hover:bg-base-200 rounded p-1 -m-1 transition-colors"
              >
                {isTimerIntegrationExpanded ? (
                  <ChevronDown className="w-4 h-4 text-base-content/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-base-content/60" />
                )}
                <h4 className="text-sm font-medium text-base-content">Timer Integration</h4>
              </button>
              
              {isTimerIntegrationExpanded && (
                <div className="space-y-2 ml-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-base-content/70 cursor-pointer">
                      Auto-play music when session starts
                    </label>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm"
                      checked={autoPlayOnSessionStart}
                      onChange={(e) => setAutoPlayOnSessionStart(e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-base-content/70 cursor-pointer">
                      Pause music when timer is paused
                    </label>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm"
                      checked={pauseMusicOnTimerPause}
                      onChange={(e) => setPauseMusicOnTimerPause(e.target.checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-base-content/70 cursor-pointer">
                      Control music when focus session ends
                    </label>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm"
                      checked={stopMusicOnSessionEnd}
                      onChange={(e) => setStopMusicOnSessionEnd(e.target.checked)}
                    />
                  </div>

                  {stopMusicOnSessionEnd && (
                    <div className="ml-4 space-y-2">
                      <div className="text-xs text-base-content/60">
                        When focus session ends:
                      </div>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="sessionEndBehavior"
                            value="pause"
                            checked={sessionEndMusicBehavior === 'pause'}
                            onChange={(e) => setSessionEndMusicBehavior(e.target.value)}
                            className="radio radio-xs"
                          />
                          <span className="text-xs">Pause (continue where left off)</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="sessionEndBehavior"
                            value="stop"
                            checked={sessionEndMusicBehavior === 'stop'}
                            onChange={(e) => setSessionEndMusicBehavior(e.target.value)}
                            className="radio radio-xs"
                          />
                          <span className="text-xs">Stop (restart from beginning)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Error Alert */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Favorites Section */}
          {showFavorites && (
            <div className="mb-4 p-4 bg-base-200 rounded-lg">
              <h4 className="font-semibold mb-3">Favorites</h4>
              
              {/* Add new favorite */}
              <div className="flex flex-col gap-2 mb-3">
                <input
                  type="text"
                  value={newFavoriteName}
                  onChange={(e) => setNewFavoriteName(e.target.value)}
                  placeholder="Name for current URL..."
                  className="input input-bordered input-sm w-full"
                />
                <div className="flex justify-end">
                  <button
                    onClick={addToFavorites}
                    className="btn btn-xs btn-primary"
                    disabled={!youtubeUrl.trim() || favorites.length >= 10}
                  >
                    <Heart className="w-2 h-2" />
                    Add
                  </button>
                </div>
              </div>

              {/* Favorites list */}
              <div className="space-y-2 overflow-y-auto max-h-40">
                {isLoadingFavorites ? (
                  <div className="flex justify-center py-4">
                    <div className="loading loading-spinner loading-sm"></div>
                  </div>
                ) : favorites.length === 0 ? (
                  <p className="text-sm text-base-content/60">No favorites yet</p>
                ) : (
                  favorites.map((favorite) => (
                    <div
                      key={favorite._id}
                      className="flex items-center justify-between p-2 bg-base-100 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{favorite.name}</p>
                        <p className="text-xs text-base-content/60 truncate">{favorite.url}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => loadFavorite(favorite)}
                          className="btn btn-xs btn-primary"
                          title="Load"
                        >
                          <Play className="w-2 h-2" />
                        </button>
                        <button
                          onClick={() => removeFromFavorites(favorite._id)}
                          className="btn btn-xs btn-error"
                          title="Remove"
                        >
                          <Trash2 className="w-2 h-2" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!embedUrl && !error && (
            <div className="text-sm text-base-content/60 text-center py-4">
              <p>Paste a YouTube video or playlist URL above to start listening</p>
              <p className="text-xs mt-1">
                Supports: youtube.com/watch?v=... and youtube.com/playlist?list=...
              </p>
            </div>
          )}
        </>
      )}

      {/* YouTube iframe - always mounted to prevent playback interruption */}
      {embedUrl && (
        <div className={`space-y-3 ${isMinimized ? 'hidden' : ''}`}>
          <div className="text-sm text-base-content/70">
            💡 Use the YouTube player controls to pause/play
          </div>
          <div className="relative w-full bg-base-200 rounded-lg overflow-hidden">
            <iframe
              key={embedUrl} // Stable key to prevent unnecessary recreation
              src={embedUrl}
              title="YouTube video player"
              className="w-full h-36"
              style={{ aspectRatio: '21/9' }}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );

  // Render based on display mode
  return playerContent;
});

export default MusicPlayer;

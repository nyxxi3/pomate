import { useEffect } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { useZoomStore } from "../store/useZoomStore";
import { useTimerStore } from "../store/useTimerStore";
import { useRoomTimerStore } from "../store/useRoomTimerStore";
import SoloTimer from "./solo/SoloTimer";
import SoloControls from "./solo/SoloControls";

const ZoomTimer = () => {
  const { isZoomed, zoomType, exitZoom } = useZoomStore();
  
  // Get timer data based on zoom type - use individual selectors to avoid re-render loops
  const soloRemaining = useTimerStore((state) => state.remaining);
  const soloTotalSeconds = useTimerStore((state) => state.totalSeconds);
  const soloRunning = useTimerStore((state) => state.running);
  const soloHasStarted = useTimerStore((state) => state.hasStarted);
  const soloMode = useTimerStore((state) => state.mode);
  const soloSessionGoal = useTimerStore((state) => state.sessionGoal);
  const soloIsStrictMode = useTimerStore((state) => state.isStrictMode);
  const soloWorkMinutes = useTimerStore((state) => state.workMinutes);
  const soloBreakMinutes = useTimerStore((state) => state.breakMinutes);
  const soloStartTimer = useTimerStore((state) => state.startTimer);
  const soloPauseTimer = useTimerStore((state) => state.pauseTimer);
  const soloStopTimer = useTimerStore((state) => state.stopTimer);
  const soloSkipBreak = useTimerStore((state) => state.skipBreak);
  
  const roomRemaining = useRoomTimerStore((state) => state.remaining);
  const roomTotalSeconds = useRoomTimerStore((state) => state.totalSeconds);
  const roomRunning = useRoomTimerStore((state) => state.running);
  const roomHasStarted = useRoomTimerStore((state) => state.hasStarted);
  const roomMode = useRoomTimerStore((state) => state.mode);
  const roomUserFocusGoal = useRoomTimerStore((state) => state.userFocusGoal);
  const roomWorkMinutes = useRoomTimerStore((state) => state.workMinutes);
  const roomBreakMinutes = useRoomTimerStore((state) => state.breakMinutes);
  const roomStartTimer = useRoomTimerStore((state) => state.startTimer);
  const roomStopTimer = useRoomTimerStore((state) => state.stopTimer);
  const roomSkipBreak = useRoomTimerStore((state) => state.skipBreak);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isZoomed) {
        // Escape key to exit zoom
        if (e.key === 'Escape') {
          exitZoom();
        }
        // F11 key to toggle zoom (browser fullscreen)
        if (e.key === 'F11') {
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, exitZoom]);
  
  // Don't render if not zoomed
  if (!isZoomed) return null;
  
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m} : ${s}`;
  };
  
  // Use appropriate timer data based on zoom type
  const remaining = zoomType === 'solo' ? soloRemaining : roomRemaining;
  const totalSeconds = zoomType === 'solo' ? soloTotalSeconds : roomTotalSeconds;
  const running = zoomType === 'solo' ? soloRunning : roomRunning;
  const hasStarted = zoomType === 'solo' ? soloHasStarted : roomHasStarted;
  const mode = zoomType === 'solo' ? soloMode : roomMode;
  const sessionGoal = zoomType === 'solo' ? soloSessionGoal : roomUserFocusGoal;
  const isStrictMode = zoomType === 'solo' ? soloIsStrictMode : false;
  const workMinutes = zoomType === 'solo' ? soloWorkMinutes : roomWorkMinutes;
  const breakMinutes = zoomType === 'solo' ? soloBreakMinutes : roomBreakMinutes;
  const startTimer = zoomType === 'solo' ? soloStartTimer : roomStartTimer;
  const pauseTimer = zoomType === 'solo' ? soloPauseTimer : null;
  const stopTimer = zoomType === 'solo' ? soloStopTimer : roomStopTimer;
  const skipBreak = zoomType === 'solo' ? soloSkipBreak : roomSkipBreak;
  
  const colorToken = mode === "work" ? "primary" : "accent";
  const showSkip = mode === "break";
  
  return (
    <div className="fixed inset-0 z-50 bg-base-100 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={exitZoom}
        className="absolute top-4 right-4 btn btn-ghost btn-circle"
        aria-label="Exit zoom mode"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Timer content */}
      <div className="flex flex-col items-center justify-center w-full h-full px-8">
        {/* Session info */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-base-content font-fredoka mb-2">
            {sessionGoal || (mode === "work" ? "Focus Time" : "Short Break")}
          </h1>
          {isStrictMode && (
            <div className="text-lg text-error font-semibold">🔒 STRICT MODE</div>
          )}
        </div>
        
        {/* Timer display */}
        <div className="mb-12 w-full max-w-4xl">
          <SoloTimer 
            remainingSeconds={remaining} 
            totalSeconds={totalSeconds} 
            colorToken={colorToken}
            maxWidth="w-full"
          />
        </div>
        
        {/* Controls */}
        <div className="mb-8">
          <SoloControls
            running={running}
            hasStarted={hasStarted}
            isStrictMode={isStrictMode}
            onToggleRunning={async () => {
              if (!running) {
                await startTimer();
              } else {
                if (pauseTimer) {
                  pauseTimer();
                }
              }
            }}
            onStop={() => {
              stopTimer();
            }}
            onSkip={() => {
              if (showSkip) {
                skipBreak();
              }
            }}
            showSkip={showSkip}
            colorToken={colorToken}
          />
        </div>
        
        {/* Duration info */}
        <div className="text-center text-base-content/70">
          <div className="text-lg">
            <span className="font-semibold">Work:</span> {workMinutes}m
            <span className="mx-4">|</span>
            <span className="font-semibold">Break:</span> {breakMinutes}m
          </div>
          <div className="text-sm mt-2 opacity-60">
            Press <kbd className="kbd kbd-sm">ESC</kbd> to exit zoom mode
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomTimer;
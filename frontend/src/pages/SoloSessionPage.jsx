import GoalsCard from "../components/GoalsCard";
import HabitTracker from "../components/HabitTracker";
import SoloTimer from "../components/solo/SoloTimer";
import SoloControls from "../components/solo/SoloControls";
import ProgressCard from "../components/ProgressCard";
import ZoomTimer from "../components/ZoomTimer";
// SoloStats removed from timer section per request
import DashboardSidebar from "../components/DashboardSidebar";
import { useMobileSidebarStore } from "../store/useMobileSidebarStore";
import { useTimerStore } from "../store/useTimerStore";
import { useZoomStore } from "../store/useZoomStore";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSoloSessionStorage } from "../lib/useSoloSessionStorage";
import { fetchStats } from "../lib/sessionsApi";
import notificationService from "../lib/notificationService.js";
import { Coffee, Briefcase, Maximize2 } from "lucide-react";

const SoloSessionPage = () => {
  const [stats, setStats] = useState(null);
  const [strictModeError, setStrictModeError] = useState('');
  const { start: startSession, markCompleted, markAbandoned } = useSoloSessionStorage();
  
  // Use global timer store
  const {
    workMinutes,
    breakMinutes,
    mode,
    running,
    hasStarted,
    remaining,
    totalSeconds,
    sessionGoal,
    isExplicitlyPaused,
    isStrictMode,
    setWorkMinutes,
    setBreakMinutes,
    setMode,
    startTimer,
    pauseTimer,
    stopTimer,
    skipBreak,
    setSessionGoal,
    setStrictMode
  } = useTimerStore();

  const refreshStats = async () => {
    try {
      console.log("📊 Refreshing stats...");
      const s = await fetchStats();
      console.log("📊 Fetched stats:", s);
      setStats(s);
      console.log("📊 Stats updated in state");
    } catch (error) {
      console.error('❌ Failed to refresh stats:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };







  const MIN_INPUT_MINUTES = 0;
  const MAX_INPUT_MINUTES = 120;
  
  // TESTING MODE - Set to true to enable short timers for testing
  const TESTING_MODE = false;

  const clampMinutesInput = (value) => {
    const numeric = Number.isNaN(Number(value)) ? 0 : Math.floor(Number(value));
    return Math.min(MAX_INPUT_MINUTES, Math.max(MIN_INPUT_MINUTES, numeric));
  };



  useEffect(() => {
    // Initialize notification service and request permission
    const initNotifications = async () => {
      try {
        await notificationService.requestPermission();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };
    
    initNotifications();
    
    const bootstrap = async () => {
      try {
        const s = await fetchStats();
        setStats(s);
      } catch (error) {
        console.error('Failed to fetch initial stats:', error);
      }
    };
    bootstrap();
  }, []);

  // Set up timer completion callback for session management
  useEffect(() => {
    console.log("🎯 Setting up timer completion callback in SoloSessionPage");
    const unsubscribe = useTimerStore.getState().onTimerEnd(() => {
      console.log("🎯 Timer completion callback triggered in SoloSessionPage");
      // Handle timer completion - mark session as completed and refresh stats
      markCompleted().finally(() => {
        refreshStats(); // Refresh stats after session completion
      });
    });

    return unsubscribe;
  }, [markCompleted]);





  // Handle beforeunload event (browser navigation like refresh/close)
  useEffect(() => {
    const beforeUnload = async (e) => {
      if (running && isStrictMode) {
        e.preventDefault();
        e.returnValue = "Leaving will end your focus session. Continue?";
        return "Leaving will end your focus session. Continue?";
      } else if (running) {
        // Normal mode - still warn but less aggressive
        await markAbandoned();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [running, isStrictMode, markAbandoned]);

  // Aggressive navigation blocking for strict mode
  const shouldBlockNavigation = useCallback(() => {
    return isStrictMode && running && hasStarted;
  }, [isStrictMode, running, hasStarted]);

  // Block ALL navigation in strict mode
  useEffect(() => {
    if (!shouldBlockNavigation()) return;
    
    console.log("🔒 STRICT MODE: Navigation blocking activated");

    // Block beforeunload (refresh, close)
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Focus session in progress. Are you sure you want to leave?";
      return "Focus session in progress. Are you sure you want to leave?";
    };

    // Block history navigation (back button, programmatic)
    const handlePopState = (e) => {
      e.preventDefault();
      const shouldLeave = window.confirm("Focus session in progress. Are you sure you want to leave?");
      if (shouldLeave) {
        stopTimer();
        markAbandoned().finally(() => {
          window.history.back();
        });
      } else {
        // Force stay on current page
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    // Block pushState/replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      if (shouldBlockNavigation()) {
        console.log("Navigation blocked: pushState");
        return;
      }
      return originalPushState.apply(this, args);
    };
    
    window.history.replaceState = function(...args) {
      if (shouldBlockNavigation()) {
        console.log("Navigation blocked: replaceState");
        return;
      }
      return originalReplaceState.apply(this, args);
    };

    // Block hash changes
    const handleHashChange = (e) => {
      if (shouldBlockNavigation()) {
        e.preventDefault();
        console.log("Navigation blocked: hash change");
        return false;
      }
    };

    // Block all the events
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);
    
    // Push current state to prevent back button
    window.history.pushState(null, "", window.location.pathname);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
      
      // Restore original methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [shouldBlockNavigation, stopTimer, markAbandoned]);


  const showSkip = mode === "break"; // show skip only during break
  // Color policy: Focus uses primary (main theme); Break uses accent (complementary)
  const colorToken = mode === "work" ? "primary" : "accent";
  const colorHeader = `text-${colorToken}`;
  const badgeBg = `bg-${colorToken}`;

  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSidebarStore();
  const { toggleZoom } = useZoomStore();
  
  // Block mobile sidebar in strict mode
  useEffect(() => {
    if (shouldBlockNavigation() && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [shouldBlockNavigation, isMobileSidebarOpen, setIsMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-base-100 pt-20">{/* extra space below navbar */}
      {/* Zoom Timer Overlay */}
      <ZoomTimer />
      
      {/* Mobile Sidebar Overlay for Solo page */}
      {/* Reuse Dashboard's slide-out sidebar */}
      <DashboardSidebar 
        expanded={true} 
        onToggle={() => {}} 
        disabled={shouldBlockNavigation()} // Disable sidebar in strict mode
      />

      <div className="container mx-auto px-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Focus Time card (row 1) - Fixed height to match Progress */}
          <div className="lg:col-span-3">
            <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${badgeBg} rounded-lg flex items-center justify-center`}>
                    {mode === "work" ? (
                      <Briefcase className="w-4 h-4 text-primary-content" />
                    ) : (
                      <Coffee className="w-4 h-4 text-primary-content" />
                    )}
                  </div>
                  <h2 className="text-3xl font-semibold text-base-content font-fredoka">
                    {mode === "work" ? (sessionGoal || "Focus Time") : "Short Break"}
                    {TESTING_MODE && <span className="text-warning ml-2 text-sm">(TEST MODE)</span>}
                    {isStrictMode && <span className="text-error ml-2 text-sm">🔒 STRICT</span>}
                  </h2>
                </div>
                <button
                  onClick={() => toggleZoom('solo')}
                  className="btn btn-ghost btn-sm"
                  title="Zoom timer (F11)"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>



              <div className="flex flex-col items-center gap-8 flex-1 justify-center py-4">
                <SoloTimer remainingSeconds={remaining} totalSeconds={totalSeconds} colorToken={colorToken} />

                <SoloControls
                  running={running}
                  hasStarted={hasStarted}
                  isStrictMode={isStrictMode}
                  onToggleRunning={async () => {
                    if (!running) {
                      // Clear any previous error
                      setStrictModeError('');
                      
                      // Strict mode validation - require session name for focus sessions
                      if (isStrictMode && mode === "work" && !sessionGoal.trim()) {
                        setStrictModeError("Please name your session or pick a task to focus on before starting.");
                        return;
                      }
                      
                      if (!hasStarted) {
                        // Starting a new session - need to call session storage
                        let duration = (mode === "work" ? workMinutes : breakMinutes) * 60;
                        
                        // TESTING MODE - Use short durations for testing
                        if (TESTING_MODE) {
                          duration = mode === "work" ? 10 : 5; // 10 seconds for focus, 5 for break
                          console.log(`TESTING MODE: Using ${duration} seconds for ${mode} session`);
                        }
                        
                        const type = mode === "work" ? "focus" : "break";
                        startSession(type, duration, sessionGoal);
                      }
                      
                      // Pass test duration to timer if in testing mode
                      if (TESTING_MODE && !hasStarted) {
                        const testDuration = mode === "work" ? 10 : 5;
                        await startTimer(testDuration);
                      } else {
                        await startTimer();
                      }
                    } else {
                      // In strict mode, don't allow pause - this should never happen as button won't be shown
                      if (!isStrictMode) {
                        pauseTimer();
                      }
                    }
                  }}
                  onStop={() => {
                    stopTimer();
                    markAbandoned().finally(() => {
                      refreshStats(); // Refresh stats after session abandonment
                    });
                  }}
                  onSkip={() => {
                    if (showSkip) {
                      skipBreak();
                    }
                  }}
                  showSkip={showSkip}
                  colorToken={colorToken}
                />

                {/* Duration controls */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-base-content/70">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-xs" onClick={() => setWorkMinutes(Math.max(MIN_INPUT_MINUTES, workMinutes - 1))}>-</button>
                    <div className="flex items-center gap-2">
                      <span className="opacity-80">🕒</span>
                      <label className="label p-0 text-sm opacity-80">Work:</label>
                      <input
                        type="number"
                        min={MIN_INPUT_MINUTES}
                        max={MAX_INPUT_MINUTES}
                        value={workMinutes}
                        onChange={(e) => setWorkMinutes(clampMinutesInput(e.target.value))}
                        onBlur={(e) => setWorkMinutes(clampMinutesInput(e.target.value))}
                        className="input input-bordered input-xs w-24"
                      />
                      <span className="opacity-80">m</span>
                    </div>
                    <button className="btn btn-xs" onClick={() => setWorkMinutes(Math.min(MAX_INPUT_MINUTES, workMinutes + 1))}>+</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn btn-xs" onClick={() => setBreakMinutes(Math.max(MIN_INPUT_MINUTES, breakMinutes - 1))}>-</button>
                    <div className="flex items-center gap-2">
                      <span className="opacity-80">☕</span>
                      <label className="label p-0 text-sm opacity-80">Break:</label>
                      <input
                        type="number"
                        min={MIN_INPUT_MINUTES}
                        max={MAX_INPUT_MINUTES}
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(clampMinutesInput(e.target.value))}
                        onBlur={(e) => setBreakMinutes(clampMinutesInput(e.target.value))}
                        className="input input-bordered input-xs w-24"
                      />
                      <span className="opacity-80">m</span>
                    </div>
                    <button className="btn btn-xs" onClick={() => setBreakMinutes(Math.min(MAX_INPUT_MINUTES, breakMinutes + 1))}>+</button>
                  </div>
                </div>

                {/* Strict Mode Toggle */}
                {!running && !hasStarted && (
                  <div className="w-full flex items-center justify-center gap-2 text-base-content/70">
                    <div className="flex items-center gap-2">
                      <span className="opacity-80">🔒</span>
                      <label className="label p-0 text-sm opacity-80">Strict Mode:</label>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={isStrictMode}
                        onChange={(e) => setStrictMode(e.target.checked)}
                      />
                      <div className="tooltip tooltip-bottom" data-tip="Requires session name and disables pause/navigation">
                        <span className="text-xs opacity-60">ⓘ</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Goal Input - Only show when not running and not started */}
                {!running && !hasStarted && (
                  <div className="w-full max-w-md">
                    <label className="label">
                      <span className="label-text text-base-content/70">
                        What are you focusing on?
                        {isStrictMode && mode === "work" && (
                          <span className="text-error ml-1">*</span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Complete project proposal, Study for exam, Write blog post..."
                      value={sessionGoal}
                      onChange={(e) => {
                        setSessionGoal(e.target.value);
                        // Clear error when user starts typing
                        if (strictModeError) {
                          setStrictModeError('');
                        }
                      }}
                      className={`input input-bordered w-full ${isStrictMode && mode === "work" && !sessionGoal.trim() ? 'input-error' : ''}`}
                      maxLength={100}
                    />
                    <div className="label">
                      <span className="label-text-alt text-base-content/50">
                        {sessionGoal.length}/100 characters
                      </span>
                      {isStrictMode && mode === "work" && (
                        <span className="label-text-alt text-base-content/50">
                          Required in Strict Mode
                        </span>
                      )}
                    </div>
                    {/* Error message */}
                    {strictModeError && (
                      <div className="alert alert-error mt-2">
                        <span className="text-sm">{strictModeError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Today's Progress (row 1) */}
          <div className="lg:col-span-1">
            <ProgressCard colorToken={colorToken} />
          </div>
        </div>

        {/* Second Row: Goals and Habits */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-2">
          {/* Left: Today's Goals (row 2) - Expanded to fill space */}
          <div className="lg:col-span-3">
            <GoalsCard colorToken={colorToken} />
          </div>

          {/* Right: Habits (row 2) */}
          <div className="lg:col-span-1">
            <HabitTracker colorToken={colorToken} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoloSessionPage;



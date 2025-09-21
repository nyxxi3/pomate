import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

export const useRoomTimerStore = create((set, get) => ({
  // Room timer state - separate from solo timer
  remaining: 0,
  totalSeconds: 0,
  running: false,
  hasStarted: false,
  mode: "work", // work | break
  isExplicitlyPaused: false,
  
  // Absolute timestamps for accurate timing
  startTime: null, // When the timer started
  endTime: null,   // When the timer should end
  pausedAt: null,  // When the timer was paused
  pausedRemaining: null, // Remaining time when paused
  
  // Room-specific settings
  workMinutes: 25,
  breakMinutes: 5,
  
  // Interval reference
  intervalRef: null,
  
  // ============================================================================
  // TIMER PERSISTENCE FUNCTIONS
  // ============================================================================
  
  // Save timer state to localStorage (room-specific)
  saveTimerState: (roomId = null) => {
    const state = get();
    
    // If no roomId provided, try to get it from room store
    if (!roomId) {
      try {
        const { useRoomStore } = require('./useRoomStore');
        const roomState = useRoomStore.getState();
        roomId = roomState.currentRoom?._id;
      } catch (error) {
        console.log("💾 [ROOM TIMER] Could not get roomId from room store:", error);
      }
    }
    
    const timerState = {
      remaining: state.remaining,
      totalSeconds: state.totalSeconds,
      running: state.running,
      hasStarted: state.hasStarted,
      mode: state.mode,
      isExplicitlyPaused: state.isExplicitlyPaused,
      startTime: state.startTime,
      endTime: state.endTime,
      pausedAt: state.pausedAt,
      pausedRemaining: state.pausedRemaining,
      workMinutes: state.workMinutes,
      breakMinutes: state.breakMinutes,
      roomId: roomId, // Add room ID to make it room-specific
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('pomate_room_timer_state', JSON.stringify(timerState));
    console.log("💾 [ROOM TIMER] Saved timer state to localStorage for room:", roomId, {
      remaining: state.remaining,
      totalSeconds: state.totalSeconds,
      running: state.running,
      hasStarted: state.hasStarted,
      mode: state.mode
    });
  },
  
  // Load timer state from localStorage
  loadTimerState: () => {
    try {
      const savedState = localStorage.getItem('pomate_room_timer_state');
      if (savedState) {
        const timerState = JSON.parse(savedState);
        console.log("💾 [ROOM TIMER] Loaded timer state from localStorage");
        return timerState;
      }
    } catch (error) {
      console.error("💾 [ROOM TIMER] Error loading timer state:", error);
    }
    return null;
  },
  
  // Clear timer state from localStorage
  clearTimerState: () => {
    localStorage.removeItem('pomate_room_timer_state');
    console.log("💾 [ROOM TIMER] Cleared timer state from localStorage");
  },
  
  // Restore timer state from localStorage (only for the same room)
  restoreTimerState: (currentRoomId = null) => {
    const savedState = get().loadTimerState();
    if (savedState) {
      console.log("💾 [ROOM TIMER] Found saved timer state:", savedState);
      
      // Check if the saved state is for the same room
      if (savedState.roomId && currentRoomId && savedState.roomId !== currentRoomId) {
        console.log("💾 [ROOM TIMER] Saved timer state is for different room, not restoring");
        get().clearTimerState();
        return false;
      }
      
      // Check if the saved state is still valid (not too old)
      const savedTime = new Date(savedState.timestamp).getTime();
      const now = Date.now();
      const timeDiff = now - savedTime;
      
      console.log("💾 [ROOM TIMER] Time diff:", timeDiff, "ms (", Math.round(timeDiff / 1000), "seconds ago)");
      
      // If saved state is less than 1 hour old, restore it
      if (timeDiff < 60 * 60 * 1000) {
        console.log("💾 [ROOM TIMER] Restoring timer state from localStorage for room:", currentRoomId);
        console.log("💾 [ROOM TIMER] Restoring state:", {
          remaining: savedState.remaining,
          totalSeconds: savedState.totalSeconds,
          running: savedState.running,
          hasStarted: savedState.hasStarted,
          mode: savedState.mode
        });
        
        set({
          remaining: savedState.remaining,
          totalSeconds: savedState.totalSeconds,
          running: savedState.running,
          hasStarted: savedState.hasStarted,
          mode: savedState.mode,
          isExplicitlyPaused: savedState.isExplicitlyPaused,
          startTime: savedState.startTime,
          endTime: savedState.endTime,
          pausedAt: savedState.pausedAt,
          pausedRemaining: savedState.pausedRemaining,
          workMinutes: savedState.workMinutes,
          breakMinutes: savedState.breakMinutes
        });
        
        console.log("💾 [ROOM TIMER] Timer state restored successfully");
        return true;
      } else {
        console.log("💾 [ROOM TIMER] Saved timer state is too old, not restoring");
        get().clearTimerState();
      }
    } else {
      console.log("💾 [ROOM TIMER] No saved timer state found");
    }
    return false;
  },
  
  // Calculate remaining time based on absolute timestamps
  calculateRemainingTime: () => {
    const state = get();
    
    // If explicitly paused, return the paused remaining time
    if (state.isExplicitlyPaused && state.pausedRemaining !== null) {
      return state.pausedRemaining;
    }
    
    // If not started or no end time, return current remaining
    if (!state.hasStarted || !state.endTime) {
      return state.remaining;
    }
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((state.endTime - now) / 1000));
    return remaining;
  },

  // Reset timer to initial state
  resetTimer: () => {
    const { mode, workMinutes, breakMinutes } = get();
    const initialSeconds = (mode === "work" ? workMinutes : breakMinutes) * 60;
    console.log("🔄 [ROOM TIMER] Resetting timer");
    console.log("🔄 [ROOM TIMER] BEFORE RESET - Current state:", {
      remaining: get().remaining,
      totalSeconds: get().totalSeconds,
      running: get().running,
      hasStarted: get().hasStarted,
      mode: get().mode
    });
    const state = {
      hasStarted: false,
      remaining: initialSeconds,
      totalSeconds: initialSeconds,
      running: false,
      isExplicitlyPaused: false,
      mode,
      workMinutes,
      breakMinutes,
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
    };
    set(state);
    console.log("🔄 [ROOM TIMER] AFTER RESET - New state:", {
      remaining: get().remaining,
      totalSeconds: get().totalSeconds,
      running: get().running,
      hasStarted: get().hasStarted,
      mode: get().mode
    });
    get().saveTimerState();
  },

  // Start timer
  startTimer: (testDuration = null) => {
    const { hasStarted, mode, workMinutes, breakMinutes } = get();
    
    if (!hasStarted) {
      // Starting a new session
      let duration = (mode === "work" ? workMinutes : breakMinutes) * 60;
      
      // Allow override for testing
      if (testDuration !== null) {
        duration = testDuration;
        console.log(`[ROOM TIMER] Started with test duration: ${duration} seconds`);
      }
      
      const now = Date.now();
      const startTime = now;
      const endTime = now + (duration * 1000);
      
      const state = {
        hasStarted: true,
        remaining: duration,
        totalSeconds: duration,
        running: true,
        isExplicitlyPaused: false,
        mode,
        workMinutes,
        breakMinutes,
        startTime: startTime,
        endTime: endTime,
        pausedAt: null,
        pausedRemaining: null,
      };
      set(state);
      get().saveTimerState();
    } else {
      // Resume existing session
      const currentState = get();
      const now = Date.now();
      let newEndTime = currentState.endTime;
      let newRemaining = currentState.remaining;
      
      if (currentState.isExplicitlyPaused && currentState.pausedRemaining !== null) {
        // Resume from paused state
        newEndTime = now + (currentState.pausedRemaining * 1000);
        newRemaining = currentState.pausedRemaining;
      }
      
      const state = {
        ...currentState,
        running: true,
        isExplicitlyPaused: false,
        endTime: newEndTime,
        remaining: newRemaining,
        pausedAt: null,
        pausedRemaining: null,
      };
      set(state);
      get().saveTimerState();
    }
  },


  // Stop timer
  stopTimer: () => {
    const currentState = get();
    console.log("⏹️ [ROOM TIMER] Stopping timer");
    
    set({
      running: false,
      hasStarted: false,
      isExplicitlyPaused: false,
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
    });
    get().resetTimer();
    get().saveTimerState();
  },

  // ============================================================================
  // ROOM TIMER SYNCHRONIZATION FUNCTIONS
  // ============================================================================

  // Sync timer with room state (for non-admin users)
  syncTimerWithRoom: (timerData) => {
    console.log("🔄 [TIMER SYNC] Syncing timer with server state:", timerData);
    
    const { sessionType, duration, startTime, remaining, isRunning } = timerData;
    const mode = sessionType === 'work' ? 'work' : 'break';
    const now = Date.now();
    
    // Use server values directly - don't recalculate when paused
    let actualRemaining = remaining;
    let actualRunning = isRunning;
    
    // Only recalculate if timer is running and we have start time
    if (isRunning && startTime) {
      const serverStart = new Date(startTime).getTime();
      const elapsed = Math.floor((now - serverStart) / 1000);
      actualRemaining = Math.max(0, duration - elapsed);
      actualRunning = actualRemaining > 0;
    }
    // If timer is paused (!isRunning), use the exact remaining time from server
    
    // Determine if session has started based on timer state
    const hasStarted = actualRunning || (!actualRunning && actualRemaining > 0);
    
    // Update local state
    set({
      mode,
      remaining: actualRemaining,
      totalSeconds: duration,
      running: actualRunning,
      hasStarted: hasStarted,
      isExplicitlyPaused: !actualRunning && actualRemaining > 0,
      startTime: actualRunning ? now - ((duration - actualRemaining) * 1000) : null,
      endTime: actualRunning ? now + (actualRemaining * 1000) : null,
      pausedAt: !actualRunning && actualRemaining > 0 ? now : null,
      pausedRemaining: !actualRunning && actualRemaining > 0 ? actualRemaining : null,
    });
    
    console.log(`[TIMER SYNC] Updated timer state - ` +
               `Mode: ${mode}, Running: ${actualRunning}, ` +
               `Remaining: ${actualRemaining}/${duration}s`);
    
    // Save state after syncing
    get().saveTimerState();
  },

  // Start timer with specific duration (for room sync)
  startTimerWithDuration: (duration, sessionType = 'work') => {
    const now = Date.now();
    const endTime = now + (duration * 1000);
    
    // Only update if it's a significant change
    const current = get();
    if (current.mode === sessionType && 
        Math.abs(current.remaining - duration) < 2 && 
        current.running) {
      return;
    }
    
    set({
      mode: sessionType,
      remaining: duration,
      totalSeconds: duration,
      running: true,
      hasStarted: true,
      isExplicitlyPaused: false,
      startTime: now,
      endTime: endTime,
      pausedAt: null,
      pausedRemaining: null,
    });
    
    console.log(`[TIMER] Started ${sessionType} timer for ${duration}s`);
    get().saveTimerState();
  },


  // Skip break (switch to work mode)
  skipBreak: () => {
    const { workMinutes } = get();
    const currentState = get();
    const state = {
      ...currentState,
      running: false,
      mode: "work",
      remaining: workMinutes * 60,
      totalSeconds: workMinutes * 60,
      hasStarted: false,
      isExplicitlyPaused: false,
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
    };
    set(state);
  },

  // Update remaining time based on absolute timestamps
  updateRemaining: () => {
    const remaining = Math.max(0, get().calculateRemainingTime());
    const state = {
      ...get(),
      remaining: remaining,
    };
    set(state);
  },

  // Timer completion handler
  handleTimerCompletion: () => {
    const currentState = get();
    console.log("🔥 [ROOM TIMER] handleTimerCompletion called, state:", {
      hasStarted: currentState.hasStarted,
      remaining: currentState.remaining,
      mode: currentState.mode,
      endTime: currentState.endTime,
    });
    
    // Prevent multiple completion triggers
    if (!currentState.hasStarted || currentState.remaining > 0) {
      console.log("⚠️ [ROOM TIMER] Completion prevented - invalid state");
      return;
    }

    const wasWorkMode = currentState.mode === "work";
    console.log("✅ [ROOM TIMER] Timer completed, was work mode:", wasWorkMode);
    
    // Auto-switch mode after work session completion
    if (wasWorkMode) {
      // Switch to break mode
      const breakDuration = currentState.breakMinutes * 60;
      console.log("🔄 [ROOM TIMER] Switching to break mode");
      set({
        mode: "break",
        remaining: breakDuration,
        totalSeconds: breakDuration,
        running: false,
        hasStarted: false,
        isExplicitlyPaused: false,
        startTime: null,
        endTime: null,
        pausedAt: null,
        pausedRemaining: null,
      });
    } else {
      // Break completed - reset to work mode but don't auto-start
      const workDuration = currentState.workMinutes * 60;
      console.log("🔄 [ROOM TIMER] Switching to work mode");
      set({
        mode: "work",
        remaining: workDuration,
        totalSeconds: workDuration,
        running: false,
        hasStarted: false,
        isExplicitlyPaused: false,
        startTime: null,
        endTime: null,
        pausedAt: null,
        pausedRemaining: null,
      });
    }
  },

  // Set work/break minutes
  setWorkMinutes: (minutes) => {
    const state = {
      ...get(),
      workMinutes: minutes,
    };
    if (get().mode === "work" && !get().hasStarted) {
      state.remaining = minutes * 60;
      state.totalSeconds = minutes * 60;
    }
    set(state);
  },

  setBreakMinutes: (minutes) => {
    const state = {
      ...get(),
      breakMinutes: minutes,
    };
    if (get().mode === "break" && !get().hasStarted) {
      state.remaining = minutes * 60;
      state.totalSeconds = minutes * 60;
    }
    set(state);
  },

  // Set mode (work/break)
  setMode: (newMode) => {
    const { workMinutes, breakMinutes } = get();
    const newTotal = (newMode === "work" ? workMinutes : breakMinutes) * 60;
    const state = {
      ...get(),
      mode: newMode,
      remaining: newTotal,
      totalSeconds: newTotal,
      hasStarted: false,
      running: false,
      isExplicitlyPaused: false,
    };
    set(state);
  },

  // Clear all timer state (used when leaving room)
  clearAllTimerState: () => {
    console.log("🧹 [ROOM TIMER] Clearing all timer state");
    console.log("🧹 [ROOM TIMER] BEFORE CLEAR - Current state:", {
      remaining: get().remaining,
      totalSeconds: get().totalSeconds,
      running: get().running,
      hasStarted: get().hasStarted,
      mode: get().mode
    });
    
    // Clear all timer state
    set({
      remaining: 25 * 60, // Default 25 minutes
      totalSeconds: 25 * 60,
      running: false,
      hasStarted: false,
      mode: "work",
      isExplicitlyPaused: false,
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
      workMinutes: 25,
      breakMinutes: 5,
    });
    
    console.log("🧹 [ROOM TIMER] AFTER CLEAR - New state:", {
      remaining: get().remaining,
      totalSeconds: get().totalSeconds,
      running: get().running,
      hasStarted: get().hasStarted,
      mode: get().mode
    });
    
    // Clear from localStorage
    get().clearTimerState();
    
    console.log("🧹 [ROOM TIMER] Timer state completely cleared");
  },
}));

// Debug: Expose room timer store to window for debugging
if (typeof window !== 'undefined') {
  window.__ROOM_TIMER_STORE_DEBUG__ = useRoomTimerStore;
  
  // Add global timer state monitor
  let lastTimerState = null;
  const monitorTimerState = () => {
    const currentState = useRoomTimerStore.getState();
    const stateChanged = !lastTimerState || 
      lastTimerState.remaining !== currentState.remaining ||
      lastTimerState.running !== currentState.running ||
      lastTimerState.hasStarted !== currentState.hasStarted ||
      lastTimerState.mode !== currentState.mode;
    
    if (stateChanged) {
      console.log("🔍 [TIMER MONITOR] Timer state changed:", {
        from: lastTimerState,
        to: {
          remaining: currentState.remaining,
          totalSeconds: currentState.totalSeconds,
          running: currentState.running,
          hasStarted: currentState.hasStarted,
          mode: currentState.mode
        },
        stack: new Error().stack
      });
      lastTimerState = {
        remaining: currentState.remaining,
        totalSeconds: currentState.totalSeconds,
        running: currentState.running,
        hasStarted: currentState.hasStarted,
        mode: currentState.mode
      };
    }
  };
  
  // Monitor timer state changes
  useRoomTimerStore.subscribe(monitorTimerState);
}

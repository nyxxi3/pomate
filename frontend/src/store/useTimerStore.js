import { create } from "zustand";
import notificationService from "../lib/notificationService.js";

export const useTimerStore = create((set, get) => ({
  // Timer state
  remaining: 0,
  totalSeconds: 0,
  running: false,
  hasStarted: false,
  mode: "work", // work | break
  sessionGoal: "",
  isExplicitlyPaused: false,
  
  // Absolute timestamps for accurate timing
  startTime: null, // When the timer started
  endTime: null,   // When the timer should end
  pausedAt: null,  // When the timer was paused
  pausedRemaining: null, // Remaining time when paused
  
  // Session management - Load from localStorage or use defaults
  workMinutes: parseInt(localStorage.getItem('pomate_workMinutes')) || 25,
  breakMinutes: parseInt(localStorage.getItem('pomate_breakMinutes')) || 5,
  isStrictMode: localStorage.getItem('pomate_strictMode') === 'true' || false,
  
  // Interval reference
  intervalRef: null,
  
  // Callbacks for timer events
  timerStartCallbacks: [],
  timerEndCallbacks: [],
  timerPauseCallbacks: [],

  // Calculate remaining time based on absolute timestamps
  calculateRemainingTime: () => {
    const state = get();
    
    if (!state.hasStarted || !state.endTime) {
      return state.remaining;
    }
    
    if (state.isExplicitlyPaused && state.pausedRemaining !== null) {
      return state.pausedRemaining;
    }
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((state.endTime - now) / 1000));
    return remaining;
  },

  // Save complete timer state to localStorage
  saveTimerState: () => {
    const state = get();
    const timerState = {
      remaining: state.remaining,
      totalSeconds: state.totalSeconds,
      running: state.running,
      hasStarted: state.hasStarted,
      mode: state.mode,
      sessionGoal: state.sessionGoal,
      isExplicitlyPaused: state.isExplicitlyPaused,
      workMinutes: state.workMinutes,
      breakMinutes: state.breakMinutes,
      startTime: state.startTime,
      endTime: state.endTime,
      pausedAt: state.pausedAt,
      pausedRemaining: state.pausedRemaining,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("timerState", JSON.stringify(timerState));
  },

  // Load complete timer state from localStorage
  loadTimerState: () => {
    try {
      const savedState = localStorage.getItem("timerState");
      if (savedState) {
        const state = JSON.parse(savedState);
        return state;
      }
    } catch (error) {
      console.error('Failed to load timer state:', error);
    }
    return null;
  },

  // Initialize timer from localStorage
  initializeTimer: () => {
    try {
      // First, try to load complete timer state
      const savedState = get().loadTimerState();
    
    if (savedState) {
      // Check if there's an active session that should be running
      const now = Date.now();
      
      if (savedState.hasStarted && !savedState.isExplicitlyPaused && savedState.endTime) {
        // Calculate remaining time based on end time
        const remaining = Math.max(0, Math.ceil((savedState.endTime - now) / 1000));
        
        if (remaining > 0) {
          // Session is still active but don't auto-resume
          console.log("⏸️ Found saved timer state, but not auto-resuming");
          set({
            ...savedState,
            remaining: remaining,
            running: false, // Don't auto-resume - user must manually start
            timestamp: new Date().toISOString()
          });
          
          // Update the saved state with new remaining time
          get().saveTimerState();
          return;
        } else {
          // Session has completed
          get().handleTimerCompletion();
          return;
        }
      } else if (savedState.hasStarted && savedState.isExplicitlyPaused) {
        // Session was paused, restore as paused
        set({
          ...savedState,
          running: false,
          isExplicitlyPaused: true
        });
        return;
      }
    }
    
    // Fallback to legacy soloSession format for backward compatibility
    const existingData = localStorage.getItem("soloSession");
    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        const now = new Date();
        const end = new Date(data.endTime);
        const diff = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000));
        
        if (diff > 0) {
          // There's an active session but don't auto-resume
          console.log("⏸️ Found legacy timer state, but not auto-resuming");
          const state = {
            hasStarted: true,
            remaining: diff,
            mode: data.sessionType === "focus" ? "work" : "break",
            sessionGoal: data.goal || "",
            totalSeconds: data.duration || (data.sessionType === "focus" ? 25 * 60 : 5 * 60),
            running: false, // Don't auto-resume - user must manually start
            isExplicitlyPaused: false,
            workMinutes: 25,
            breakMinutes: 5,
            startTime: new Date(end.getTime() - (data.duration || 25 * 60) * 1000).getTime(),
            endTime: end.getTime(),
            pausedAt: null,
            pausedRemaining: null,
            timestamp: now.toISOString()
          };
          
          set(state);
          get().saveTimerState(); // Save in new format
          return;
        } else {
          // Session has ended
          localStorage.removeItem("soloSession");
        }
      } catch (error) {
        console.error('Failed to initialize timer from legacy localStorage:', error);
      }
    }
    
    // No active session, reset to default state
    get().resetTimer();
    } catch (error) {
      console.error("Error initializing timer:", error);
      // Fallback to default state
      get().resetTimer();
    }
  },

  // Reset timer to initial state
  resetTimer: () => {
    const { mode, workMinutes, breakMinutes, sessionGoal } = get();
    const initialSeconds = (mode === "work" ? workMinutes : breakMinutes) * 60;
    console.log("🔄 Resetting timer, preserving session goal:", sessionGoal);
    const state = {
      hasStarted: false,
      remaining: initialSeconds,
      totalSeconds: initialSeconds,
      running: false,
      isExplicitlyPaused: false,
      mode,
      workMinutes,
      breakMinutes,
      sessionGoal, // Preserve the session goal instead of clearing it
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
      timestamp: new Date().toISOString()
    };
    set(state);
    get().saveTimerState();
  },

  // Start timer
  startTimer: async (testDuration = null) => {
    const { hasStarted, mode, workMinutes, breakMinutes, sessionGoal } = get();
    
    if (!hasStarted) {
      // Starting a new session
      let duration = (mode === "work" ? workMinutes : breakMinutes) * 60;
      
      // Allow override for testing
      if (testDuration !== null) {
        duration = testDuration;
        console.log(`Timer started with test duration: ${duration} seconds`);
      }
      
      const type = mode === "work" ? "focus" : "break";
      
      const now = Date.now();
      const startTime = now;
      const endTime = now + (duration * 1000);
      
      // Update or create session data in localStorage for backward compatibility
      const existingSessionData = localStorage.getItem("soloSession");
      let sessionData;
      
      if (existingSessionData) {
        // Preserve existing session data (especially startTime) and update with timer info
        try {
          const existing = JSON.parse(existingSessionData);
          sessionData = {
            ...existing,
            sessionType: type,
            endTime: new Date(endTime).toISOString(),
            duration: duration,
            goal: sessionGoal,
            remainingSeconds: duration,
            startTime: existing.startTime || new Date().toISOString() // Preserve existing startTime
          };
        } catch {
          // Fallback if parsing fails
          sessionData = {
            sessionType: type,
            startTime: new Date().toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: duration,
            goal: sessionGoal,
            remainingSeconds: duration
          };
        }
      } else {
        // Create new session data
        sessionData = {
          sessionType: type,
          startTime: new Date().toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: duration,
          goal: sessionGoal,
          remainingSeconds: duration
        };
      }
      
      localStorage.setItem("soloSession", JSON.stringify(sessionData));
      
      const state = {
        hasStarted: true,
        remaining: duration,
        totalSeconds: duration,
        running: true,
        isExplicitlyPaused: false,
        mode,
        workMinutes,
        breakMinutes,
        sessionGoal,
        startTime: startTime,
        endTime: endTime,
        pausedAt: null,
        pausedRemaining: null,
        timestamp: new Date().toISOString()
      };
      set(state);
      
      // Stop and reset room timer if running
      try {
        const { useRoomTimerStore } = await import("./useRoomTimerStore.js");
        const roomTimerStore = useRoomTimerStore.getState();
        if (roomTimerStore.running) {
          console.log("⏰ [FRONTEND] Stopping room timer due to starting solo session");
          roomTimerStore.stopTimer();
        }
      } catch (error) {
        console.log("⏰ [FRONTEND] Could not stop room timer:", error);
      }
      
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
        timestamp: new Date().toISOString()
      };
      set(state);
      get().saveTimerState();
      
      // Update legacy localStorage for backward compatibility
      const existingData = localStorage.getItem("soloSession");
      if (existingData) {
        try {
          const data = JSON.parse(existingData);
          const updatedData = {
            ...data,
            endTime: new Date(newEndTime).toISOString(),
            remainingSeconds: newRemaining,
            startTime: data.startTime || new Date().toISOString() // Preserve or add startTime
          };
          localStorage.setItem("soloSession", JSON.stringify(updatedData));
        } catch (error) {
          console.error('Failed to update localStorage on resume:', error);
        }
      }
    }
    
    // Start music if enabled
    get().startMusicIfEnabled();
    
    // Execute timer start callbacks
    get().executeTimerStartCallbacks();
  },

  // Pause timer
  pauseTimer: () => {
    const currentState = get();
    const now = Date.now();
    const remaining = get().calculateRemainingTime();
    
    const state = {
      ...currentState,
      running: false,
      isExplicitlyPaused: true,
      pausedAt: now,
      pausedRemaining: remaining,
      timestamp: new Date().toISOString()
    };
    set(state);
    get().saveTimerState();
    
    // Update legacy localStorage for backward compatibility
    const existingData = localStorage.getItem("soloSession");
    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        const endTime = new Date(now + remaining * 1000);
        const updatedData = {
          ...data,
          endTime: endTime.toISOString(),
          remainingSeconds: remaining,
          startTime: data.startTime || new Date().toISOString() // Preserve or add startTime
        };
        localStorage.setItem("soloSession", JSON.stringify(updatedData));
      } catch (error) {
        console.error('Failed to update localStorage on pause:', error);
      }
    }
    
    // Pause music if enabled (for timer pause)
    get().pauseMusicIfEnabled();
    
    // Execute timer pause callbacks
    get().executeTimerPauseCallbacks();
  },

  // Stop timer
  stopTimer: () => {
    const currentState = get();
    console.log("⏹️ Stopping timer, preserving session goal:", currentState.sessionGoal);
    
    // Stop music if enabled (for manual stop)
    get().stopMusicIfEnabled();
    
    set({
      running: false,
      hasStarted: false,
      isExplicitlyPaused: false,
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
      sessionGoal: currentState.sessionGoal // Preserve the session goal
    });
    get().resetTimer();
    
    // Clear the session from localStorage
    localStorage.removeItem("soloSession");
    localStorage.removeItem("timerState");
  },

  // ============================================================================
  // ROOM TIMER SYNCHRONIZATION FUNCTIONS
  // ============================================================================

  // Sync timer with room state (for non-admin users) - Simplified and efficient
  syncTimerWithRoom: (timerData) => {
    console.log("🔄 [TIMER STORE] Syncing timer with room state:", timerData);
    
    const { sessionType, duration, startTime, remaining, isRunning } = timerData;
    const mode = sessionType === 'work' ? 'work' : 'break';
    
    // Calculate actual remaining time based on current state
    let actualRemaining = remaining;
    let actualRunning = isRunning;
    
    if (isRunning && startTime) {
      // Timer is running - calculate real-time remaining
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      actualRemaining = Math.max(0, duration - elapsed);
      
      // If timer has expired, mark as stopped
      if (actualRemaining <= 0) {
        actualRunning = false;
        actualRemaining = 0;
      }
    }
    
    // Set timer state based on calculated values
    const now = Date.now();
    const endTime = actualRunning ? now + (actualRemaining * 1000) : null;
    
    set({
      mode,
      remaining: actualRemaining,
      totalSeconds: duration,
      running: actualRunning,
      hasStarted: actualRemaining > 0 || !actualRunning,
      isExplicitlyPaused: !actualRunning && actualRemaining > 0,
      startTime: actualRunning ? now : null,
      endTime: endTime,
      pausedAt: !actualRunning && actualRemaining > 0 ? now : null,
      pausedRemaining: !actualRunning && actualRemaining > 0 ? actualRemaining : null,
      timestamp: new Date().toISOString()
    });
    
    console.log("🔄 [TIMER STORE] Timer synced - running:", actualRunning, "remaining:", actualRemaining);
    get().saveTimerState();
  },

  // Start timer with specific duration (for room sync)
  startTimerWithDuration: (duration, sessionType = 'work') => {
    console.log("🔄 [TIMER STORE] Starting timer with duration:", duration, "sessionType:", sessionType);
    
    const mode = sessionType === 'work' ? 'work' : 'break';
    const now = Date.now();
    const endTime = now + (duration * 1000);
    
    set({
      mode,
      remaining: duration,
      totalSeconds: duration,
      running: true,
      hasStarted: true,
      isExplicitlyPaused: false,
      startTime: now,
      endTime: endTime,
      pausedAt: null,
      pausedRemaining: null,
      timestamp: new Date().toISOString()
    });
    
    get().saveTimerState();
    get().startMusicIfEnabled();
    get().executeTimerStartCallbacks();
  },

  // Pause timer with specific remaining time (for room sync)
  pauseTimerWithRemaining: (remaining) => {
    console.log("🔄 [TIMER STORE] Pausing timer with remaining:", remaining);
    
    const now = Date.now();
    
    set({
      running: false,
      isExplicitlyPaused: true,
      remaining: remaining,
      pausedAt: now,
      pausedRemaining: remaining,
      timestamp: new Date().toISOString()
    });
    
    get().saveTimerState();
    get().pauseMusicIfEnabled();
    get().executeTimerPauseCallbacks();
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
      sessionGoal: currentState.sessionGoal, // Preserve the session goal
      timestamp: new Date().toISOString()
    };
    set(state);
    get().saveTimerState();
    
    // Clear the current session from localStorage
    localStorage.removeItem("soloSession");
  },

  // Update remaining time based on absolute timestamps
  updateRemaining: () => {
    const remaining = Math.max(0, get().calculateRemainingTime());
    const state = {
      ...get(),
      remaining: remaining,
      timestamp: new Date().toISOString()
    };
    set(state);
    get().saveTimerState();
    
    // Update legacy localStorage for backward compatibility
    const existingData = localStorage.getItem("soloSession");
    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        const now = Date.now();
        const endTime = new Date(now + remaining * 1000);
        const updatedData = {
          ...data,
          endTime: endTime.toISOString(),
          remainingSeconds: remaining,
          startTime: data.startTime || new Date().toISOString() // Preserve or add startTime
        };
        localStorage.setItem("soloSession", JSON.stringify(updatedData));
      } catch (error) {
        console.error('Failed to update localStorage:', error);
      }
    }
  },

  // Timer completion handler
  handleTimerCompletion: () => {
    const currentState = get();
    console.log("🔥 handleTimerCompletion called, state:", {
      hasStarted: currentState.hasStarted,
      remaining: currentState.remaining,
      mode: currentState.mode,
      endTime: currentState.endTime,
      timerEndCallbacks: currentState.timerEndCallbacks.length
    });
    
    // Prevent multiple completion triggers
    if (!currentState.hasStarted || currentState.remaining > 0) {
      console.log("⚠️ Completion prevented - invalid state");
      return;
    }

    const wasWorkMode = currentState.mode === "work";
    console.log("✅ Timer completed, was work mode:", wasWorkMode);
    
    // Play notification sound
    get().playNotificationSound();
    
    // Stop music if enabled - IMPORTANT: Do this BEFORE any state changes
    console.log("🎵 About to call stopMusicIfEnabled for natural completion");
    // Capture the current state before any changes
    const stateForMusicControl = {
      mode: currentState.mode,
      hasStarted: currentState.hasStarted,
      remaining: currentState.remaining
    };
    get().stopMusicIfEnabledWithState(stateForMusicControl);
    
    // Execute timer end callbacks first (this saves the completed session)
    // NOTE: Don't clear localStorage until after callbacks have run
    console.log("📞 About to execute timer end callbacks...");
    get().executeTimerEndCallbacks();
    
    // Auto-switch mode after work session completion
    if (wasWorkMode) {
      // Switch to break mode
      const breakDuration = currentState.breakMinutes * 60;
      console.log("🔄 Switching to break mode, preserving session goal:", currentState.sessionGoal);
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
        sessionGoal: currentState.sessionGoal, // Preserve the session goal
        timestamp: new Date().toISOString()
      });
      
      // Show notification for break time
      notificationService.showTimerCompleteNotification('work');
    } else {
      // Break completed - reset to work mode but don't auto-start
      const workDuration = currentState.workMinutes * 60;
      console.log("🔄 Switching to work mode, preserving session goal:", currentState.sessionGoal);
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
        sessionGoal: currentState.sessionGoal, // Preserve the session goal
        timestamp: new Date().toISOString()
      });
      
      // Show notification for work time
      notificationService.showTimerCompleteNotification('break');
    }
    
    // Clear timer state from localStorage (soloSession is cleared by markCompleted callback)
    localStorage.removeItem("timerState");
    
    // Save the new state
    get().saveTimerState();
  },

  // Set work/break minutes
  setWorkMinutes: (minutes) => {
    const state = {
      ...get(),
      workMinutes: minutes,
      timestamp: new Date().toISOString()
    };
    if (get().mode === "work" && !get().hasStarted) {
      state.remaining = minutes * 60;
      state.totalSeconds = minutes * 60;
    }
    set(state);
    localStorage.setItem('pomate_workMinutes', minutes.toString());
    get().saveTimerState();
  },

  setBreakMinutes: (minutes) => {
    const state = {
      ...get(),
      breakMinutes: minutes,
      timestamp: new Date().toISOString()
    };
    if (get().mode === "break" && !get().hasStarted) {
      state.remaining = minutes * 60;
      state.totalSeconds = minutes * 60;
    }
    set(state);
    localStorage.setItem('pomate_breakMinutes', minutes.toString());
    get().saveTimerState();
  },

  setStrictMode: (enabled) => {
    set({ isStrictMode: enabled, timestamp: new Date().toISOString() });
    localStorage.setItem('pomate_strictMode', enabled.toString());
    get().saveTimerState();
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
      timestamp: new Date().toISOString()
    };
    set(state);
    get().saveTimerState();
  },

  // Set session goal
  setSessionGoal: (goal) => {
    const state = {
      ...get(),
      sessionGoal: goal,
      timestamp: new Date().toISOString()
    };
    set(state);
    get().saveTimerState();
  },

  // Clear all timer state (used during logout)
  clearAllTimerState: () => {
    console.log("🧹 Clearing all timer state");
    
    // Clear all timer state first
    set({
      remaining: 25 * 60, // Default 25 minutes
      totalSeconds: 25 * 60,
      running: false,
      hasStarted: false,
      mode: "work",
      sessionGoal: "",
      isExplicitlyPaused: false,
      startTime: null,
      endTime: null,
      pausedAt: null,
      pausedRemaining: null,
      timestamp: new Date().toISOString(),
      workMinutes: 25,
      breakMinutes: 5,
      timerStartCallbacks: [],
      timerEndCallbacks: [],
      timerPauseCallbacks: []
    });
    
    // Clear all localStorage
    localStorage.removeItem("timerState");
    localStorage.removeItem("soloSession");
    
    console.log("🧹 Timer state completely cleared");
  },

  // Callback management
  onTimerStart: (callback) => {
    const callbacks = [...get().timerStartCallbacks, callback];
    set({ timerStartCallbacks: callbacks });
    return () => {
      const currentCallbacks = get().timerStartCallbacks;
      set({ timerStartCallbacks: currentCallbacks.filter(cb => cb !== callback) });
    };
  },

  onTimerEnd: (callback) => {
    const callbacks = [...get().timerEndCallbacks, callback];
    set({ timerEndCallbacks: callbacks });
    return () => {
      const currentCallbacks = get().timerEndCallbacks;
      set({ timerEndCallbacks: currentCallbacks.filter(cb => cb !== callback) });
    };
  },

  onTimerPause: (callback) => {
    const callbacks = [...get().timerPauseCallbacks, callback];
    set({ timerPauseCallbacks: callbacks });
    return () => {
      const currentCallbacks = get().timerPauseCallbacks;
      set({ timerPauseCallbacks: currentCallbacks.filter(cb => cb !== callback) });
    };
  },

  executeTimerStartCallbacks: () => {
    get().timerStartCallbacks.forEach(callback => callback());
  },

  executeTimerEndCallbacks: () => {
    const callbacks = get().timerEndCallbacks;
    console.log("📞 Executing timer end callbacks:", callbacks.length);
    callbacks.forEach((callback, index) => {
      console.log(`📞 Calling timer end callback ${index + 1}/${callbacks.length}`);
      try {
        callback();
        console.log(`✅ Timer end callback ${index + 1} completed successfully`);
      } catch (error) {
        console.error(`❌ Timer end callback ${index + 1} failed:`, error);
      }
    });
    console.log("📞 All timer end callbacks completed");
  },

  executeTimerPauseCallbacks: () => {
    get().timerPauseCallbacks.forEach(callback => callback());
  },

  // Play notification sound
  playNotificationSound: () => {
    try {
      const audio = new Audio('/pomate.mp3');
      audio.volume = 0.7; // Set volume to 70%
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
      });
    } catch (error) {
      console.warn('Could not create notification sound:', error);
    }
  },

  // Music control functions
  startMusicIfEnabled: () => {
    // Import music player store dynamically to avoid circular dependencies
    import('./useMusicPlayerStore').then(({ default: useMusicPlayerStore }) => {
      const musicState = useMusicPlayerStore.getState();
      const currentState = get();
      
      console.log('🎵 Checking music start conditions:', {
        autoPlayOnSessionStart: musicState.autoPlayOnSessionStart,
        hasEmbedUrl: !!musicState.embedUrl,
        embedUrl: musicState.embedUrl,
        sessionType: currentState.mode
      });
      
      // Only auto-play music for focus sessions (work mode), not breaks
      if (musicState.autoPlayOnSessionStart && musicState.embedUrl && currentState.mode === 'work') {
        console.log('🎵 Triggering music play event for focus session');
        // Trigger music play by dispatching a custom event
        window.dispatchEvent(new CustomEvent('musicPlayer:play'));
      } else {
        console.log('🎵 Music start conditions not met - not a focus session or settings disabled');
      }
    });
  },

  stopMusicIfEnabled: () => {
    // Import music player store dynamically to avoid circular dependencies
    import('./useMusicPlayerStore').then(({ default: useMusicPlayerStore }) => {
      const musicState = useMusicPlayerStore.getState();
      const currentState = get();
      
      console.log('🎵 Checking music stop conditions:', {
        stopMusicOnSessionEnd: musicState.stopMusicOnSessionEnd,
        hasEmbedUrl: !!musicState.embedUrl,
        embedUrl: musicState.embedUrl,
        sessionType: currentState.mode,
        sessionEndMusicBehavior: musicState.sessionEndMusicBehavior,
        hasStarted: currentState.hasStarted,
        remaining: currentState.remaining
      });
      
      // Only trigger music events for focus sessions (work mode), not breaks
      if (musicState.stopMusicOnSessionEnd && musicState.embedUrl && currentState.mode === 'work') {
        console.log('🎵 Triggering music event for focus session end, behavior:', musicState.sessionEndMusicBehavior);
        
        if (musicState.sessionEndMusicBehavior === 'stop') {
          // Stop music completely (restart from beginning)
          console.log('🎵 Dispatching musicPlayer:stop event');
          window.dispatchEvent(new CustomEvent('musicPlayer:stop'));
        } else {
          // Pause music (continue where left off)
          console.log('🎵 Dispatching musicPlayer:pause event');
          window.dispatchEvent(new CustomEvent('musicPlayer:pause'));
        }
      } else {
        console.log('🎵 Music stop conditions not met:', {
          stopMusicOnSessionEnd: musicState.stopMusicOnSessionEnd,
          hasEmbedUrl: !!musicState.embedUrl,
          isWorkMode: currentState.mode === 'work',
          mode: currentState.mode
        });
      }
    });
  },

  stopMusicIfEnabledWithState: (capturedState) => {
    // Import music player store dynamically to avoid circular dependencies
    import('./useMusicPlayerStore').then(({ default: useMusicPlayerStore }) => {
      const musicState = useMusicPlayerStore.getState();
      
      console.log('🎵 Checking music stop conditions with captured state:', {
        stopMusicOnSessionEnd: musicState.stopMusicOnSessionEnd,
        hasEmbedUrl: !!musicState.embedUrl,
        embedUrl: musicState.embedUrl,
        sessionType: capturedState.mode,
        sessionEndMusicBehavior: musicState.sessionEndMusicBehavior,
        hasStarted: capturedState.hasStarted,
        remaining: capturedState.remaining
      });
      
      // Only trigger music events for focus sessions (work mode), not breaks
      if (musicState.stopMusicOnSessionEnd && musicState.embedUrl && capturedState.mode === 'work') {
        console.log('🎵 Triggering music event for focus session end (natural completion), behavior:', musicState.sessionEndMusicBehavior);
        
        if (musicState.sessionEndMusicBehavior === 'stop') {
          // Stop music completely (restart from beginning)
          console.log('🎵 Dispatching musicPlayer:stop event (natural completion)');
          window.dispatchEvent(new CustomEvent('musicPlayer:stop'));
        } else {
          // Pause music (continue where left off)
          console.log('🎵 Dispatching musicPlayer:pause event (natural completion)');
          window.dispatchEvent(new CustomEvent('musicPlayer:pause'));
        }
      } else {
        console.log('🎵 Music stop conditions not met (natural completion):', {
          stopMusicOnSessionEnd: musicState.stopMusicOnSessionEnd,
          hasEmbedUrl: !!musicState.embedUrl,
          isWorkMode: capturedState.mode === 'work',
          mode: capturedState.mode
        });
      }
    });
  },

  pauseMusicIfEnabled: () => {
    // Import music player store dynamically to avoid circular dependencies
    import('./useMusicPlayerStore').then(({ default: useMusicPlayerStore }) => {
      const musicState = useMusicPlayerStore.getState();
      const currentState = get();
      
      console.log('🎵 Checking music pause conditions:', {
        pauseMusicOnTimerPause: musicState.pauseMusicOnTimerPause,
        hasEmbedUrl: !!musicState.embedUrl,
        embedUrl: musicState.embedUrl,
        sessionType: currentState.mode,
        hasStarted: currentState.hasStarted,
        remaining: currentState.remaining
      });
      
      // Only trigger music pause for focus sessions (work mode), not breaks
      if (musicState.pauseMusicOnTimerPause && musicState.embedUrl && currentState.mode === 'work') {
        console.log('🎵 Triggering music pause for timer pause');
        window.dispatchEvent(new CustomEvent('musicPlayer:pause'));
      } else {
        console.log('🎵 Music pause conditions not met:', {
          pauseMusicOnTimerPause: musicState.pauseMusicOnTimerPause,
          hasEmbedUrl: !!musicState.embedUrl,
          isWorkMode: currentState.mode === 'work',
          mode: currentState.mode
        });
      }
    });
  },

  // Get active session data for dashboard
  getActiveSession: () => {
    const state = get();
    
    // First try to get from current state
    if (state.hasStarted && state.endTime) {
      const remaining = state.calculateRemainingTime();
      
      if (remaining <= 0) {
        // Session completed
        return null;
      }
      
      return {
        sessionType: state.mode === "work" ? "focus" : "break",
        endTime: new Date(state.endTime).toISOString(),
        duration: state.totalSeconds,
        goal: state.sessionGoal,
        remainingSeconds: remaining
      };
    }
    
    // Fallback to legacy localStorage format for backward compatibility
    const existingData = localStorage.getItem("soloSession");
    if (!existingData) return null;
    
    try {
      const data = JSON.parse(existingData);
      const now = Date.now();
      const end = new Date(data.endTime).getTime();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));
      
      if (diff <= 0) {
        // Session completed
        localStorage.removeItem("soloSession");
        return null;
      }
      
      return {
        ...data,
        remainingSeconds: diff
      };
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  }
}));

// Debug: Expose timer store to window for debugging
if (typeof window !== 'undefined') {
  window.__TIMER_STORE_DEBUG__ = useTimerStore;
}

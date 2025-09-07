import { useEffect, useRef } from "react";
import { useTimerStore } from "../store/useTimerStore";
import { useAuthStore } from "../store/useAuthStore";

const GlobalTimer = () => {
  const { authUser } = useAuthStore();
  const {
    remaining,
    running,
    hasStarted,
    initializeTimer,
    updateRemaining,
    handleTimerCompletion,
    calculateRemainingTime
  } = useTimerStore();
  
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Initialize timer on mount only if user is authenticated
  useEffect(() => {
    if (authUser) {
      try {
        initializeTimer();
      } catch (error) {
        console.error("Error initializing timer:", error);
        // Continue without timer if initialization fails
      }
    } else {
      console.log("🚫 No authenticated user, skipping timer initialization");
    }
  }, [initializeTimer, authUser]);



  // Timer effect - uses requestAnimationFrame for accurate timing
  useEffect(() => {
    // Don't run timer if user is not authenticated
    if (!authUser) {
      console.log("🚫 No authenticated user, timer not running");
      return;
    }
    
    if (running) {
      // Clear any existing animation frame first
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      const updateTimer = (timestamp) => {
        const currentState = useTimerStore.getState();
        
        // Ensure we have a valid state
        if (!currentState.hasStarted) {
          animationFrameRef.current = requestAnimationFrame(updateTimer);
          return;
        }
        
        // Calculate remaining time based on absolute timestamps
        const remaining = currentState.calculateRemainingTime();
        
        // Only update if a second has passed or if remaining time changed significantly
        const now = Date.now();
        if (now - lastUpdateRef.current >= 1000 || remaining !== currentState.remaining) {
          lastUpdateRef.current = now;
          
          if (remaining <= 0) {
            console.log("⏰ GlobalTimer detected completion, remaining:", remaining);
            // Ensure timer shows 00:00 before completion
            currentState.updateRemaining();
            // Timer completed
            setTimeout(() => {
              console.log("⏰ GlobalTimer calling handleTimerCompletion after delay");
              currentState.handleTimerCompletion();
            }, 100); // Small delay to ensure UI updates to 00:00
            return;
          } else {
            // Update remaining time
            currentState.updateRemaining();
          }
        }
        
        // Continue the animation loop
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };
      
      // Start the animation loop
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      // Clear animation frame when timer is not running
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [running, updateRemaining, handleTimerCompletion]);

  // Save timer state periodically while running
  useEffect(() => {
    // Don't save timer state if user is not authenticated
    if (!authUser) {
      return;
    }
    
    if (running) {
      const saveInterval = setInterval(() => {
        const currentState = useTimerStore.getState();
        currentState.saveTimerState();
      }, 5000); // Save every 5 seconds while running
      
      return () => clearInterval(saveInterval);
    }
  }, [running, authUser]);

  // Cleanup timer when user logs out
  useEffect(() => {
    if (!authUser) {
      // User logged out, check if we should stop timers
      try {
        const currentState = useTimerStore.getState();
        if (currentState && typeof currentState.running !== 'undefined' && currentState.running) {
          if (currentState.isStrictMode) {
            console.log("🔒 Strict mode: stopping timer on logout");
            currentState.stopTimer();
          } else {
            console.log("⏸️ Normal mode: pausing timer on logout (state preserved)");
            // Just pause, don't stop completely
            currentState.stopTimer();
          }
        }
      } catch (error) {
        console.error("Error during timer cleanup on logout:", error);
        // Continue with logout even if timer cleanup fails
      }
    }
  }, [authUser]);

  // This component doesn't render anything - it just manages the timer
  return null;
};

export default GlobalTimer;

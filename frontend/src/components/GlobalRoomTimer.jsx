import { useEffect, useRef, useCallback } from "react";
import { useRoomTimerStore } from "../store/useRoomTimerStore";
import { useAuthStore } from "../store/useAuthStore";

const GlobalRoomTimer = () => {
  const { socket } = useAuthStore();
  const { syncTimerWithRoom, handleTimerCompletion, running } = useRoomTimerStore();
  
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Handle timer updates from server
  useEffect(() => {
    if (!socket) return;
    
    const handleTimerUpdate = (data) => {
      console.log("⏰ [GLOBAL TIMER] Received timer update:", data);
      syncTimerWithRoom(data);
    };
    
    // Only listen to timer updates, don't request sync (handled by RoomPage)
    socket.on('timer:update', handleTimerUpdate);
    
    return () => {
      socket.off('timer:update', handleTimerUpdate);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [socket, syncTimerWithRoom]);
  
  // Animation frame for smooth timer updates
  const updateTimer = useCallback((timestamp) => {
    if (!lastUpdateRef.current) {
      lastUpdateRef.current = timestamp;
    }
    
    const delta = timestamp - lastUpdateRef.current;
    
    // Update at ~60fps
    if (delta > 16) {
      const currentState = useRoomTimerStore.getState();
      
      if (currentState.running && currentState.endTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((currentState.endTime - now) / 1000));
        
        if (remaining <= 0) {
          // Timer completed
          handleTimerCompletion();
        } else if (Math.abs(remaining - currentState.remaining) >= 1) {
          // Only update if the change is significant (at least 1 second)
          useRoomTimerStore.setState({ remaining });
        }
      }
      
      lastUpdateRef.current = timestamp;
    }
    
    animationFrameRef.current = requestAnimationFrame(updateTimer);
  }, [handleTimerCompletion]);
  
  // Start/stop animation frame based on timer state
  useEffect(() => {
    if (running) {
      lastUpdateRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [running, updateTimer]);
  
  return null; // This component doesn't render anything
};

export default GlobalRoomTimer;

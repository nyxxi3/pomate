import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, LogOut, Briefcase, Coffee, X, MessageSquare, CheckSquare, Maximize2 } from "lucide-react";
import { useRoomStore } from "../store/useRoomStore";
import { useAuthStore } from "../store/useAuthStore";
import { useRoomTimerStore } from "../store/useRoomTimerStore";
import { useRoomChatStore } from "../store/useRoomChatStore";
import { useZoomStore } from "../store/useZoomStore";
import SoloTimer from "../components/solo/SoloTimer";
import SoloControls from "../components/solo/SoloControls";
import GlobalRoomTimer from "../components/GlobalRoomTimer";
import ZoomTimer from "../components/ZoomTimer";
import GoalsCard from "../components/GoalsCard";
import ProgressCard from "../components/ProgressCard";
import RoomChatContainer from "../components/RoomChatContainer";
import { useRoomSessionStorage } from "../lib/useRoomSessionStorage";
import { fetchStats } from "../lib/sessionsApi";
import toast from "react-hot-toast";

const formatTime = (seconds) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m} : ${s}`;
};

// ============================================================================
// CLEAN ROOM PAGE - EXPLICIT JOIN/LEAVE WITH DATABASE AS SOURCE OF TRUTH
// ============================================================================

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { authUser, socket } = useAuthStore();
  const { 
    currentRoom, 
    participants, 
    loadRoom,
    loadCurrentRoomFromStorage,
    saveCurrentRoomToStorage,
    clearCurrentRoomFromStorage,
    initializeRoomStore,
    joinRoom, 
    leaveRoom, 
    isJoiningRoom,
    isLeavingRoom,
    hostGracePeriod,
    startParticipantsPolling,
    stopParticipantsPolling,
    handleParticipantJoined,
    handleParticipantLeft,
    handleNewMessage,
    participantAccessDenied,
    clearParticipantAccessDenied
  } = useRoomStore();
  const {
    running: isRunning,
    remaining,
    mode,
    hasStarted,
    startTimer,
    stopTimer,
    skipBreak,
    workMinutes,
    breakMinutes,
    setWorkMinutes,
    setBreakMinutes,
    syncTimerWithRoom,
    startTimerWithDuration,
    userFocusGoal,
    restoreTimerState
  } = useRoomTimerStore();
  
  // Compute sessionType from mode
  const sessionType = mode;
  
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [autoMode, setAutoMode] = useState(false); // Automatic session chaining
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isRefreshingParticipants, setIsRefreshingParticipants] = useState(false);

  // Throttling for timer sync requests
  const lastSyncRequestRef = useRef(0);
  
  // Prevent multiple initializations
  const isInitializingRef = useRef(false);

  // Room session tracking
  const { start: startRoomSession, markCompleted: markRoomSessionCompleted } = useRoomSessionStorage();

  // Load stats function
  const loadStats = async () => {
    try {
      const fetchedStats = await fetchStats();
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // ============================================================================
  // ROOM LOADING AND JOINING
  // ============================================================================

  // Handle participant access denied
  useEffect(() => {
    if (participantAccessDenied) {
      console.log("🚪 [FRONTEND] Participant access denied, redirecting to dashboard");
      clearParticipantAccessDenied();
      navigate("/dashboard");
    }
  }, [participantAccessDenied, navigate, clearParticipantAccessDenied]);

  // Restore room state on page load/refresh
  useEffect(() => {
    console.log("🏠 [FRONTEND] Page load/refresh - restoring room state");
    if (roomId && authUser && !currentRoom) {
      console.log("🏠 [FRONTEND] No current room, trying to restore from localStorage");
      const restoredRoom = initializeRoomStore();
      if (restoredRoom && restoredRoom._id === roomId) {
        console.log("🏠 [FRONTEND] Successfully restored room from localStorage:", restoredRoom._id);
        // Also restore timer state with a delay to ensure it happens after other initialization
        setTimeout(() => {
          console.log("⏰ [FRONTEND] Restoring timer state on page load (delayed)");
          restoreTimerState(roomId);
        }, 100);
      }
    }
  }, [roomId, authUser, currentRoom, initializeRoomStore, restoreTimerState]);

  useEffect(() => {
    console.log("🏠 [FRONTEND] RoomPage useEffect() START - roomId:", roomId);
    console.log("🏠 [FRONTEND] Auth user:", authUser ? "EXISTS" : "NULL");
    console.log("🏠 [FRONTEND] Current room state:", currentRoom ? "EXISTS" : "NULL");
    
    // Prevent multiple initializations
    if (isInitializingRef.current) {
      console.log("🏠 [FRONTEND] Already initializing, skipping...");
      return;
    }
    
    const initializeRoom = async () => {
      try {
        isInitializingRef.current = true;
        setIsLoading(true);
        
        // Initialize room store with cached data first
        let room = initializeRoomStore();
        console.log("🏠 [FRONTEND] Room from store initialization:", room ? "FOUND" : "NOT FOUND");
        
        // If no room in store or room ID doesn't match, try localStorage
        if (!room || room._id !== roomId) {
          room = loadCurrentRoomFromStorage();
          console.log("🏠 [FRONTEND] Room from localStorage:", room ? "FOUND" : "NOT FOUND");
        }
        
        // If still no room or room ID doesn't match, load from database
        if (!room || room._id !== roomId) {
          console.log("🏠 [FRONTEND] Loading room data from database for roomId:", roomId);
          room = await loadRoom(roomId);
          console.log("🏠 [FRONTEND] Room loaded from database result:", room ? "SUCCESS" : "FAILED");
        } else {
          console.log("🏠 [FRONTEND] Using cached room from store/localStorage");
        }
        
        if (!room) {
          console.log("🏠 [FRONTEND] Room not found, redirecting to dashboard");
          console.log("🏠 [FRONTEND] Room loading failed for roomId:", roomId);
          console.log("🏠 [FRONTEND] Auth user ID:", authUser?._id);
          toast.error("Room not found or you don't have access to it");
          navigate("/dashboard");
          return;
        }

        // Set auto mode from room data
        if (room.autoMode !== undefined) {
          setAutoMode(room.autoMode);
        }

        // Check if user is the room creator
        const isCreator = room.creator?._id === authUser._id || room.creator === authUser._id;
        
        // Check if user is already a participant (robust check)
        const isParticipant = room.participants.some(participant => {
          // Handle different participant formats (populated vs unpopulated)
          let participantId;
          if (typeof participant === 'string') {
            participantId = participant;
          } else if (participant && participant._id) {
            participantId = participant._id.toString();
          } else if (participant) {
            participantId = participant.toString();
          }
          
          const userIdStr = authUser._id.toString();
          const isMatch = participantId === userIdStr;
          
          console.log("🔍 [FRONTEND] Participant check:", {
            participant,
            participantId,
            userIdStr,
            isMatch
          });
          
          return isMatch;
        });

        console.log("🏠 [FRONTEND] Room initialization debug:", {
          userId: authUser._id,
          userIdStr: authUser._id.toString(),
          roomId: roomId,
          participants: room.participants.map(p => p._id ? p._id.toString() : p.toString()),
          isParticipant: isParticipant,
          isCreator: isCreator,
          roomCreator: room.creator?._id ? room.creator._id.toString() : room.creator?.toString(),
          roomName: room.name,
          roomMaxParticipants: room.maxParticipants,
          roomCurrentParticipants: room.participants.length
        });

        // CREATOR PRIORITY: If user is the creator, they should always be able to access their room
        if (isCreator) {
          console.log("🏠 [FRONTEND] User is the room creator - ensuring creator access");
          
          // If creator is not in participants list, add them back
          if (!isParticipant) {
            console.log("🏠 [FRONTEND] Creator not in participants list, adding them back");
            const joinSuccess = await joinRoom(roomId);
            
            if (!joinSuccess) {
              console.log("🏠 [FRONTEND] Failed to restore creator access, redirecting to dashboard");
              navigate("/dashboard");
              return;
            }
          } else {
            console.log("🏠 [FRONTEND] Creator is already a participant, access confirmed");
          }
        } else if (!isParticipant) {
          // Non-creator user not a participant, try to join
          console.log("🏠 [FRONTEND] User not a participant, attempting to join room");
          console.log("🏠 [FRONTEND] Join attempt details:", {
            roomId: roomId,
            roomName: room.name,
            roomIsPublic: room.isPublic,
            roomMaxParticipants: room.maxParticipants,
            roomCurrentParticipants: room.participants.length,
            userId: authUser._id
          });
          
          const joinSuccess = await joinRoom(roomId);
          
          if (!joinSuccess) {
            console.log("🏠 [FRONTEND] Failed to join room, redirecting to dashboard");
            toast.error("Unable to join room. You may not have permission or the room may be full.");
            navigate("/dashboard");
            return;
          }
        } else {
          console.log("🏠 [FRONTEND] User is already a participant, skipping join");
        }

         setHasJoined(true);
         console.log("🏠 [FRONTEND] Successfully joined room");
         
         // Clear any previous access denied flag
         clearParticipantAccessDenied();
         
         // Load user stats
         await loadStats();
         
         // Start participants polling
         startParticipantsPolling(roomId);
        
      } catch (error) {
        console.error("🏠 [FRONTEND] Error initializing room:", error);
        toast.error("Failed to load room");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    };

    if (roomId && authUser) {
      initializeRoom();
    }

    // Cleanup on unmount
    return () => {
      console.log("🏠 [FRONTEND] RoomPage cleanup - component unmounting");
      // Reset initialization flag
      isInitializingRef.current = false;
      // Stop participants polling
      stopParticipantsPolling();
      // DON'T clear room timer state on unmount - preserve it for navigation/refresh
      // Timer state should only be cleared when user explicitly leaves room
      // Don't automatically leave room on unmount
      // User might be navigating to another page temporarily
      // Don't clear room from localStorage - keep it for when user comes back
    };
  }, [roomId, authUser, navigate, stopParticipantsPolling, startParticipantsPolling]);

  // ============================================================================
  // SOCKET EVENT HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket || !hasJoined) return;

    console.log("🔌 [FRONTEND] Setting up socket event listeners");

    // Only join socket room if not already in it (prevent duplicate joins on navigation)
    const isAlreadyInSocketRoom = socket.rooms && socket.rooms.has(roomId);
    console.log("🔌 [FRONTEND] Socket connection debug:", {
      roomId: roomId,
      hasSocket: !!socket,
      socketConnected: socket?.connected,
      isAlreadyInSocketRoom: isAlreadyInSocketRoom,
      socketRooms: socket?.rooms ? Array.from(socket.rooms) : 'no rooms'
    });
    
    // CRITICAL: Only emit joinRoom if we're not already in the socket room
    // This ensures all users can join the socket room for real-time communication
    if (!isAlreadyInSocketRoom) {
      console.log("🔌 [FRONTEND] Joining socket room for real-time communication");
      socket.emit("joinRoom", { roomId });
    } else {
      console.log("🔌 [FRONTEND] Already in socket room, skipping join");
    }

    // Handle participant events
    const handleRoomParticipantJoined = (data) => {
      handleParticipantJoined(data);
      
      // Admin transfer handled silently - no annoying toasts
      if (data.newAdmin) {
        console.log("🔌 [FRONTEND] Admin transferred to:", data.newAdmin.username);
        // No toast notifications for admin transfers
      }
    };
    
    const handleRoomParticipantLeft = (data) => {
      handleParticipantLeft(data);
      
      // Admin transfer handled silently - no annoying toasts
      if (data.newAdmin) {
        console.log("🔌 [FRONTEND] Admin transferred to:", data.newAdmin.username);
        // No toast notifications for admin transfers
      }
    };

    // Handle admin transfer events
    const handleAdminTransferred = (data) => {
      const { newAdminId, previousAdminId } = data;
      const { currentRoom, setCurrentRoom } = useRoomStore.getState();
      
      if (currentRoom) {
        // Create updated room object with new admin
        const updatedRoom = {
          ...currentRoom,
          creator: {
            ...currentRoom.creator,
            _id: newAdminId,
            username: participants.find(p => p._id === newAdminId)?.username || 'Unknown'
          }
        };
        
        // Update the room in the store
        setCurrentRoom(updatedRoom);
      }

      // Admin transfer handled silently - no annoying toasts
      console.log("🔌 [FRONTEND] Admin transferred from", previousAdminId, "to", newAdminId);
      // No toast notifications for admin transfers
    };

    // Handle host disconnection (grace period started)
    const handleHostDisconnected = (data) => {
      const { hostId, gracePeriod, message } = data;
      console.log('🔌 [FRONTEND] Host disconnected, grace period started:', data);
      
      // Only show warning to the host themselves - no annoying notifications to others
      if (authUser?._id === hostId) {
        toast.warning('You disconnected. Reconnect within 30 seconds to maintain host control.', { duration: 8000 });
      }
    };

    // Handle host reconnection (grace period ended successfully)
    const handleHostReconnected = (data) => {
      const { hostId, message } = data;
      console.log('🔌 [FRONTEND] Host reconnected:', data);
      
      // Don't show toast for host reconnection - it's expected behavior
      // The visual indicator will disappear automatically
    };

    // Set up socket event listeners
    socket.on("roomParticipantJoined", handleRoomParticipantJoined);
    socket.on("roomParticipantLeft", handleRoomParticipantLeft);
    socket.on("roomParticipantDisconnected", useRoomStore.getState().handleParticipantDisconnected);
    socket.on("roomDeleted", useRoomStore.getState().handleRoomDeleted);
    socket.on("newMessage", handleNewMessage);
    socket.on("adminTransferred", handleAdminTransferred);
    socket.on("hostDisconnected", handleHostDisconnected);
    socket.on("hostReconnected", handleHostReconnected);

    // Timer synchronization event handlers are now in a separate useEffect

    // Handle socket errors
    socket.on("error", (data) => {
      console.error("🔌 [FRONTEND] Socket error:", data.message);
      toast.error(data.message);
    });

    // Cleanup socket listeners
    return () => {
      console.log("🔌 [FRONTEND] Cleaning up socket event listeners");
      socket.off("roomParticipantJoined", handleRoomParticipantJoined);
      socket.off("roomParticipantLeft", handleRoomParticipantLeft);
      socket.off("roomParticipantDisconnected", useRoomStore.getState().handleParticipantDisconnected);
      socket.off("roomDeleted", useRoomStore.getState().handleRoomDeleted);
      socket.off("newMessage", handleNewMessage);
      socket.off("adminTransferred", handleAdminTransferred);
      socket.off("hostDisconnected", handleHostDisconnected);
      socket.off("hostReconnected", handleHostReconnected);
      socket.off("error");

      // Leave socket room for real-time communication only
      // DO NOT emit "leaveRoom" as this triggers host transfer logic
      // The user should only leave the room via explicit leave action
      socket.leave(roomId);
    };
  }, [socket, roomId, hasJoined, authUser]);

  // ============================================================================
  // TIMER INTEGRATION
  // ============================================================================
  
  // Use timer state from the store
  // If timer hasn't started and remaining is 0, show the work duration
  const remainingSeconds = remaining > 0 ? remaining : (sessionType === 'work' ? workMinutes * 60 : breakMinutes * 60);
  
  // Debug timer state
  console.log('🔍 [ROOMPAGE] Timer state:', { isRunning, hasStarted, remaining, mode, sessionType });
  const timerInterval = useRef(null);

  // Update timer duration when work/break minutes change
  useEffect(() => {
    if (currentRoom && !isRunning) {
      // Only set timer settings if they haven't been restored from localStorage
      // Check if timer has been restored by looking at localStorage
      const savedTimerState = localStorage.getItem('pomate_room_timer_state');
      if (!savedTimerState) {
        console.log("⏰ [FRONTEND] No saved timer state, setting from room data");
        setWorkMinutes(currentRoom.workDuration);
        setBreakMinutes(currentRoom.breakDuration);
      } else {
        console.log("⏰ [FRONTEND] Saved timer state exists, not overriding with room data");
      }
    }
  }, [currentRoom, setWorkMinutes, setBreakMinutes, isRunning]);

  // ============================================================================
  // EXPLICIT LEAVE ROOM HANDLER
  // ============================================================================

  // Handle transferring admin rights to another participant
  const handleMakeAdmin = async (userId) => {
    if (!isAdmin) {
      toast.error('Only the current admin can transfer admin rights');
      return;
    }

    try {
      const { socket, currentRoom } = useRoomStore.getState();
      if (!socket || !currentRoom) return;

      // Emit event to transfer admin rights
      socket.emit('transferAdmin', { 
        roomId: currentRoom._id, 
        newAdminId: userId 
      });

      toast.success('Admin rights transferred successfully');
    } catch (error) {
      console.error('Error transferring admin rights:', error);
      toast.error('Failed to transfer admin rights');
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom || !authUser) return;
    
    try {
      // Stop any running timers
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      
      // Clear room timer state
      useRoomTimerStore.getState().clearAllTimerState();
      
      // Clear room chat state
      useRoomChatStore.getState().clearMessages();
      
      // Stop participants polling
      stopParticipantsPolling();
      
      // Leave the room
      const success = await leaveRoom(currentRoom._id);
      
      if (success) {
        // Clear room from localStorage when user actually leaves
        clearCurrentRoomFromStorage();
        // Navigate to dashboard with replace to avoid back button issues
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("Failed to leave room. Please try again.");
    }
  };

  // ============================================================================
  // TIMER INTEGRATION
  // ============================================================================

  useEffect(() => {
    if (currentRoom && !isRunning) {
      // Only set timer settings if they haven't been restored from localStorage
      const savedTimerState = localStorage.getItem('pomate_room_timer_state');
      if (!savedTimerState) {
        console.log("⏰ [FRONTEND] No saved timer state, setting from room data (second effect)");
        setWorkMinutes(currentRoom.workDuration);
        setBreakMinutes(currentRoom.breakDuration);
      } else {
        console.log("⏰ [FRONTEND] Saved timer state exists, not overriding with room data (second effect)");
      }
    }
  }, [currentRoom, setWorkMinutes, setBreakMinutes, isRunning]);

  // ============================================================================
  // HOST GRACE PERIOD COUNTDOWN
  // ============================================================================

  const [gracePeriodCountdown, setGracePeriodCountdown] = useState(0);

  useEffect(() => {
    if (!hostGracePeriod || !hostGracePeriod.isActive) {
      setGracePeriodCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - hostGracePeriod.startTime;
      const remaining = Math.max(0, Math.ceil((hostGracePeriod.gracePeriod - elapsed) / 1000));
      setGracePeriodCountdown(remaining);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [hostGracePeriod]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  // Get admin username for display
  const adminUsername = currentRoom?.creator?.username || 
                       (currentRoom?.creator === authUser?._id ? 'You' : 'Unknown');
  
  // Check if current user is the room admin
  const isAdmin = currentRoom && authUser && (
    (currentRoom.creator?._id === authUser._id) || 
    (currentRoom.creator === authUser._id)
  );

  // Timer synchronization event handler - Server-authoritative approach
  const handleTimerSync = useCallback((data) => {
    console.log('⏰ [FRONTEND] Received timerSync event:', data);
    
    // Get current admin status dynamically to avoid stale closure issues
    const currentRoom = useRoomStore.getState().currentRoom;
    const currentAuthUser = useAuthStore.getState().authUser;
    const currentIsAdmin = currentRoom && currentAuthUser && (
      (currentRoom.creator?._id === currentAuthUser._id) || 
      (currentRoom.creator === currentAuthUser._id)
    );
    
    console.log('⏰ [FRONTEND] Current user isAdmin (dynamic):', currentIsAdmin);
    console.log('⏰ [FRONTEND] Current room:', currentRoom?.name);
    console.log('⏰ [FRONTEND] Current user:', currentAuthUser?.username);
    console.log('⏰ [FRONTEND] Room creator:', currentRoom?.creator?._id || currentRoom?.creator);
    console.log('⏰ [FRONTEND] Auth user ID:', currentAuthUser?._id);

    // Only non-admin users should sync their timers
    if (!currentIsAdmin) {
      try {
        console.log('⏰ [FRONTEND] Processing timer sync for non-admin user');
        
        // Extract timer data from the event
        const timerData = data.timerData || data;
        const action = data.action || 'sync';
        
        console.log('⏰ [FRONTEND] Processing action:', action, 'with data:', timerData);
        
        switch (action) {
          case 'start':
            console.log('⏰ [FRONTEND] Syncing timer start:', timerData);
            
            // Set timer durations to match room settings
            if (timerData.sessionType === 'work') {
              setWorkMinutes(Math.floor(timerData.duration / 60));
            } else {
              setBreakMinutes(Math.floor(timerData.duration / 60));
            }
            
            // Start timer with synced data
            console.log('⏰ [FRONTEND] Starting timer with duration:', timerData.duration, 'type:', timerData.sessionType);
            startTimerWithDuration(timerData.duration, timerData.sessionType);
            break;


          case 'stop':
            console.log('⏰ [FRONTEND] Syncing timer stop');
            // Stop the timer and reset to work session
            stopTimer();
            break;

          case 'sync':
          default:
            console.log('⏰ [FRONTEND] Syncing full timer state:', timerData);
            // Use the comprehensive sync function
            syncTimerWithRoom(timerData);
            break;
        }
        
        console.log('⏰ [FRONTEND] Timer state after sync:', useRoomTimerStore.getState());
      } catch (error) {
        console.error('⏰ [FRONTEND] Error handling timer sync:', error);
      }
    } else {
      console.log('⏰ [FRONTEND] Skipping timer sync for admin user');
    }
  }, [setWorkMinutes, setBreakMinutes, startTimerWithDuration, stopTimer, syncTimerWithRoom]);

  // Handle real-time timer updates from server
  const handleTimerUpdate = useCallback((data) => {
    console.log('⏰ [FRONTEND] Received timer update:', data);
    
    // Check if timer just started (transition from not running to running)
    const wasRunning = useRoomTimerStore.getState().running;
    const isNowRunning = data.isRunning || false;
    const sessionType = data.sessionType || 'work';
    const duration = data.duration || (sessionType === 'work' ? workMinutes * 60 : breakMinutes * 60);
    
    // Start room session tracking when timer starts (for focus sessions only)
    if (!wasRunning && isNowRunning && sessionType === 'work') {
      console.log('🎯 [ROOM SESSION] Timer started - beginning session tracking');
      const focusGoal = userFocusGoal || '';
      startRoomSession('focus', duration, focusGoal, currentRoom?._id);
    }
    
    // Always sync timer state from server for consistency
    // This ensures all users receive timer updates
    console.log('⏰ [FRONTEND] Syncing timer from server update');
    
    // Update local timer state from server data
    syncTimerWithRoom({
      sessionType: sessionType,
      remaining: data.remaining || 0,
      isRunning: isNowRunning,
      startTime: data.startTime || Date.now(),
      endTime: data.endTime || (data.startTime ? data.startTime + (duration * 1000) : Date.now() + (duration * 1000)),
      duration: duration
    });
  }, [syncTimerWithRoom, workMinutes, breakMinutes, startRoomSession, userFocusGoal, currentRoom]);
  
  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/pomate.mp3');
      audio.volume = 0.7; // Set volume to 70%
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Error creating audio:', error);
    }
  }, []);

  // Handle timer completion (session switch)
  const handleTimerComplete = useCallback(({ previousSession, nextSession, requiresManualStart }) => {
    console.log(`⏰ [FRONTEND] Timer completed: ${previousSession} -> ${nextSession}`, { requiresManualStart });
    
    // Mark room session as completed if it was a focus session
    if (previousSession === 'work') {
      console.log('🎯 [ROOM SESSION] Focus session completed - marking as completed');
      markRoomSessionCompleted().then(() => {
        loadStats();
      }).catch(error => {
        console.error('Failed to mark room session as completed:', error);
        loadStats(); // Still refresh stats even if session tracking fails
      });
    }
    
    // Play notification sound
    playNotificationSound();
    
    // Show notification based on whether manual start is required
    const sessionName = previousSession === 'work' ? 'Focus session' : 'Break session';
    const nextSessionName = nextSession === 'work' ? 'Focus' : 'Break';
    
    if (requiresManualStart) {
      toast.info(`${sessionName} completed! Ready to start ${nextSessionName} session.`, {
        duration: 5000,
        icon: '⏸️'
      });
    } else {
    toast.success(`${sessionName} completed! Starting ${nextSessionName} session.`, {
      duration: 5000,
      icon: '🎉'
    });
    }
    
    // The timer state will be updated by the next timer:update event
  }, [playNotificationSound, markRoomSessionCompleted, loadStats]);
  
  // Handle timer stop
  const handleTimerStopped = useCallback(() => {
    console.log('⏰ [FRONTEND] Timer was stopped by admin');
    
    // Play notification sound
    playNotificationSound();
    
    // Show notification
    toast.info('Timer stopped by host', {
      duration: 3000,
      icon: '⏹️'
    });
    
    // Note: Timer state will be updated by the timer:update event from backend
    // No need to call stopTimer() locally
  }, [playNotificationSound]);

  // Handle timer skip
  const handleTimerSkipped = useCallback((data) => {
    console.log('⏰ [FRONTEND] Timer was skipped:', data);
    const { skippedSession, nextSession } = data;
    
    if (skippedSession === 'break' && nextSession === 'work') {
      // Play notification sound
      playNotificationSound();
      
      // Show notification
      toast.info('Break skipped! Ready to start Focus session.', {
        duration: 3000,
        icon: '⏭️'
      });
      
      // Note: Timer state will be updated by the timer:update event from backend
      // No need to call skipBreak() locally
    }
  }, [playNotificationSound]);

  // Timer sync useEffect - separate from main socket useEffect
  useEffect(() => {
    if (!socket || !hasJoined) return;

    console.log('⏰ [FRONTEND] Setting up timer event listeners');

    // Register timer event listeners
    socket.on('timer:update', handleTimerUpdate);
    socket.on('timer:complete', handleTimerComplete);
    socket.on('timer:stopped', handleTimerStopped);
    socket.on('timer:skipped', handleTimerSkipped);
    socket.on('room:autoModeChanged', ({ autoMode: newAutoMode }) => {
      console.log('🔄 [FRONTEND] Auto mode changed to:', newAutoMode);
      setAutoMode(newAutoMode);
    });
    socket.on('timerSync', handleTimerSync);
    
    console.log('⏰ [FRONTEND] Registered timer event listeners');
    
    // Request timer sync when joining room (for non-admin users)
    // This handles both initial join and reconnection after refresh
    const currentRoom = useRoomStore.getState().currentRoom;
    const currentAuthUser = useAuthStore.getState().authUser;
    const currentIsAdmin = currentRoom && currentAuthUser && (
      (currentRoom.creator?._id === currentAuthUser._id) || 
      (currentRoom.creator === currentAuthUser._id)
    );
    
    // Always request timer sync when joining room to get current state (with throttling)
    if (hasJoined) {
      const now = Date.now();
      const timeSinceLastRequest = now - lastSyncRequestRef.current;
      
      // Only request sync if it's been more than 2 seconds since last request
      if (timeSinceLastRequest > 2000) {
        console.log('⏰ [FRONTEND] Requesting timer sync on room join/reconnect - isAdmin:', currentIsAdmin, 'hasJoined:', hasJoined);
        socket.emit('timerSyncRequest', { roomId });
        lastSyncRequestRef.current = now;
      } else {
        console.log('⏰ [FRONTEND] Throttling timer sync request - too recent');
      }
    } else {
      console.log('⏰ [FRONTEND] Not requesting timer sync - hasJoined:', hasJoined);
    }

    // Cleanup listeners
    return () => {
      console.log('⏰ [FRONTEND] Cleaning up timer event listeners');
      socket.off('timer:update', handleTimerUpdate);
      socket.off('timer:complete', handleTimerComplete);
      socket.off('timer:stopped', handleTimerStopped);
      socket.off('timer:skipped', handleTimerSkipped);
      socket.off('timerSync', handleTimerSync);
    };
  }, [socket, roomId, hasJoined]); // Removed callback dependencies to prevent infinite loops

  // Additional effect to handle socket reconnection and timer sync
  useEffect(() => {
    // Get current admin status dynamically
    const currentRoom = useRoomStore.getState().currentRoom;
    const currentAuthUser = useAuthStore.getState().authUser;
    const currentIsAdmin = currentRoom && currentAuthUser && (
      (currentRoom.creator?._id === currentAuthUser._id) || 
      (currentRoom.creator === currentAuthUser._id)
    );
    
    if (!socket || !hasJoined || currentIsAdmin) return;

    // Handle socket reconnection - request timer sync when socket reconnects (with throttling)
    const handleReconnect = () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastSyncRequestRef.current;
      
      // Only request sync if it's been more than 2 seconds since last request
      if (timeSinceLastRequest > 2000) {
        console.log('⏰ [FRONTEND] Socket reconnected, requesting timer sync');
        socket.emit('timerSyncRequest', { roomId });
        lastSyncRequestRef.current = now;
      } else {
        console.log('⏰ [FRONTEND] Throttling reconnection timer sync request - too recent');
      }
    };

    socket.on('connect', handleReconnect);

    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, roomId, hasJoined]);

  // Note: Heartbeat mechanism removed - server now broadcasts real-time updates

  // Note: Automatic session chaining is now handled by the backend based on room.autoMode

  // Note: Room session completion is now handled in handleTimerComplete callback

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Room not found</h2>
          <button 
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isUserParticipant = participants.some(participant => 
    participant._id === authUser._id || participant.toString() === authUser._id
  );

  // Don't show "not a participant" message if user is currently leaving the room
  // This prevents the flash message during the leave process
  if (!isUserParticipant && !isLeavingRoom) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">You are not a participant in this room</h2>
          <button 
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // Color token based on session type
  const colorToken = sessionType === 'work' ? 'primary' : 'accent';
  const badgeBg = `bg-${colorToken}`;
  const colorHeader = `text-${colorToken}`;

  return (
    <div className="min-h-screen bg-base-100 pt-16">
      <GlobalRoomTimer />
      <ZoomTimer />
      <div className="container mx-auto px-4 pb-10">
        {/* Room Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold font-fredoka text-primary truncate">
                {currentRoom?.name || 'Loading...'}
              </h1>
              {/* Host Grace Period Indicator */}
              {hostGracePeriod && hostGracePeriod.isActive && gracePeriodCountdown > 0 && (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-warning/20 border border-warning/30 rounded-full flex-shrink-0">
                  <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                  <span className="text-warning text-xs font-medium hidden sm:inline">
                    Host disconnected - {gracePeriodCountdown}s remaining
                  </span>
                  <span className="text-warning text-xs font-medium sm:hidden">
                    Host DC - {gracePeriodCountdown}s
                  </span>
                </div>
              )}
            </div>
            <p className="text-base-content/70 text-xs sm:text-sm">
              Group Focus Session
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLeaveRoom}
              className="btn btn-ghost btn-sm gap-1 sm:gap-2 text-error hover:bg-error/10 flex-shrink-0"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Leave Room</span>
              <span className="sm:hidden">Leave</span>
            </button>
          </div>
        </div>
        <div className="space-y-6">
          {/* Timer and Progress Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            {/* Timer Section */}
            <div className="lg:col-span-3 order-1 lg:order-1">
            <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 ${badgeBg} rounded-lg flex items-center justify-center`}>
                    {sessionType === 'work' ? (
                      <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-primary-content" />
                    ) : (
                      <Coffee className="w-3 h-3 sm:w-4 sm:h-4 text-primary-content" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-base-content font-fredoka truncate">
                      {sessionType === 'work' ? (userFocusGoal || 'Focus Time') : 'Short Break'}
                    </h2>
                    {sessionType === 'work' && userFocusGoal && (
                      <button
                        onClick={() => {
                          const { clearUserFocusGoal } = useRoomTimerStore.getState();
                          clearUserFocusGoal();
                        }}
                        className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content hover:bg-base-200 flex-shrink-0"
                        title="Clear focus goal"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                  {isAdmin && autoMode && (
                    <div className="badge badge-primary badge-sm flex-shrink-0">
                      Auto
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const { toggleZoom } = useZoomStore.getState();
                    toggleZoom('room');
                  }}
                  className="btn btn-ghost btn-sm"
                  title="Zoom timer (F11)"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-6">
                <SoloTimer remainingSeconds={remainingSeconds} totalSeconds={sessionType === 'work' ? workMinutes * 60 : breakMinutes * 60} colorToken={colorToken} />

                {isAdmin ? (
                  <>
                    <SoloControls
                      running={isRunning}
                      hasStarted={hasStarted}
                      disablePause={true}
                      onToggleRunning={() => {
                        // Only handle start - no pause/resume in group sessions
                        if (!hasStarted) {
                          // Get current duration from the store to ensure we use the latest values
                          const currentState = useRoomTimerStore.getState();
                          const duration = (sessionType === 'work' ? currentState.workMinutes : currentState.breakMinutes) * 60;
                          
                          console.log(`[ROOMPAGE] Starting timer with custom duration: ${duration} seconds (${sessionType})`);
                          
                          // Start room session tracking for focus sessions
                          if (sessionType === 'work') {
                            const focusGoal = userFocusGoal || '';
                            startRoomSession('focus', duration, focusGoal, currentRoom._id);
                          }
                          
                          // Start timer with explicit duration
                          startTimerWithDuration(duration, sessionType);
                          if (socket && currentRoom) {
                            socket.emit('timer:start', { 
                              roomId: currentRoom._id,
                              sessionType: sessionType,
                              duration: duration
                            });
                          }
                        }
                      }}
                      onStop={() => {
                        // Show confirmation dialog before stopping timer
                        const confirmStop = window.confirm(
                          "Are you sure you want to stop the timer? This will end the session for all participants."
                        );
                        
                        if (confirmStop) {
                          // Only emit socket event - let backend handle the stop and sync back
                          console.log(`[ROOMPAGE] Stopping timer after confirmation`);
                          if (socket && currentRoom) {
                            socket.emit('timer:stop', { 
                              roomId: currentRoom._id
                            });
                          }
                        } else {
                          console.log(`[ROOMPAGE] Timer stop cancelled by user`);
                        }
                      }}
                      onSkip={() => {
                        if (sessionType === 'break') {
                          console.log('[ROOMPAGE] Skipping break session');
                          // Only emit socket event - let backend handle the skip and sync back
                          if (socket && currentRoom) {
                            socket.emit('timer:skip', { 
                              roomId: currentRoom._id,
                              sessionType: 'break'
                            });
                          }
                        }
                      }}
                    showSkip={sessionType === 'break'}
                    colorToken={colorToken}
                    disableStart={false}
                  />
                  </>
                ) : (
                  <div className="text-center">
                    {!hasStarted && !isRunning ? (
                      <div className="text-lg text-base-content/70 mb-4">
                        Waiting for the host to start
                      </div>
                    ) : (
                      <div className="text-sm text-base-content/60">
                        {sessionType === 'work' ? 'Focus time! Stay productive with your team.' : 
                         'Take a break! Rest and recharge.'}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Controls - Only show for admin */}
                {isAdmin && (
                  <div className="w-full flex flex-col items-center justify-center gap-6 text-base-content/70">
                    {/* Auto Mode Toggle */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Auto Mode:</span>
                      <label className="flex items-center gap-2 cursor-pointer" title={autoMode ? 'Sessions will automatically chain (work → break → work)' : 'You control when to start each session'}>
                        <input
                          type="checkbox"
                          checked={autoMode}
                          onChange={(e) => {
                            const newAutoMode = e.target.checked;
                            setAutoMode(newAutoMode);
                            // Send auto mode change to backend
                            if (socket && currentRoom) {
                              socket.emit('room:setAutoMode', {
                                roomId: currentRoom._id,
                                autoMode: newAutoMode
                              });
                            }
                          }}
                          className="toggle toggle-primary toggle-sm"
                        />
                        <span className="text-xs text-base-content/60">
                          {autoMode ? 'Continuous sessions' : 'Manual control'}
                        </span>
                      </label>
                    </div>
                    
                    {/* Timer Duration Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
                    <div className="flex items-center gap-2">
                      <button 
                        className="btn btn-xs" 
                        onClick={() => setWorkMinutes(Math.max(1, workMinutes - 1))}
                      >
                        -
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="opacity-80">🕒</span>
                        <label className="label p-0 text-sm opacity-80">Work:</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={workMinutes}
                          onChange={(e) => setWorkMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))}
                          onBlur={(e) => setWorkMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))}
                          className="input input-bordered input-xs w-24"
                        />
                        <span className="opacity-80">m</span>
                      </div>
                      <button 
                        className="btn btn-xs" 
                        onClick={() => setWorkMinutes(Math.min(120, workMinutes + 1))}
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        className="btn btn-xs" 
                        onClick={() => setBreakMinutes(Math.max(1, breakMinutes - 1))}
                      >
                        -
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="opacity-80">☕</span>
                        <label className="label p-0 text-sm opacity-80">Break:</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={breakMinutes}
                          onChange={(e) => setBreakMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
                          onBlur={(e) => setBreakMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
                          className="input input-bordered input-xs w-24"
                        />
                        <span className="opacity-80">m</span>
                      </div>
                      <button 
                        className="btn btn-xs" 
                        onClick={() => setBreakMinutes(Math.min(60, breakMinutes + 1))}
                      >
                        +
                      </button>
                    </div>
                    </div>
                  </div>
                )}
                
                {/* Session Info - Only show for non-host users */}
                {!isAdmin && (
                <div className="w-full text-center text-sm text-base-content/60">
                  <div className="flex justify-center gap-6">
                    <div>
                      <div className="font-medium">Focus</div>
                      <div>{workMinutes} min</div>
                    </div>
                    <div>
                      <div className="font-medium">Break</div>
                      <div>{breakMinutes} min</div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

            {/* Progress Section */}
            <div className="lg:col-span-1 order-2 lg:order-2">
              <ProgressCard colorToken={colorToken} />
            </div>
          </div>

          {/* Goals and Tabs Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Goals Section */}
            <div className="lg:col-span-3 order-1 lg:order-1">
              <GoalsCard colorToken={colorToken} />
            </div>
            
            {/* Tab Navigation and Content */}
            <div className="lg:col-span-1 order-2 lg:order-2">
              <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-full">
                {/* Tab Navigation */}
                <div className="tabs tabs-boxed mb-4">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`tab tab-sm flex-1 ${
                      activeTab === 'chat' ? 'tab-active' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span className="hidden sm:inline">Chat</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`tab tab-sm flex-1 ${
                      activeTab === 'participants' ? 'tab-active' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="hidden sm:inline">People</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('todos')}
                    className={`tab tab-sm flex-1 ${
                      activeTab === 'todos' ? 'tab-active' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      <span className="hidden sm:inline">To-dos</span>
                    </div>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="h-80">
                  {activeTab === 'chat' && currentRoom?.enableChat && (
                    <RoomChatContainer 
                      roomId={currentRoom._id} 
                      roomName={currentRoom.name}
                    />
                  )}
                  
                  {activeTab === 'participants' && (
                    <div className="h-full overflow-y-auto">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-base-content font-fredoka flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Participants</span>
                          <span className="text-xs font-normal ml-1 text-base-content/70">
                            ({participants.length}/{currentRoom.maxParticipants})
                          </span>
                          {isRefreshingParticipants && (
                            <span className="text-xs text-primary animate-pulse">Updating...</span>
                          )}
                        </h2>
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              setIsRefreshingParticipants(true);
                              try {
                                const { refreshParticipants } = useRoomStore.getState();
                                await refreshParticipants(currentRoom._id);
                              } finally {
                                setIsRefreshingParticipants(false);
                              }
                            }}
                            className="btn btn-ghost btn-xs"
                            title="Refresh participants"
                            disabled={isRefreshingParticipants}
                          >
                            {isRefreshingParticipants ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              const { debugParticipantUpdates } = useRoomStore.getState();
                              debugParticipantUpdates();
                            }}
                            className="btn btn-ghost btn-xs"
                            title="Debug participants"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {participants.map((participant) => (
                          <div 
                            key={participant._id} 
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              participant._id === currentRoom.creator._id 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'bg-base-200 hover:bg-base-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="avatar relative">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  participant._id === currentRoom.creator._id 
                                    ? 'bg-primary/20' 
                                    : 'bg-base-300'
                                }`}>
                                  <span className="text-xs font-medium">
                                    {participant.fullName?.charAt(0).toUpperCase() || 'A'}
                                  </span>
                                  {participant._id === currentRoom.creator._id && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-1.5 w-1.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium truncate max-w-[60px]">{participant.fullName || 'Anonymous'}</span>
                                  {participant._id === authUser?._id && (
                                    <span className="text-xs opacity-70">(You)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {participant._id === currentRoom.creator._id && (
                              <span className="badge badge-primary badge-xs">Host</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'todos' && (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-base-content/60">
                        <CheckSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium mb-1">To-dos Coming Soon</p>
                        <p className="text-xs">This feature will be available in a future update.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
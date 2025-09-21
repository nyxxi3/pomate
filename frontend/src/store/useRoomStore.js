import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

// Utility function to deduplicate participants by _id
const deduplicateParticipants = (participants) => {
  return participants.filter((participant, index, self) => 
    index === self.findIndex(p => p._id === participant._id)
  );
};
// import { useAuthStore } from "./useAuthStore"; // Temporarily disabled to fix circular dependency

// ============================================================================
// CLEAN ROOM STORE - EXPLICIT JOIN/LEAVE WITH DATABASE AS SOURCE OF TRUTH
// ============================================================================

export const useRoomStore = create((set, get) => ({
  // Room state
  currentRoom: null,
  rooms: [],
  userRooms: [],
  participants: [],
  isCreatingRoom: false,
  isJoiningRoom: false,
  isLeavingRoom: false,
  isRoomsLoading: false,
  hostGracePeriod: null, // Track host disconnection grace period
  participantsPollingInterval: null, // Track participants polling interval
  participantAccessDenied: false, // Flag to indicate participant access was denied
  userExplicitlyLeftRoom: false, // Flag to track if user explicitly left the room
  
  // Room creation form state - Load from localStorage or use defaults
  roomForm: {
    name: "",
    isPublic: JSON.parse(localStorage.getItem('pomate_room_isPublic')) ?? true,
    maxParticipants: parseInt(localStorage.getItem('pomate_room_maxParticipants')) || 8,
    workDuration: parseInt(localStorage.getItem('pomate_room_workDuration')) || 25,
    breakDuration: parseInt(localStorage.getItem('pomate_room_breakDuration')) || 5,
    enableChat: JSON.parse(localStorage.getItem('pomate_room_enableChat')) ?? true,
  },

  // ============================================================================
  // FORM MANAGEMENT
  // ============================================================================

  // Load saved room settings from localStorage
  loadSavedRoomSettings: () => {
    const savedSettings = {
      isPublic: JSON.parse(localStorage.getItem('pomate_room_isPublic')) ?? true,
      maxParticipants: parseInt(localStorage.getItem('pomate_room_maxParticipants')) || 8,
      workDuration: parseInt(localStorage.getItem('pomate_room_workDuration')) || 25,
      breakDuration: parseInt(localStorage.getItem('pomate_room_breakDuration')) || 5,
      enableChat: JSON.parse(localStorage.getItem('pomate_room_enableChat')) ?? true,
    };
    
    set((state) => ({
      roomForm: {
        ...state.roomForm,
        ...savedSettings
      }
    }));
  },

  // Clear saved room settings (useful for debugging or user preference)
  clearSavedRoomSettings: () => {
    localStorage.removeItem('pomate_room_isPublic');
    localStorage.removeItem('pomate_room_maxParticipants');
    localStorage.removeItem('pomate_room_workDuration');
    localStorage.removeItem('pomate_room_breakDuration');
    localStorage.removeItem('pomate_room_enableChat');
    
    // Reset to defaults
    set((state) => ({
      roomForm: {
        ...state.roomForm,
        isPublic: true,
        maxParticipants: 8,
        workDuration: 25,
        breakDuration: 5,
        enableChat: true,
      }
    }));
  },

  setRoomForm: (formData) => {
    const newFormData = { ...get().roomForm, ...formData };
    
    // Save settings to localStorage (except for name which should always be empty for new rooms)
    if (formData.isPublic !== undefined) {
      localStorage.setItem('pomate_room_isPublic', JSON.stringify(formData.isPublic));
    }
    if (formData.maxParticipants !== undefined) {
      localStorage.setItem('pomate_room_maxParticipants', formData.maxParticipants.toString());
    }
    if (formData.workDuration !== undefined) {
      localStorage.setItem('pomate_room_workDuration', formData.workDuration.toString());
    }
    if (formData.breakDuration !== undefined) {
      localStorage.setItem('pomate_room_breakDuration', formData.breakDuration.toString());
    }
    if (formData.enableChat !== undefined) {
      localStorage.setItem('pomate_room_enableChat', JSON.stringify(formData.enableChat));
    }
    
    set({ roomForm: newFormData });
  },

  resetRoomForm: () => set((state) => ({
    roomForm: {
      ...state.roomForm,
      name: "", // Only reset the name, keep user's saved preferences
    }
  })),

  // ============================================================================
  // ROOM CREATION
  // ============================================================================

  createRoom: async () => {
    const { roomForm } = get();
    const { useAuthStore } = await import("./useAuthStore.js");
    const { authUser } = useAuthStore.getState();
    
    if (!authUser) {
      toast.error("You must be logged in to create a room");
      return null;
    }

    set({ isCreatingRoom: true });
    
    // Clear any existing room state when creating a new room
    get().clearAllRoomState();
    
    try {
      // Format the room data according to what the backend expects
      const roomData = {
        name: roomForm.name.trim(),
        description: "", // Add empty description as it's required by backend
        isPublic: roomForm.isPublic,
        maxParticipants: Number(roomForm.maxParticipants) || 8,
        workDuration: Number(roomForm.workDuration) || 25,
        breakDuration: Number(roomForm.breakDuration) || 5,
        enableChat: Boolean(roomForm.enableChat)
      };

      console.log("🏗️ [FRONTEND] Creating room with data:", roomData);
      
      // Log the full URL being called
      const fullUrl = axiosInstance.defaults.baseURL + "/rooms/create";
      console.log("🏗️ [FRONTEND] Calling URL:", fullUrl);
      
      const response = await axiosInstance.post("/rooms/create", roomData, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        validateStatus: function (status) {
          return status < 500; // Reject only if the status code is greater than or equal to 500
        }
      });
      
      console.log("🏗️ [FRONTEND] Response status:", response.status);
      console.log("🏗️ [FRONTEND] Response data:", response.data);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      const newRoom = response.data;
      console.log("🏗️ [FRONTEND] Room created successfully:", newRoom._id);
      
      // Set as current room (creator is automatically a participant)
      set({ 
        currentRoom: newRoom,
        participants: newRoom.participants || [],
        isCreatingRoom: false 
      });
      
      // Reset form
      get().resetRoomForm();
      
      toast.success("Room created successfully!");
      return newRoom;
      
    } catch (error) {
      console.error("🏗️ [FRONTEND] Room creation error:", error);
      
      let message = "Failed to create room";
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
        
        if (error.response.status === 401) {
          message = "You need to be logged in to create a room";
        } else if (error.response.status === 400) {
          message = error.response.data.message || "Invalid room data";
        } else if (error.response.status === 500) {
          message = "Server error. Please try again later.";
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        message = "No response from server. Please check your connection.";
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        message = `Request error: ${error.message}`;
      }
      
      toast.error(message);
      set({ isCreatingRoom: false });
      return null;
    }
  },

  // ============================================================================
  // EXPLICIT JOIN/LEAVE LOGIC
  // ============================================================================

  joinRoom: async (roomId, options = {}) => {
    const { useAuthStore } = await import("./useAuthStore.js");
    const { authUser } = useAuthStore.getState();
    const { currentRoom } = get();
    
    if (!authUser) {
      toast.error("You must be logged in to join a room");
      return false;
    }

    // Check if there's an active solo session
    try {
      console.log("🚪 [FRONTEND] Checking for active solo session before joining room");
      const { useTimerStore } = await import("./useTimerStore.js");
      const timerStore = useTimerStore.getState();
      console.log("🚪 [FRONTEND] Timer store state:", {
        running: timerStore.running,
        hasStarted: timerStore.hasStarted,
        mode: timerStore.mode,
        remaining: timerStore.remaining
      });
      
      if (timerStore.running && timerStore.hasStarted) {
        console.log("🚪 [FRONTEND] Solo timer is running, checking for active session");
        const activeSession = timerStore.getActiveSession();
        console.log("🚪 [FRONTEND] Active session:", activeSession);
        
        if (activeSession) {
          const sessionType = activeSession.sessionType === "focus" ? "Focus session" : "Break session";
          const remainingMinutes = Math.ceil(activeSession.remainingSeconds / 60);
          
          console.log("🚪 [FRONTEND] Found active session:", { sessionType, remainingMinutes });
          
          const confirmMessage = `You have an active ${sessionType} running (${remainingMinutes} minutes remaining). Joining a room will stop and reset your solo session. Do you want to continue?`;
          
          if (!window.confirm(confirmMessage)) {
            console.log("🚪 [FRONTEND] User cancelled joining room due to active solo session");
            return false;
          }
          
          // User confirmed, stop and reset the solo timer
          console.log("🚪 [FRONTEND] User confirmed joining room despite active solo session, stopping and resetting solo timer");
          timerStore.stopTimer();
        } else {
          console.log("🚪 [FRONTEND] No active session found despite running timer");
        }
      } else {
        console.log("🚪 [FRONTEND] No active solo session detected");
      }
    } catch (error) {
      console.log("🚪 [FRONTEND] Could not check solo session status:", error);
    }

    // Check if already in a different room
    if (currentRoom && currentRoom._id !== roomId && !options.force) {
      // First, verify if the current room still exists on the server
      try {
        const response = await axiosInstance.get(`/rooms/${currentRoom._id}`);
        const roomStillExists = response.data;
        
        if (roomStillExists) {
          const confirmLeave = window.confirm(
            `You're already in a room (${currentRoom.name}). Do you want to leave it and join this one?`
          );
          
          if (!confirmLeave) {
            return false;
          }
          
          // Leave current room first
          const left = await get().leaveRoom(currentRoom._id);
          if (!left) {
            return false;
          }
        } else {
          // Room no longer exists, clear the local state
          console.log("🚪 [FRONTEND] Current room no longer exists, clearing local state");
          get().clearAllRoomState();
        }
      } catch (error) {
        // Room doesn't exist or user doesn't have access, clear local state
        console.log("🚪 [FRONTEND] Current room no longer accessible, clearing local state");
        get().clearAllRoomState();
      }
    }

    set({ isJoiningRoom: true });
    
    try {
      console.log("🚪 [FRONTEND] Joining room:", roomId);
      
      // Check if we're already in this room (but verify with actual participant status)
      if (currentRoom && currentRoom._id === roomId) {
        // Double-check if user is actually a participant in the current room (robust check)
        const isActuallyParticipant = currentRoom.participants.some(participant => {
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
          return participantId === userIdStr;
        });
        
        if (isActuallyParticipant) {
          console.log("🚪 [FRONTEND] Already in this room and confirmed as participant, skipping join request");
          set({ isJoiningRoom: false });
          return true;
        } else {
          console.log("🚪 [FRONTEND] In room state but not actually a participant, proceeding with join request");
        }
      }
      
      const response = await axiosInstance.post(`/rooms/${roomId}/join`);
      const updatedRoom = response.data;
      
      console.log("🚪 [FRONTEND] Successfully joined room:", roomId);
      
      // Update current room and participants
      set({ 
        currentRoom: updatedRoom,
        participants: updatedRoom.participants || [],
        isJoiningRoom: false 
      });
      
      // Room join handled silently - no annoying toasts
      return true;
      
    } catch (error) {
      console.error("🚪 [FRONTEND] Join room error:", error);
      console.error("🚪 [FRONTEND] Join room error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        roomId: roomId
      });
      
      let message = "Failed to join room";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.status === 403) {
        message = "Access denied. You are not authorized to join this room.";
      } else if (error.response?.status === 400) {
        message = "Unable to join room. Room may be full or no longer active.";
      } else if (error.response?.status === 404) {
        message = "Room not found.";
      }
      
      toast.error(message);
      set({ isJoiningRoom: false });
      return false;
    }
  },

  leaveRoom: async (roomId = null) => {
    const { useAuthStore } = await import("./useAuthStore.js");
    const { authUser } = useAuthStore.getState();
    const { currentRoom, participants } = get();
    
    if (!authUser) {
      toast.error("You must be logged in to leave a room");
      return false;
    }

    const targetRoomId = roomId || currentRoom?._id;
    if (!targetRoomId) {
      toast.error("No room to leave");
      return false;
    }

    // Check if the leaving user is the room creator
    const isCreatorLeaving = currentRoom?.creator?._id === authUser._id || 
                           currentRoom?.creator === authUser._id;
    
    // If creator is leaving and there are other participants, confirm transfer
    if (isCreatorLeaving && participants.length > 1) {
      const confirmTransfer = window.confirm(
        "You are the room creator. Another participant will be made the new host. Continue?"
      );
      
      if (!confirmTransfer) {
        return false;
      }
    }

    set({ isLeavingRoom: true });
    
    try {
      console.log("🚪 [FRONTEND] Leaving room:", targetRoomId);
      
      const response = await axiosInstance.post(`/rooms/${targetRoomId}/leave`);
      const { room, newAdmin } = response.data;
      
      console.log("🚪 [FRONTEND] Successfully left room:", targetRoomId, { room, newAdmin });
      
      // Handle admin transfer notification
      if (newAdmin) {
        if (newAdmin._id !== authUser._id) {
          // Admin transfer handled silently - no annoying toasts
          console.log("🚪 [FRONTEND] Admin transferred to:", newAdmin.username);
        }
        
        // Update the current room with the new admin if we're still in it
        if (currentRoom?._id === targetRoomId) {
          set(prev => ({
            currentRoom: {
              ...prev.currentRoom,
              creator: newAdmin
            }
          }));
        }
      }
      
      // Clear current room if it's the one we left
      if (currentRoom?._id === targetRoomId) {
        // Clear all room state when user leaves
        get().clearAllRoomState();
        
        // If room was deleted or user was the last one
        if (!room) {
          toast.success("Room has been closed");
        }
      } else {
        set({ isLeavingRoom: false });
      }
      
      // Room leave handled silently - no annoying toasts
      return true;
      
    } catch (error) {
      console.error("🚪 [FRONTEND] Leave room error:", error);
      const message = error.response?.data?.message || "Failed to leave room";
      toast.error(message);
      set({ isLeavingRoom: false });
      return false;
    }
  },

  // ============================================================================
  // ROOM DATA LOADING
  // ============================================================================

  // Save current room to localStorage for persistence
  saveCurrentRoomToStorage: (room) => {
    if (room) {
      localStorage.setItem('pomate_current_room', JSON.stringify(room));
      console.log("💾 [FRONTEND] Saved current room to localStorage:", room._id);
    }
  },

  // Load current room from localStorage
  loadCurrentRoomFromStorage: () => {
    try {
      const savedRoom = localStorage.getItem('pomate_current_room');
      if (savedRoom) {
        const room = JSON.parse(savedRoom);
        console.log("💾 [FRONTEND] Loaded current room from localStorage:", room._id);
        return room;
      }
    } catch (error) {
      console.error("💾 [FRONTEND] Error loading room from localStorage:", error);
    }
    return null;
  },

  // Clear current room from localStorage
  clearCurrentRoomFromStorage: () => {
    localStorage.removeItem('pomate_current_room');
    console.log("💾 [FRONTEND] Cleared current room from localStorage");
  },

  // Clear all room state (used when user explicitly leaves)
  clearAllRoomState: () => {
    console.log("🧹 [FRONTEND] Clearing all room state");
    set({
      currentRoom: null,
      participants: [],
      isJoiningRoom: false,
      isLeavingRoom: false,
      userExplicitlyLeftRoom: true
    });
    get().clearCurrentRoomFromStorage();
    console.log("🧹 [FRONTEND] All room state cleared");
  },

  // Initialize room store with cached data
  initializeRoomStore: () => {
    const { userExplicitlyLeftRoom } = get();
    
    // Don't restore room if user explicitly left
    if (userExplicitlyLeftRoom) {
      console.log("💾 [FRONTEND] User explicitly left room, not restoring from cache");
      return null;
    }
    
    const cachedRoom = get().loadCurrentRoomFromStorage();
    if (cachedRoom) {
      console.log("💾 [FRONTEND] Initializing room store with cached room:", cachedRoom._id);
      set({ 
        currentRoom: cachedRoom,
        participants: cachedRoom.participants || []
      });
      return cachedRoom;
    }
    return null;
  },

  // Auto-save room state whenever currentRoom changes
  setCurrentRoom: (room) => {
    set({ currentRoom: room });
    if (room) {
      get().saveCurrentRoomToStorage(room);
    }
  },

  // Auto-save room state whenever participants change
  setParticipants: (participants) => {
    set({ participants });
    const { currentRoom } = get();
    if (currentRoom) {
      // Update the room with new participants and save
      const updatedRoom = { ...currentRoom, participants };
      set({ currentRoom: updatedRoom });
      get().saveCurrentRoomToStorage(updatedRoom);
    }
  },

  // Update room and auto-save
  updateRoom: (roomUpdates) => {
    const { currentRoom } = get();
    if (currentRoom) {
      const updatedRoom = { ...currentRoom, ...roomUpdates };
      set({ currentRoom: updatedRoom });
      get().saveCurrentRoomToStorage(updatedRoom);
    }
  },

  loadRoom: async (roomId) => {
    try {
      console.log("📋 [FRONTEND] Loading room:", roomId);
      
      const response = await axiosInstance.get(`/rooms/${roomId}`);
      const room = response.data;
      
      console.log("📋 [FRONTEND] Room loaded successfully:", {
        roomId: room._id,
        name: room.name,
        creator: room.creator?._id || room.creator,
        participantsCount: room.participants?.length || 0,
        participants: room.participants?.map(p => p._id || p.toString())
      });
      
      // Deduplicate participants by _id to prevent duplicates
      const deduplicatedParticipants = deduplicateParticipants(room.participants || []);
      
      set({ 
        currentRoom: room,
        participants: deduplicatedParticipants,
        userExplicitlyLeftRoom: false // Reset flag when joining a room
      });
      
      // Save room to localStorage for persistence
      get().saveCurrentRoomToStorage(room);
      
      return room;
      
    } catch (error) {
      console.error("📋 [FRONTEND] Load room error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        roomId: roomId
      });
      
      // Try to restore room from localStorage instead of clearing
      const cachedRoom = get().loadCurrentRoomFromStorage();
      if (cachedRoom && cachedRoom._id === roomId) {
        console.log("📋 [FRONTEND] Restoring room from localStorage after API error");
        set({ 
          currentRoom: cachedRoom,
          participants: cachedRoom.participants || []
        });
        return cachedRoom;
      }
      
      // Only clear if no cached room available
      set({ 
        currentRoom: null,
        participants: []
      });
      
      return null;
    }
  },

  loadRooms: async () => {
    set({ isRoomsLoading: true });
    
    try {
      console.log("📋 [FRONTEND] Loading rooms");
      
      const { useAuthStore } = await import("./useAuthStore.js");
      const { authUser } = useAuthStore.getState();
      
      if (!authUser) {
        console.log("📋 [FRONTEND] User not authenticated, loading public rooms");
        // If not authenticated, we can still try to load public rooms
        const response = await axiosInstance.get("/rooms");
        const rooms = response.data || [];
        
        set({ 
          rooms: rooms,
          isRoomsLoading: false 
        });
        return rooms;
      }
      
      // If authenticated, proceed with normal loading
      const response = await axiosInstance.get("/rooms");
      const rooms = response.data || [];
      
      console.log("📋 [FRONTEND] Rooms loaded successfully:", rooms.length, "rooms");
      
      set({ 
        rooms: rooms,
        isRoomsLoading: false 
      });
      
      return rooms;
      
    } catch (error) {
      console.error("📋 [FRONTEND] Load rooms error:", error);
      const message = error.response?.status === 401 
        ? "Please log in to view rooms" 
        : error.response?.data?.message || "Failed to load rooms";
      
      toast.error(message);
      set({ 
        isRoomsLoading: false,
        rooms: []
      });
      return [];
    }
  },

  loadUserRooms: async () => {
    set({ isRoomsLoading: true });
    
    try {
      console.log("📋 [FRONTEND] Loading user's rooms (including dormant)");
      
      const response = await axiosInstance.get("/rooms/my-rooms");
      const userRooms = response.data || [];
      
      console.log("📋 [FRONTEND] User rooms loaded successfully:", userRooms.length, "rooms");
      
      set({ 
        userRooms: userRooms,
        isRoomsLoading: false 
      });
      
      return userRooms;
    } catch (error) {
      console.error("📋 [FRONTEND] Error loading user rooms:", error);
      set({ 
        userRooms: [],
        isRoomsLoading: false 
      });
      return [];
    }
  },

  reactivateRoom: async (roomId) => {
    try {
      console.log("🔄 [FRONTEND] Reactivating room:", roomId);
      
      const response = await axiosInstance.post(`/rooms/${roomId}/reactivate`);
      const reactivatedRoom = response.data;
      
      console.log("🔄 [FRONTEND] Room reactivated successfully");
      
      // Update the userRooms list
      const { userRooms } = get();
      const updatedUserRooms = userRooms.map(room => 
        room._id === roomId ? reactivatedRoom : room
      );
      
      set({ userRooms: updatedUserRooms });
      
      // Also update the public rooms list if it's there
      const { rooms } = get();
      const updatedRooms = rooms.map(room => 
        room._id === roomId ? reactivatedRoom : room
      );
      
      set({ rooms: updatedRooms });
      
      toast.success("Room reactivated successfully!");
      return reactivatedRoom;
    } catch (error) {
      console.error("🔄 [FRONTEND] Error reactivating room:", error);
      const message = error.response?.data?.message || "Failed to reactivate room";
      toast.error(message);
      return null;
    }
  },

  // ============================================================================
  // SOCKET EVENT HANDLERS
  // ============================================================================

  handleParticipantJoined: (data) => {
    const { currentRoom, authUser } = get();
    console.log("🔌 [FRONTEND] handleParticipantJoined called with data:", data);
    console.log("🔌 [FRONTEND] Current room:", currentRoom?._id, "Data roomId:", data.roomId);
    
    if (!currentRoom || data.roomId !== currentRoom._id) {
      console.log("🔌 [FRONTEND] Participant join event ignored - room mismatch or no current room");
      return;
    }
    
    console.log("🔌 [FRONTEND] Participant joined:", data.participant);
    
    // Check if there's an admin transfer
    if (data.newAdmin) {
      console.log("🔌 [FRONTEND] Admin transferred to:", data.newAdmin.username);
      set(state => ({
        currentRoom: {
          ...state.currentRoom,
          creator: data.newAdmin
        }
      }));
      
      if (data.newAdmin._id !== authUser?._id) {
        // Admin transfer handled silently - no annoying toasts
      }
    }
    
    // Check if participant is already in the list (prevent duplicates)
    const isAlreadyParticipant = get().participants.some(participant => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      return participantId === data.participant._id.toString();
    });
    
    if (!isAlreadyParticipant) {
      // Update participants list only if not already present
      set(state => {
        const newParticipants = [...state.participants, data.participant];
        // Additional deduplication check to be extra safe
        const deduplicatedParticipants = deduplicateParticipants(newParticipants);
        return {
          participants: deduplicatedParticipants
        };
      });
      
      // Participant join handled silently - no annoying toasts
      // No toast notifications for participant joins
    } else {
      console.log("🔌 [FRONTEND] Participant already in list, skipping duplicate add");
    }
  },

  handleParticipantLeft: (data) => {
    const { currentRoom, authUser } = get();
    console.log("🔌 [FRONTEND] handleParticipantLeft called with data:", data);
    console.log("🔌 [FRONTEND] Current room:", currentRoom?._id, "Data roomId:", data.roomId);
    
    if (!currentRoom || data.roomId !== currentRoom._id) {
      console.log("🔌 [FRONTEND] Participant left event ignored - room mismatch or no current room");
      return;
    }
    
    console.log("🔌 [FRONTEND] Participant left:", data.userId);
    
    // Check if there's an admin transfer
    if (data.newAdmin) {
      console.log("🔌 [FRONTEND] Admin transferred to:", data.newAdmin.username);
      set(state => ({
        currentRoom: {
          ...state.currentRoom,
          creator: data.newAdmin
        }
      }));
      
      if (data.newAdmin._id !== authUser?._id) {
        // Admin transfer handled silently - no annoying toasts
      }
    }
    
    // Remove participant from the list
    set(state => ({
      participants: state.participants.filter(p => 
        (p._id || p).toString() !== data.userId.toString()
      )
    }));
    
    // Participant leave handled silently - no annoying toasts
    // No toast notifications for participant leaves
  },

  handleParticipantDisconnected: (data) => {
    const { currentRoom, authUser } = get();
    if (!currentRoom || data.roomId !== currentRoom._id) return;
    
    console.log("🔌 [FRONTEND] Participant disconnected:", data.userId);
    
    // Check if there's an admin transfer
    if (data.newAdmin) {
      console.log("🔌 [FRONTEND] Admin transferred to:", data.newAdmin.username);
      set(state => ({
        currentRoom: {
          ...state.currentRoom,
          creator: data.newAdmin
        }
      }));
      
      if (data.newAdmin._id !== authUser?._id) {
        // Admin transfer handled silently - no annoying toasts
      }
    }
    
    // FIXED: Remove participant from list when they disconnect
    // This frees up space for other users to join
    set(state => ({
      participants: state.participants.filter(p => 
        (p._id || p).toString() !== data.userId.toString()
      )
    }));
    
    // Participant disconnect handled silently - no annoying toasts
    // No toast notifications for participant disconnects
  },

  handleRoomDeleted: (data) => {
    const { currentRoom } = get();
    if (!currentRoom || data.roomId !== currentRoom._id) return;
    
    console.log("🔌 [FRONTEND] Room deleted:", data.reason);
    
    // Clear the current room and participants
    set({
      currentRoom: null,
      participants: []
    });
    
    // Show notification about room deletion
    import('react-hot-toast').then(({ toast }) => {
      toast.info(`Room was deleted: ${data.reason}`);
    });
  },

  handleNewMessage: (data) => {
    const { currentRoom } = get();
    if (currentRoom && data.roomId === currentRoom._id) {
      console.log("🔌 [FRONTEND] New message received:", data.message);
      
      // Handle new message (implement based on your chat system)
      // This would typically update a messages array in your store
    }
  },

  handleHostDisconnected: (data) => {
    const { currentRoom, authUser } = get();
    if (!currentRoom || data.roomId !== currentRoom._id) return;
    
    console.log("🔌 [FRONTEND] Host disconnected, grace period started:", data);
    
    // Store the grace period info for UI updates if needed
    set(state => ({
      hostGracePeriod: {
        isActive: true,
        hostId: data.hostId,
        gracePeriod: data.gracePeriod,
        startTime: Date.now()
      }
    }));
  },

  handleHostReconnected: (data) => {
    const { currentRoom, authUser } = get();
    if (!currentRoom || data.roomId !== currentRoom._id) return;
    
    console.log("🔌 [FRONTEND] Host reconnected:", data);
    
    // Clear grace period info
    set(state => ({
      hostGracePeriod: null
    }));
  },

  // ============================================================================
  // PARTICIPANTS POLLING SYSTEM
  // ============================================================================

  startParticipantsPolling: (roomId) => {
    const { participantsPollingInterval } = get();
    
    // Clear existing interval if any
    if (participantsPollingInterval) {
      clearInterval(participantsPollingInterval);
    }
    
    console.log("🔄 [FRONTEND] Starting participants polling for room:", roomId);
    
    const interval = setInterval(async () => {
      try {
        const response = await axiosInstance.get(`/rooms/${roomId}/participants`);
        const updatedParticipants = response.data;
        
        // Deduplicate participants by _id to prevent duplicates
        const deduplicatedParticipants = deduplicateParticipants(updatedParticipants);
        
        console.log("🔄 [FRONTEND] Participants polled:", updatedParticipants.length, "participants, deduplicated:", deduplicatedParticipants.length);
        
        set(state => ({
          participants: deduplicatedParticipants
        }));
      } catch (error) {
        console.error("🔄 [FRONTEND] Error polling participants:", error);
        
        // Handle 403 errors specifically - user is not a participant
        if (error.response?.status === 403) {
          console.log("🔄 [FRONTEND] User not a participant, stopping polling and clearing room state");
          
          // Clear the current room and participants since user is not actually a participant
          set({ 
            currentRoom: null,
            participants: [],
            participantsPollingInterval: null 
          });
          
          // Stop the polling interval
          clearInterval(interval);
          
          // Show user-friendly error message
          import('react-hot-toast').then(({ toast }) => {
            toast.error("You are no longer a participant in this room");
          });
          
          // Set a flag that the component can check to handle navigation
          set({ participantAccessDenied: true });
          
          return; // Exit the polling function
        }
        
        // For other errors, keep trying but log them
        console.log("🔄 [FRONTEND] Non-403 error, continuing to poll participants");
      }
    }, 15000); // Poll every 15 seconds (fallback only)
    
    set({ participantsPollingInterval: interval });
  },

  stopParticipantsPolling: () => {
    const { participantsPollingInterval } = get();
    
    if (participantsPollingInterval) {
      console.log("🔄 [FRONTEND] Stopping participants polling");
      clearInterval(participantsPollingInterval);
      set({ participantsPollingInterval: null });
    }
  },

  // Clear the participant access denied flag
  clearParticipantAccessDenied: () => {
    set({ participantAccessDenied: false });
  },

  // Manually refresh participants (useful for debugging and fallback)
  refreshParticipants: async (roomId) => {
    try {
      console.log("🔄 [FRONTEND] Manually refreshing participants for room:", roomId);
      const response = await axiosInstance.get(`/rooms/${roomId}/participants`);
      const updatedParticipants = response.data;
      
      // Deduplicate participants by _id to prevent duplicates
      const deduplicatedParticipants = deduplicateParticipants(updatedParticipants);
      
      console.log("🔄 [FRONTEND] Participants refreshed:", updatedParticipants.length, "participants, deduplicated:", deduplicatedParticipants.length);
      
      set(state => ({
        participants: deduplicatedParticipants
      }));
      
      return deduplicatedParticipants;
    } catch (error) {
      console.error("🔄 [FRONTEND] Error refreshing participants:", error);
      return null;
    }
  },

  // Force update participants (triggers immediate refresh)
  forceUpdateParticipants: async (roomId) => {
    console.log("🔄 [FRONTEND] Force updating participants for room:", roomId);
    return await get().refreshParticipants(roomId);
  },

  // Debug function to check participant update status
  debugParticipantUpdates: () => {
    const state = get();
    console.log("🔍 [FRONTEND] Participant update debug:", {
      currentRoom: state.currentRoom?._id,
      participantsCount: state.participants.length,
      pollingActive: !!state.participantsPollingInterval,
      participants: state.participants.map(p => ({ id: p._id, name: p.fullName || p.username }))
    });
  },

  // ============================================================================
  // NAVIGATION CLEANUP
  // ============================================================================

  cleanupOnNavigation: () => {
    console.log("🧹 [FRONTEND] Cleaning up room state on navigation");
    
    // Stop participants polling
    get().stopParticipantsPolling();
    
    // Only clear local state - don't call leaveRoom API
    // The user might be navigating to another room or coming back
    set({ 
      currentRoom: null,
      participants: [],
      hostGracePeriod: null
    });
  },

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  deleteRoom: async (roomId) => {
    const { useAuthStore } = await import("./useAuthStore.js");
    const { authUser } = useAuthStore.getState();
    
    if (!authUser) {
      toast.error("You must be logged in to delete a room");
      return false;
    }

    try {
      console.log("🗑️ [FRONTEND] Deleting room:", roomId);
      
      // Make sure to include the full path since our baseURL already includes /api
      const response = await axiosInstance.delete(`/rooms/${roomId}`);
      
      console.log("🗑️ [FRONTEND] Successfully deleted room:", roomId);
      
      // Remove the room from the rooms list
      set(state => ({
        rooms: state.rooms.filter(room => room._id !== roomId)
      }));
      
      return true;
      
    } catch (error) {
      console.error("🗑️ [FRONTEND] Error deleting room:", error);
      
      let message = "Failed to delete room";
      if (error.response) {
        if (error.response.status === 401) {
          message = "You need to be logged in to delete a room";
        } else if (error.response.status === 403) {
          message = "Only the room creator can delete the room";
        } else if (error.response.status === 404) {
          message = "Room not found";
        } else if (error.response.data?.message) {
          message = error.response.data.message;
        }
      }
      
      toast.error(message);
      return false;
    }
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  isUserInRoom: (roomId) => {
    const { currentRoom } = get();
    return currentRoom?._id === roomId;
  },

  isRoomFull: (room) => {
    return room.participants.length >= room.maxParticipants;
  },

  canJoinRoom: async (room) => {
    const { useAuthStore } = await import("./useAuthStore.js");
    const { authUser } = useAuthStore.getState();
    if (!authUser) return false;
    
    // Check if user is already a participant
    const isParticipant = room.participants.some(participant => 
      participant._id === authUser._id || participant.toString() === authUser._id
    );
    
    if (isParticipant) return false;
    
    // Check if room is full
    return !get().isRoomFull(room);
  },

  getParticipantCount: (room) => {
    return room.participants.length;
  },

  // ============================================================================
  // RESET STATE
  // ============================================================================

  reset: () => {
    set({
      currentRoom: null,
      rooms: [],
      userRooms: [],
      participants: [],
      isCreatingRoom: false,
      isJoiningRoom: false,
      isLeavingRoom: false,
      isRoomsLoading: false,
      roomForm: {
        name: "",
        isPublic: true,
        maxParticipants: 8,
        workDuration: 25,
        breakDuration: 5,
        enableChat: true,
      }
    });
  }
}));
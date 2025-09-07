import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Helper function to deduplicate participants by _id
const dedupeParticipants = (participants) => {
  const seen = new Set();
  return participants.filter(participant => {
    const id = participant._id;
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

export const useRoomStore = create((set, get) => ({
  // Room state
  currentRoom: null,
  rooms: [],
  participants: [],
  isCreatingRoom: false,
  isJoiningRoom: false,
  isRoomsLoading: false,
  
  // Room creation form state
  roomForm: {
    name: "",
    isPublic: true,
    maxParticipants: 8,
    workDuration: 25,
    breakDuration: 5,
    enableChat: true,
  },

  // Actions
  setRoomForm: (formData) => set((state) => ({
    roomForm: { ...state.roomForm, ...formData }
  })),

  resetRoomForm: () => set({
    roomForm: {
      name: "",
      isPublic: true,
      maxParticipants: 8,
      workDuration: 25,
      breakDuration: 5,
      enableChat: true,
    }
  }),

  createRoom: async (roomData) => {
    console.log("🏗️ [FRONTEND] createRoom() START - Data:", roomData);
    set({ isCreatingRoom: true });
    try {
      console.log("🏗️ [FRONTEND] createRoom() API call START - POST /rooms/create");
      const res = await axiosInstance.post("/rooms/create", roomData);
      console.log("🏗️ [FRONTEND] createRoom() API call SUCCESS - Response:", res.data);
      const newRoom = res.data;
      
      // Apply deduplication to the new room's participants
      const roomWithDedupedParticipants = {
        ...newRoom,
        participants: dedupeParticipants(newRoom.participants || [])
      };
      
      console.log("🏗️ [FRONTEND] createRoom() Setting state - currentRoom:", roomWithDedupedParticipants._id, "participants:", roomWithDedupedParticipants.participants.length);
      set((state) => ({
        currentRoom: roomWithDedupedParticipants,
        participants: roomWithDedupedParticipants.participants,
        isCreatingRoom: false
      }));
      
      // Emit socket event to join the room immediately after creation
      const socket = useAuthStore.getState().socket;
      if (socket) {
        console.log("🏗️ [FRONTEND] createRoom() Emitting socket event - joinRoom");
        socket.emit("joinRoom", { 
          roomId: roomWithDedupedParticipants._id, 
          userId: useAuthStore.getState().authUser._id 
        });
      }
      
      // Fetch fresh rooms list to update ActiveRooms
      console.log("🏗️ [FRONTEND] createRoom() Fetching fresh rooms list");
      await get().getRooms();
      
      console.log("🏗️ [FRONTEND] createRoom() SUCCESS - Room created and state synced");
      toast.success("Room created successfully!");
      return roomWithDedupedParticipants;
    } catch (error) {
      console.log("🏗️ [FRONTEND] createRoom() ERROR:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to create room");
      set({ isCreatingRoom: false });
      throw error;
    }
  },

  joinRoom: async (roomId) => {
    console.log("🚪 [FRONTEND] joinRoom() START - roomId:", roomId);
    const { isJoiningRoom, currentRoom } = get();
    
    // Prevent multiple simultaneous join calls
    if (isJoiningRoom) {
      console.log("🚪 [FRONTEND] joinRoom() SKIP - Already joining room, skipping duplicate call");
      return currentRoom;
    }
    
    // Check if user is already in this room
    if (currentRoom && currentRoom._id === roomId) {
      console.log("🚪 [FRONTEND] joinRoom() SKIP - Already in this room, skipping join");
      return currentRoom;
    }
    
    console.log("🚪 [FRONTEND] joinRoom() API call START - POST /rooms/" + roomId + "/join");
    set({ isJoiningRoom: true });
    try {
      const res = await axiosInstance.post(`/rooms/${roomId}/join`);
      console.log("🚪 [FRONTEND] joinRoom() API call SUCCESS - Response:", res.data);
      const room = res.data;
      
      // Deduplicate participants before setting state
      const dedupedParticipants = dedupeParticipants(room.participants || []);
      
      console.log("🚪 [FRONTEND] joinRoom() Setting state - currentRoom:", room._id, "participants:", dedupedParticipants.length);
      set({
        currentRoom: room,
        participants: dedupedParticipants,
        isJoiningRoom: false
      });

      // Emit socket event to notify other participants
      const socket = useAuthStore.getState().socket;
      if (socket) {
        console.log("🚪 [FRONTEND] joinRoom() Emitting socket event - joinRoom");
        socket.emit("joinRoom", { 
          roomId: roomId, 
          userId: useAuthStore.getState().authUser._id 
        });
      }
      
      // Fetch fresh rooms list to update ActiveRooms
      console.log("🚪 [FRONTEND] joinRoom() Fetching fresh rooms list");
      await get().getRooms();
      
      console.log("🚪 [FRONTEND] joinRoom() SUCCESS");
      return room;
    } catch (error) {
      console.log("🚪 [FRONTEND] joinRoom() ERROR:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to join room");
      set({ isJoiningRoom: false });
      throw error;
    }
  },

  leaveRoom: async () => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    const currentUserId = useAuthStore.getState().authUser?._id;
    
    try {
      // Emit socket event to notify other participants
      const socket = useAuthStore.getState().socket;
      if (socket) {
        console.log("🚪 [FRONTEND] leaveRoom() Emitting socket event - leaveRoom");
        socket.emit("leaveRoom", { 
          roomId: currentRoom._id, 
          userId: currentUserId 
        });
      }

      // Make API call to update database
      console.log("🚪 [FRONTEND] leaveRoom() API call START - POST /rooms/" + currentRoom._id + "/leave");
      await axiosInstance.post(`/rooms/${currentRoom._id}/leave`);
      console.log("🚪 [FRONTEND] leaveRoom() API call SUCCESS");
      
      // Clear room state
      set({
        currentRoom: null,
        participants: []
      });
      
      // Fetch fresh rooms list to update ActiveRooms
      console.log("🚪 [FRONTEND] leaveRoom() Fetching fresh rooms list");
      await get().getRooms();
      
      console.log("🚪 [FRONTEND] leaveRoom() SUCCESS - Room left and state synced");
    } catch (error) {
      console.log("🚪 [FRONTEND] leaveRoom() ERROR:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to leave room");
      throw error;
    }
  },

  deleteRoom: async (roomId) => {
    try {
      console.log("🗑️ [FRONTEND] deleteRoom() API call START - DELETE /rooms/" + roomId);
      await axiosInstance.delete(`/rooms/${roomId}`);
      console.log("🗑️ [FRONTEND] deleteRoom() API call SUCCESS");
      
      // If we're deleting the current room, clear it
      const { currentRoom } = get();
      if (currentRoom && currentRoom._id === roomId) {
        set({
          currentRoom: null,
          participants: []
        });
      }
      
      // Fetch fresh rooms list to update ActiveRooms
      console.log("🗑️ [FRONTEND] deleteRoom() Fetching fresh rooms list");
      await get().getRooms();
      
      console.log("🗑️ [FRONTEND] deleteRoom() SUCCESS - Room deleted and state synced");
      toast.success("Room deleted successfully!");
    } catch (error) {
      console.log("🗑️ [FRONTEND] deleteRoom() ERROR:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to delete room");
      throw error;
    }
  },

  getRooms: async () => {
    set({ isRoomsLoading: true });
    try {
      console.log("📋 [FRONTEND] getRooms() API call START - GET /rooms");
      const res = await axiosInstance.get("/rooms");
      console.log("📋 [FRONTEND] getRooms() API call SUCCESS - Response:", res.data);
      // Apply deduplication to all rooms' participants
      const roomsWithDedupedParticipants = res.data.map(room => ({
        ...room,
        participants: dedupeParticipants(room.participants || [])
      }));
      set({ rooms: roomsWithDedupedParticipants, isRoomsLoading: false });
      console.log("📋 [FRONTEND] getRooms() SUCCESS - Rooms synced:", roomsWithDedupedParticipants.length);
    } catch (error) {
      console.log("📋 [FRONTEND] getRooms() ERROR:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to fetch rooms");
      set({ isRoomsLoading: false });
    }
  },

  getRoomDetails: async (roomId) => {
    console.log("📋 [FRONTEND] getRoomDetails() START - roomId:", roomId);
    try {
      console.log("📋 [FRONTEND] getRoomDetails() API call START - GET /rooms/" + roomId);
      const res = await axiosInstance.get(`/rooms/${roomId}`);
      console.log("📋 [FRONTEND] getRoomDetails() API call SUCCESS - Response:", res.data);
      // Apply deduplication to room participants
      const roomWithDedupedParticipants = {
        ...res.data,
        participants: dedupeParticipants(res.data.participants || [])
      };
      console.log("📋 [FRONTEND] getRoomDetails() SUCCESS - Room:", roomWithDedupedParticipants._id, "isActive:", roomWithDedupedParticipants.isActive, "participants:", roomWithDedupedParticipants.participants.length);
      return roomWithDedupedParticipants;
    } catch (error) {
      console.log("📋 [FRONTEND] getRoomDetails() ERROR:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to fetch room details");
      throw error;
    }
  },

  // Socket event handlers - now only for notifications, no state updates
  subscribeToRoom: (roomId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // First, remove any existing listeners to prevent duplicates
    socket.off("roomParticipantJoined");
    socket.off("roomParticipantLeft");
    socket.off("roomUpdated");
    socket.off("roomDeleted");
    socket.off("roomTimerStarted");
    socket.off("roomTimerPaused");
    socket.off("roomTimerStopped");

    // Join the room socket room
    console.log("🔌 [FRONTEND] subscribeToRoom() Emitting joinRoom socket event");
    socket.emit("joinRoom", { roomId, userId: useAuthStore.getState().authUser._id });

    // Listen for participant updates - now only for notifications
    socket.on("roomParticipantJoined", (data) => {
      console.log("🔵 [FRONTEND] Socket event: roomParticipantJoined -", data);
      if (data.roomId === roomId) {
        const currentUserId = useAuthStore.getState().authUser?._id;
        
        // Skip if this is the current user (they're already in the list from API response)
        if (data.participant._id === currentUserId) {
          console.log("🔵 Skipping self join event");
          return;
        }
        
        // Fetch fresh room details to sync state
        console.log("🔵 [FRONTEND] Socket event: roomParticipantJoined - Fetching fresh room details");
        get().getRoomDetails(roomId).then(freshRoom => {
          set({
            currentRoom: freshRoom,
            participants: freshRoom.participants
          });
        }).catch(error => {
          console.error("🔵 [FRONTEND] Socket event: roomParticipantJoined - Error fetching fresh room:", error);
        });
        
        // Also refresh rooms list for ActiveRooms
        get().getRooms();
      }
    });

    socket.on("roomParticipantLeft", (data) => {
      console.log("🔴 [FRONTEND] Socket event: roomParticipantLeft -", data);
      if (data.roomId === roomId) {
        // Fetch fresh room details to sync state
        console.log("🔴 [FRONTEND] Socket event: roomParticipantLeft - Fetching fresh room details");
        get().getRoomDetails(roomId).then(freshRoom => {
          set({
            currentRoom: freshRoom,
            participants: freshRoom.participants
          });
        }).catch(error => {
          console.error("🔴 [FRONTEND] Socket event: roomParticipantLeft - Error fetching fresh room:", error);
        });
        
        // Also refresh rooms list for ActiveRooms
        get().getRooms();
      }
    });

    socket.on("roomUpdated", (data) => {
      if (data.roomId === roomId) {
        // Fetch fresh room details to sync state
        console.log("🔄 [FRONTEND] Socket event: roomUpdated - Fetching fresh room details");
        get().getRoomDetails(roomId).then(freshRoom => {
          set({
            currentRoom: freshRoom,
            participants: freshRoom.participants
          });
        }).catch(error => {
          console.error("🔄 [FRONTEND] Socket event: roomUpdated - Error fetching fresh room:", error);
        });
      }
    });

    socket.on("roomDeleted", (data) => {
      if (data.roomId === roomId) {
        set((state) => ({
          currentRoom: null,
          participants: [],
          rooms: state.rooms.filter(room => room._id !== data.roomId)
        }));
        toast.info("Room has been deleted");
      }
    });

    // Timer events
    socket.on("roomTimerStarted", (data) => {
      if (data.roomId === roomId) {
        // Handle room timer start
        console.log("Room timer started:", data);
      }
    });

    socket.on("roomTimerPaused", (data) => {
      if (data.roomId === roomId) {
        // Handle room timer pause
        console.log("Room timer paused:", data);
      }
    });

    socket.on("roomTimerStopped", (data) => {
      if (data.roomId === roomId) {
        // Handle room timer stop
        console.log("Room timer stopped:", data);
      }
    });
  },

  unsubscribeFromRoom: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Leave the room socket room
    const { currentRoom } = get();
    if (currentRoom) {
      socket.emit("leaveRoom", { roomId: currentRoom._id, userId: useAuthStore.getState().authUser._id });
    }

    socket.off("roomParticipantJoined");
    socket.off("roomParticipantLeft");
    socket.off("roomUpdated");
    socket.off("roomDeleted");
    socket.off("roomTimerStarted");
    socket.off("roomTimerPaused");
    socket.off("roomTimerStopped");
  },

  // Utility actions
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setParticipants: (participants) => set({ participants }),
  clearRoomState: () => set({
    currentRoom: null,
    participants: [],
    rooms: []
  }),

  // Initialize cleanup listeners
  initializeCleanup: () => {
    const handleBeforeUnload = async () => {
      const { currentRoom } = get();
      if (currentRoom) {
        // Use sendBeacon for reliable cleanup on page unload
        const data = JSON.stringify({
          roomId: currentRoom._id,
          userId: useAuthStore.getState().authUser?._id
        });
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/rooms/leave-on-unload', data);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  },

  // Cleanup function to be called on navigation - only clear local state, don't leave room
  cleanupOnNavigation: async () => {
    const { currentRoom } = get();
    if (currentRoom) {
      console.log("🧹 Cleaning up room state on navigation:", currentRoom._id);
      
      // Only clear local state, don't leave the room
      // The room will remain active for other participants
      set({
        currentRoom: null,
        participants: []
      });
      
      console.log("🧹 Successfully cleared room state on navigation");
    }
  },
}));
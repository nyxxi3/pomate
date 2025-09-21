import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// Import timer store to clear timer state on logout
import { useTimerStore } from "./useTimerStore.js";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      try {
        get().connectSocket();
      } catch (socketError) {
        console.error("Socket connection failed:", socketError);
        // Continue without socket connection
      }
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      try {
        get().connectSocket();
      } catch (socketError) {
        console.error("Socket connection failed:", socketError);
        // Continue without socket connection
      }
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      try {
        get().connectSocket();
      } catch (socketError) {
        console.error("Socket connection failed:", socketError);
        // Continue without socket connection
      }
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      
      // Only clear timer state if in strict mode
      try {
        const timerStore = useTimerStore.getState();
        // Check if timer store is properly initialized
        if (timerStore && typeof timerStore.isStrictMode !== 'undefined' && timerStore.running) {
          if (timerStore.isStrictMode) {
            console.log("🔒 Strict mode active, clearing timer state on logout");
            timerStore.clearAllTimerState();
          } else {
            console.log("⏸️ Normal mode, pausing timer on logout (state preserved)");
            // Just pause the timer, don't clear state
            timerStore.stopTimer();
          }
        } else {
          console.log("⏸️ Timer not running or store not initialized, no cleanup needed");
        }
      } catch (error) {
        console.error("Error handling timer state during logout:", error);
        // Continue with logout even if timer handling fails
      }
      
      set({ authUser: null });
      toast.success("Logged out successfully");
      
      // Leave all rooms before disconnecting
      await get().leaveAllRooms();
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // Send heartbeat every 30 seconds to keep connection alive and track activity
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        // Import room store dynamically to get current room
        import("./useRoomStore.js").then(({ useRoomStore }) => {
          const { currentRoom } = useRoomStore.getState();
          socket.emit("heartbeat", { 
            roomId: currentRoom?._id || null 
          });
        });
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Handle heartbeat acknowledgment
    socket.on("heartbeatAck", (data) => {
      console.log("💓 [FRONTEND] Heartbeat acknowledged:", data.timestamp);
    });

    // Store interval ID for cleanup
    socket.heartbeatInterval = heartbeatInterval;
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) {
      // Clear heartbeat interval
      if (socket.heartbeatInterval) {
        clearInterval(socket.heartbeatInterval);
      }
      socket.disconnect();
    }
  },

  // Cleanup function to leave all rooms when user logs out or disconnects
  leaveAllRooms: async () => {
    try {
      // Import room store dynamically to avoid circular dependency
      const { useRoomStore } = await import("./useRoomStore.js");
      const roomStore = useRoomStore.getState();
      
      // Only leave the current room if it exists
      if (roomStore.currentRoom) {
        console.log("🚪 [AUTH] Leaving current room during logout:", roomStore.currentRoom._id);
        await roomStore.leaveRoom();
      } else {
        // If no current room, use cleanup endpoint to ensure user is removed from all rooms
        console.log("🚪 [AUTH] No current room, using cleanup endpoint for logout");
        try {
          await axiosInstance.post("/rooms/cleanup-user-sockets", {
            userId: get().authUser?._id
          });
        } catch (cleanupError) {
          console.error("🚪 [AUTH] Error during cleanup endpoint:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error leaving rooms during cleanup:", error);
    }
  },
}));

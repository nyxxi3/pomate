import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useRoomChatStore = create((set, get) => ({
  messages: [],
  isMessagesLoading: false,
  currentRoomId: null,

  // Get messages for a room
  getRoomMessages: async (roomId) => {
    set({ isMessagesLoading: true, currentRoomId: roomId });
    try {
      const res = await axiosInstance.get(`/room-messages/${roomId}`);
      set({ messages: res.data });
    } catch (error) {
      console.error("Error fetching room messages:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load chat messages");
      }
      set({ messages: [] });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Send message to a room
  sendRoomMessage: async (roomId, text) => {
    try {
      const res = await axiosInstance.post(`/room-messages/${roomId}`, { text });
      // Add the new message to the local state
      set(state => ({
        messages: [...state.messages, res.data]
      }));
      return res.data;
    } catch (error) {
      console.error("Error sending room message:", error);
      toast.error("Failed to send message");
      throw error;
    }
  },

  // Add a new message (for real-time updates)
  addMessage: (message) => {
    set(state => {
      // Check if message already exists to avoid duplicates
      const messageExists = state.messages.some(msg => msg._id === message._id);
      if (messageExists) {
        return state;
      }
      return {
        messages: [...state.messages, message]
      };
    });
  },

  // Clear messages (when leaving a room)
  clearMessages: () => {
    set({ messages: [], currentRoomId: null });
  },

  // Subscribe to room messages
  subscribeToRoomMessages: (roomId, socket) => {
    if (!socket) return;

    const handleNewRoomMessage = (message) => {
      // Only add message if it's for the current room
      if (message.roomId === roomId) {
        get().addMessage(message);
      }
    };

    socket.on('newRoomMessage', handleNewRoomMessage);

    return () => {
      socket.off('newRoomMessage', handleNewRoomMessage);
    };
  },

  // Unsubscribe from room messages
  unsubscribeFromRoomMessages: (socket) => {
    if (socket) {
      socket.off('newRoomMessage');
    }
  }
}));









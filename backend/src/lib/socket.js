import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { initializeTimerSync, stopTimerBroadcast } from './timerSync.js';

// These will be set by the initializeSocket function
let app;
let server;
let io;

// Timer management is now handled by timerSync.js

export const initializeSocket = (expressApp, httpServer) => {
  app = expressApp;
  server = httpServer;
  io = new Server(server, {
  cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
  },
});

  // Track user activity for heartbeat system
  const userActivity = new Map(); // userId -> { lastSeen, socketId, roomId }
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const INACTIVITY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours - only remove users after 24 hours of inactivity
  
  // Track timer sync requests to prevent spam
  const lastSyncRequests = new Map(); // userId -> timestamp

  // ============================================================================
  // HEARTBEAT SYSTEM - DETECT INACTIVE USERS
  // ============================================================================

  // Periodic cleanup of inactive users - MUCH LESS AGGRESSIVE
  setInterval(async () => {
    const now = Date.now();
    const inactiveUsers = [];

    for (const [userId, activity] of userActivity.entries()) {
      if (now - activity.lastSeen > INACTIVITY_THRESHOLD) {
        inactiveUsers.push({ userId, roomId: activity.roomId });
        userActivity.delete(userId);
        lastSyncRequests.delete(userId); // Clean up sync request tracking
      }
    }

    // Only remove users who have been inactive for 24+ hours
    if (inactiveUsers.length > 0) {
      console.log("💓 [BACKEND] Heartbeat cleanup - Removing", inactiveUsers.length, "users inactive for 24+ hours");
      
      try {
        const Room = (await import("../models/room.model.js")).default;
        
        for (const { userId, roomId } of inactiveUsers) {
          if (roomId) {
            const room = await Room.findById(roomId);
            if (room) {
              // CRITICAL: NEVER remove the room creator from participants, even if inactive
              // The creator maintains their host position regardless of connection status
              const isCreator = room.creator.toString() === userId;
              
              if (isCreator) {
                console.log("💓 [BACKEND] Skipping removal of room creator", userId, "from room", roomId, "- creator status preserved");
                // Don't remove creator from participants list
                // They remain the host even when disconnected
              } else {
                // Only remove non-creator participants who have been inactive for 24+ hours
                room.participants = room.participants.filter(p => p.toString() !== userId);
                await room.save();
                console.log("💓 [BACKEND] Removed user inactive for 24+ hours", userId, "from room", roomId);
                
                // Broadcast room update
                io.to(roomId).emit("roomUpdated", {
                  roomId: roomId,
                  participants: room.participants.map(p => p.toString())
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("💓 [BACKEND] Heartbeat cleanup error:", error);
      }
    }
  }, HEARTBEAT_INTERVAL);

  // ============================================================================
  // DORMANT ROOM CHECK - RUNS EVERY 6 HOURS
  // ============================================================================
  
  setInterval(async () => {
    console.log("💤 [BACKEND] Checking for dormant rooms...");
    
    try {
      const Room = (await import("../models/room.model.js")).default;
      
      // Find all active rooms that might need to be marked dormant
      const activeRooms = await Room.find({ 
        isActive: true,
        dormantAt: null 
      });
      
      let dormantCount = 0;
      
      for (const room of activeRooms) {
        if (room.checkDormantStatus()) {
          await room.save();
          dormantCount++;
        }
      }
      
      if (dormantCount > 0) {
        console.log(`💤 [BACKEND] Marked ${dormantCount} rooms as dormant`);
      }
    } catch (error) {
      console.error("💤 [BACKEND] Dormant room check error:", error);
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours

  // ============================================================================
  // SOCKET CONNECTION HANDLING
  // ============================================================================

  io.on("connection", (socket) => {
    console.log("🔌 [BACKEND] Socket connected:", socket.id);

    const userId = socket.handshake.query.userId;
    if (!userId) {
      console.log("🔌 [BACKEND] Socket connection rejected - No userId provided");
      socket.disconnect();
      return;
    }

    socket.userId = userId;
    console.log("🔌 [BACKEND] Socket authenticated for user:", userId);

    // ============================================================================
    // HEARTBEAT HANDLING
    // ============================================================================

    socket.on("heartbeat", (data) => {
      const { roomId } = data || {};
      
      // Update user activity
      userActivity.set(userId, {
        lastSeen: Date.now(),
        socketId: socket.id,
        roomId: roomId || null
      });

      console.log("💓 [BACKEND] Heartbeat received from user:", userId, "in room:", roomId);
      
      // Send heartbeat acknowledgment
      socket.emit("heartbeatAck", { timestamp: Date.now() });
    });

    // ============================================================================
    // 1:1 CHAT FUNCTIONALITY (ORIGINAL - DO NOT TOUCH)
    // ============================================================================

    // Add user to online users list
    socket.broadcast.emit("getOnlineUsers", [userId]);

    // Handle new message
    socket.on("newMessage", (data) => {
      const { receiverId, message } = data;
      const receiverSocketId = getReceiverSocketId(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", {
          senderId: userId,
          message: message,
          timestamp: new Date(),
        });
      }
    });

    // ============================================================================
    // ROOM FUNCTIONALITY (NEW)
    // ============================================================================

    // Handle admin transfer
    socket.on('transferAdmin', async (data) => {
      try {
        const { roomId, newAdminId } = data;
        if (!roomId || !newAdminId) {
          console.error('❌ [BACKEND] transferAdmin - Missing roomId or newAdminId');
          return;
        }

        const Room = (await import("../models/room.model.js")).default;
        const room = await Room.findById(roomId);

        if (!room) {
          console.error('❌ [BACKEND] transferAdmin - Room not found:', roomId);
          return;
        }

        // Verify the requester is the current admin
        if (room.creator.toString() !== socket.userId) {
          console.error('❌ [BACKEND] transferAdmin - Unauthorized admin transfer attempt by:', socket.userId);
          return;
        }

        // Verify the new admin is a participant in the room
        if (!room.participants.some(p => p.toString() === newAdminId)) {
          console.error('❌ [BACKEND] transferAdmin - New admin is not a participant in the room');
          return;
        }

        // Update the room's creator
        room.creator = newAdminId;
        await room.save();

        // Notify all clients in the room about the admin change
        io.to(roomId).emit('adminTransferred', {
          roomId: room._id,
          newAdminId,
          previousAdminId: socket.userId
        });

        console.log(`✅ [BACKEND] Admin transferred in room ${roomId} to ${newAdminId}`);
      } catch (error) {
        console.error('❌ [BACKEND] Error in transferAdmin:', error);
      }
    });

    socket.on("joinRoom", async (data) => {
      const { roomId } = data;
      console.log("🔌 [BACKEND] Socket event: joinRoom - roomId:", roomId, "userId:", userId, "socketId:", socket.id);
      
      try {
        // Get user data
        const User = (await import("../models/user.model.js")).default;
        const user = await User.findById(userId).select('username fullName email profilePic');
        
        if (!user) {
          console.log("🔌 [BACKEND] Socket event: joinRoom - User not found");
          return;
        }
        
        // Check if user is already in this socket room (prevent duplicate joins)
        const isAlreadyInRoom = socket.rooms && socket.rooms.has(roomId);
        if (isAlreadyInRoom) {
          console.log("🔌 [BACKEND] Socket event: joinRoom - User already in socket room, skipping join");
          // Still update activity but don't broadcast join event
          userActivity.set(userId, {
            lastSeen: Date.now(),
            socketId: socket.id,
            roomId: roomId
          });
          return;
        }
        
        // Join the socket.io room
        socket.join(roomId);
        console.log("🔌 [BACKEND] Socket event: joinRoom - User joined room successfully");
        
        // Update user activity
        userActivity.set(userId, {
          lastSeen: Date.now(),
          socketId: socket.id,
          roomId: roomId
        });
        
        // Get room data to check for admin transfer
        const Room = (await import("../models/room.model.js")).default;
        const room = await Room.findById(roomId)
          .populate('creator', 'username fullName email profilePic')
          .populate('participants', 'username fullName email profilePic');
        
        let newAdmin = null;
        
        // Check if user is already a participant in the database
        const isExistingParticipant = room && room.participants.some(participant => {
          const participantId = participant._id ? participant._id.toString() : participant.toString();
          return participantId === userId.toString();
        });
        
        // Special case: Creator is always considered an existing participant
        const isCreator = room && room.creator && room.creator._id.toString() === userId.toString();
        const isExistingParticipantOrCreator = isExistingParticipant || isCreator;
        
        console.log("🔌 [BACKEND] Socket event: joinRoom - Debug info:", {
          userId: userId,
          roomId: roomId,
          hasCreator: !!room?.creator,
          creatorId: room?.creator?._id?.toString(),
          participantsCount: room?.participants?.length || 0,
          participants: room?.participants?.map(p => p._id?.toString() || p.toString()),
          isExistingParticipant: isExistingParticipant,
          isCreator: isCreator,
          isExistingParticipantOrCreator: isExistingParticipantOrCreator,
          roomData: {
            _id: room?._id,
            name: room?.name,
            creator: room?.creator?._id?.toString(),
            participants: room?.participants?.length
          }
        });
        
        // CREATOR PRIORITY SYSTEM: Room creator ALWAYS maintains host position
        // Host transfer ONLY happens when creator explicitly leaves room via leaveRoom endpoint
        
        // CRITICAL: Check if this user is the original room creator
        if (room && room.creator && room.creator._id.toString() === userId.toString()) {
          // CREATOR IS RECONNECTING - THEY ALWAYS GET THEIR HOST POSITION BACK
          console.log("🔌 [BACKEND] Socket event: joinRoom - CREATOR RECONNECTING, restoring host position:", user.username);
          
          // Force restore creator status - this is the most important part
          room.creator = user._id;
          
          // Ensure the creator is in the participants list
          const isCreatorInParticipants = room.participants.some(participant => {
            const participantId = participant._id ? participant._id.toString() : participant.toString();
            return participantId === userId.toString();
          });
          
          if (!isCreatorInParticipants) {
            console.log("🔌 [BACKEND] Socket event: joinRoom - Adding creator back to participants list");
            room.participants.push(user._id);
          }
          
          // Save the room with restored creator status
          await room.save();
          
          // Join socket room for real-time communication
          socket.join(roomId);
          
          // Announce that the creator has returned and is now the host again
          newAdmin = {
            _id: user._id,
            username: user.username || 'User',
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic
          };
          
          console.log("🔌 [BACKEND] Socket event: joinRoom - CREATOR HOST POSITION RESTORED:", user.username);
          
        } else if (isExistingParticipantOrCreator) {
          // User is already a participant or creator - no admin transfer needed
          console.log("🔌 [BACKEND] Socket event: joinRoom - User is existing participant, no admin transfer allowed");
          console.log("🔌 [BACKEND] Socket event: joinRoom - Participant check details:", {
            userId: userId,
            participants: room?.participants?.map(p => p._id?.toString() || p.toString()),
            isExistingParticipant: isExistingParticipant,
            isCreator: isCreator,
            isExistingParticipantOrCreator: isExistingParticipantOrCreator
          });
          // Still need to join socket room for real-time communication
          socket.join(roomId);
          return;
          
        } else if (!isExistingParticipant && room && !room.creator) {
          // Genuine new user joining a room with no creator (first user ever)
          console.log("🔌 [BACKEND] Socket event: joinRoom - First user joining empty room, making them creator:", user.username);
          room.creator = user._id;
          room.participants.push(user._id);
          await room.save();
          
          newAdmin = {
            _id: user._id,
            username: user.username || 'User',
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic
          };
          
        } else if (room && room.creator) {
          // Room has a creator but user is not the creator - no admin transfer
          console.log("🔌 [BACKEND] Socket event: joinRoom - Room has creator, no admin transfer allowed. Creator:", room.creator.username);
          
        } else {
          console.log("🔌 [BACKEND] Socket event: joinRoom - No admin transfer needed");
        }
        
        // Join socket room for real-time communication (for all cases except existing participants)
        socket.join(roomId);
        
        // Prepare participant data
        const participantData = {
          _id: user._id,
          username: user.username || 'User',
          fullName: user.fullName,
          email: user.email,
          profilePic: user.profilePic
        };
        
        // Always broadcast join event when someone joins the socket room
        // This ensures real-time updates for all participants
          const joinData = {
            userId: userId,
            roomId: roomId,
            participant: participantData
          };
          
          if (newAdmin) {
            joinData.newAdmin = newAdmin;
          }
          
          socket.broadcast.to(roomId).emit("roomParticipantJoined", joinData);
          
          console.log("🔌 [BACKEND] Socket event: joinRoom - Broadcasting roomParticipantJoined");
        
        console.log("🔌 [BACKEND] Socket event: joinRoom - User", userId, "joined room", roomId, "(socket:", socket.id + ")");
      } catch (error) {
        console.error("🔌 [BACKEND] Socket event: joinRoom - Error:", error);
      }
    });

    socket.on("leaveRoom", async (data) => {
      const { roomId } = data;
      console.log("🔌 [BACKEND] Socket event: leaveRoom - roomId:", roomId, "userId:", userId, "socketId:", socket.id);
      
      // IMPORTANT: This socket event should ONLY be used for legitimate room leaving
      // It should NOT be called during component cleanup or page navigation
      // The main room leaving logic should use the HTTP API endpoint /rooms/:roomId/leave
      
      try {
        // Get room data to check if the leaving user is the creator
        const Room = (await import("../models/room.model.js")).default;
        const room = await Room.findById(roomId)
          .populate('creator', 'username fullName email profilePic')
          .populate('participants', 'username fullName email profilePic');
        
        if (!room) {
          console.log("🔌 [BACKEND] Socket event: leaveRoom - Room not found");
          return;
        }
        
        // Check if the leaving user is the creator
        const isCreator = room.creator._id.toString() === userId || 
                         room.creator.toString() === userId;
        
        let newAdmin = null;
        
        // CREATOR PRIORITY SYSTEM: Only transfer admin when creator explicitly leaves
        // This is the ONLY scenario where host transfer should happen
        if (isCreator && room.participants.length > 1) {
          // Find the first participant who is not the current user
          const newAdminUser = room.participants.find(p => {
            const participantId = p._id ? p._id.toString() : p.toString();
            return participantId !== userId;
          });
          
          if (newAdminUser) {
            // Update the room with the new admin
            room.creator = newAdminUser._id || newAdminUser;
            await room.save();
            
            // Populate the new admin data
            newAdmin = {
              _id: newAdminUser._id || newAdminUser,
              username: newAdminUser.username || 'User',
              fullName: newAdminUser.fullName,
              email: newAdminUser.email,
              profilePic: newAdminUser.profilePic
            };
            
            console.log("🔌 [BACKEND] Socket event: leaveRoom - Transferred admin to:", newAdmin.username);
          }
        }
        
        // Leave the socket.io room
        socket.leave(roomId);
        console.log("🔌 [BACKEND] Socket event: leaveRoom - User left room successfully");
        
        // Update user activity
        userActivity.set(userId, {
          lastSeen: Date.now(),
          socketId: socket.id,
          roomId: null
        });
        
        // Get user data for the leave notification
        const User = (await import("../models/user.model.js")).default;
        const user = await User.findById(userId);
        
        // Broadcast to room that user left, including new admin info if applicable
        const leaveData = {
          userId: userId,
          roomId: roomId,
          username: user?.username || 'User',
          fullName: user?.fullName || user?.username || 'User'
        };
        
        if (newAdmin) {
          leaveData.newAdmin = newAdmin;
        }
        
        socket.broadcast.to(roomId).emit("roomParticipantLeft", leaveData);
        
        console.log("🔌 [BACKEND] Socket event: leaveRoom - Broadcasting roomParticipantLeft");
        console.log("🔌 [BACKEND] Socket event: leaveRoom - User", userId, "left room", roomId);
      } catch (error) {
        console.error("🔌 [BACKEND] Socket event: leaveRoom - Error:", error);
      }
    });

    // ============================================================================
    // TIMER SYNCHRONIZATION EVENTS
    // ============================================================================
    initializeTimerSync(socket);

    // Timer pause is now handled by timerSync.js

    // Timer stop is now handled by timerSync.js

    // Timer resume is now handled by timerSync.js

    socket.on("timerSyncRequest", async (data) => {
      const { roomId } = data;
      const now = Date.now();
      
      // Throttle timer sync requests - only allow one every 2 seconds per user
      const lastRequest = lastSyncRequests.get(userId) || 0;
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < 2000) {
        console.log("⏰ [BACKEND] Socket event: timerSyncRequest - THROTTLED for user:", userId, "time since last:", timeSinceLastRequest);
        return;
      }
      
      console.log("⏰ [BACKEND] Socket event: timerSyncRequest - roomId:", roomId, "userId:", userId);
      lastSyncRequests.set(userId, now);
      
      try {
        // Get current room timer state
        const Room = (await import("../models/room.model.js")).default;
        const room = await Room.findById(roomId);
        
        if (!room || !room.timer) {
          console.log("⏰ [BACKEND] Socket event: timerSyncRequest - No active timer session");
          return;
        }
        
        // Use the room's getTimerState method to get accurate timer state
        const timerState = room.getTimerState();
        if (!timerState) {
          console.log("⏰ [BACKEND] Socket event: timerSyncRequest - No timer state available");
          return;
        }
        
        // Send current timer state to requesting user
        socket.emit("timerSync", {
          action: 'sync',
          timerData: {
            sessionType: timerState.sessionType,
            duration: timerState.duration,
            startTime: timerState.startTime,
            remaining: timerState.remaining,
            isRunning: timerState.isRunning
          }
        });
        
        console.log("⏰ [BACKEND] Socket event: timerSyncRequest - Sent timer sync to user:", userId);
      } catch (error) {
        console.error("⏰ [BACKEND] Socket event: timerSyncRequest - Error:", error);
      }
    });

    // ============================================================================
    // DISCONNECT HANDLING
    // ============================================================================

    socket.on("disconnect", async () => {
      console.log("🔌 [BACKEND] Socket event: disconnect - socketId:", socket.id, "userId:", userId);
      
      try {
        // Get user's current room from activity
        const userActivityData = userActivity.get(userId);
        const currentRoomId = userActivityData?.roomId;
        
        // If user was in a room, handle the disconnect properly
        if (currentRoomId) {
          console.log("🔌 [BACKEND] Socket event: disconnect - User was in room:", currentRoomId);
          
          // Get room data to check if user is the creator
          const Room = (await import("../models/room.model.js")).default;
          const room = await Room.findById(currentRoomId)
            .populate('creator', 'username fullName email profilePic')
            .populate('participants', 'username fullName email profilePic');
          
          if (room) {
            const isCreator = room.creator._id.toString() === userId.toString() || 
                             room.creator.toString() === userId.toString();
            
            // Get user data for the leave notification
            const User = (await import("../models/user.model.js")).default;
            const user = await User.findById(userId);
            
            // CRITICAL FIX: Remove user from participants list when they disconnect
            // This frees up space for other users to join
            console.log("🔌 [BACKEND] Socket event: disconnect - Removing user from participants list");
            
            // First remove duplicates, then remove the disconnecting user
            const removedDuplicates = room.removeDuplicateParticipants();
            if (removedDuplicates > 0) {
              console.log("🔌 [BACKEND] Socket event: disconnect - Removed", removedDuplicates, "duplicate participants");
            }
            
            // DON'T automatically remove users from rooms on disconnect
            // Users should only be removed when they explicitly leave or after 24+ hours of inactivity
            // This allows users to navigate away and come back without losing their room membership
            console.log("🔌 [BACKEND] Socket event: disconnect - User disconnected but keeping them in room for now");
            
            let newAdmin = null;
            
            // Handle admin transfer if creator disconnected
            if (isCreator && room.participants.length > 1) {
              console.log("🔌 [BACKEND] Socket event: disconnect - Creator disconnected, transferring admin");
              
              // Transfer admin to the first remaining participant (excluding the creator)
              const newAdminId = room.participants.find(p => p.toString() !== userId.toString());
              if (newAdminId) {
                room.creator = newAdminId;
                
                // Get the new admin's details
                const populatedNewAdmin = await User.findById(newAdminId);
                if (populatedNewAdmin) {
                  newAdmin = {
                    _id: populatedNewAdmin._id,
                    username: populatedNewAdmin.username,
                    fullName: populatedNewAdmin.fullName,
                    email: populatedNewAdmin.email,
                    profilePic: populatedNewAdmin.profilePic
                  };
                  console.log("🔌 [BACKEND] Socket event: disconnect - Transferred admin to user:", newAdmin.username);
                }
              }
            }
            
            // If no participants left, delete the room
            if (room.participants.length === 0) {
              console.log("🔌 [BACKEND] Socket event: disconnect - No participants left, deleting room");
              await Room.findByIdAndDelete(currentRoomId);
              stopTimerBroadcast(currentRoomId);
              
              // Broadcast room deletion
              socket.broadcast.to(currentRoomId).emit("roomDeleted", {
                roomId: currentRoomId,
                reason: "All participants disconnected"
              });
            } else {
              // Save the updated room
              await room.save();
              
              // Re-populate the room with updated participants
              const updatedRoom = await Room.findById(room._id)
                .populate("creator", "username fullName email profilePic")
                .populate("participants", "username fullName email profilePic");
              
              // Broadcast participant disconnected event with updated room data
              const disconnectData = {
                userId: userId,
                roomId: currentRoomId,
                username: user?.username || 'User',
                fullName: user?.fullName || user?.username || 'User',
                newAdmin: newAdmin,
                updatedParticipants: updatedRoom.participants,
                isDisconnect: true // Flag to indicate this is a disconnect, not a manual leave
              };
              
              socket.broadcast.to(currentRoomId).emit("roomParticipantDisconnected", disconnectData);
              console.log("🔌 [BACKEND] Socket event: disconnect - Broadcasting roomParticipantDisconnected for room:", currentRoomId);
            }
          }
        }
      } catch (error) {
        console.error("🔌 [BACKEND] Socket event: disconnect - Error:", error);
      }
      
      // Remove from user activity
      userActivity.delete(userId);
      
      // Clean up sync request tracking
      lastSyncRequests.delete(userId);
      
      // Remove user from online users list
      socket.broadcast.emit("getOnlineUsers", [userId]);
      
      console.log("🔌 [BACKEND] Socket event: disconnect - User cleanup completed");
    });
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getReceiverSocketId = (userId) => {
  if (!io) return null;
  
  // Find socket by userId
  for (const [socketId, socket] of io.sockets.sockets.entries()) {
    if (socket.userId === userId) {
      return socketId;
    }
  }
  return null;
};

export const getSocketServer = () => {
  return io;
};

// Export io for backward compatibility
export { io };

// Export server for index.js
export { server };
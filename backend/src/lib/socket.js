import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

// used to store room participants
const roomSocketMap = {}; // {roomId: [socketId1, socketId2, ...]}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // relay typing indicators for 1:1 chats
  socket.on("typing", ({ to, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { from });
    }
  });

  socket.on("stopTyping", ({ to, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", { from });
    }
  });

  // Room-related socket events
  socket.on("joinRoom", async ({ roomId, userId }) => {
    console.log("🔌 [BACKEND] Socket event: joinRoom - roomId:", roomId, "userId:", userId, "socketId:", socket.id);
    socket.join(roomId);
    
    // Handle socket cleanup for reconnecting users
    if (userSocketMap[userId] && userSocketMap[userId] !== socket.id) {
      console.log("🔌 [BACKEND] Socket event: joinRoom - Disconnecting old socket for user:", userId);
      // Disconnect old socket if user reconnected
      const oldSocket = io.sockets.sockets.get(userSocketMap[userId]);
      if (oldSocket) {
        oldSocket.disconnect();
      }
    }
    
    // Update user socket mapping
    userSocketMap[userId] = socket.id;
    console.log("🔌 [BACKEND] Socket event: joinRoom - Updated userSocketMap for user:", userId);
    
    // Track room participants
    if (!roomSocketMap[roomId]) {
      roomSocketMap[roomId] = [];
    }
    if (!roomSocketMap[roomId].includes(socket.id)) {
      roomSocketMap[roomId].push(socket.id);
    }
    console.log("🔌 [BACKEND] Socket event: joinRoom - roomSocketMap updated for room:", roomId, "sockets:", roomSocketMap[roomId].length);
    
    // Get full participant data from database for notification
    try {
      const User = (await import("../models/user.model.js")).default;
      
      const user = await User.findById(userId).select("fullName email profilePic");
      if (user) {
        console.log("🔌 [BACKEND] Socket event: joinRoom - Broadcasting roomParticipantJoined");
        // Use broadcast to notify other participants (excludes the sender)
        socket.broadcast.to(roomId).emit("roomParticipantJoined", {
          roomId,
          participant: { 
            _id: userId, 
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
            isOnline: true
          }
        });
      }
    } catch (error) {
      console.error("🔌 [BACKEND] Socket event: joinRoom - Error fetching user data:", error);
    }
    
    console.log(`🔌 [BACKEND] Socket event: joinRoom - User ${userId} joined room ${roomId} (socket: ${socket.id})`);
  });

  socket.on("leaveRoom", async ({ roomId, userId }) => {
    console.log("🔌 [BACKEND] Socket event: leaveRoom - roomId:", roomId, "userId:", userId, "socketId:", socket.id);
    try {
      socket.leave(roomId);
      
      // Remove from room tracking
      if (roomSocketMap[roomId]) {
        roomSocketMap[roomId] = roomSocketMap[roomId].filter(id => id !== socket.id);
        if (roomSocketMap[roomId].length === 0) {
          delete roomSocketMap[roomId];
        }
      }
      console.log("🔌 [BACKEND] Socket event: leaveRoom - roomSocketMap updated for room:", roomId);
      
      // Broadcast to notify other participants (excludes the sender)
      console.log("🔌 [BACKEND] Socket event: leaveRoom - Broadcasting roomParticipantLeft");
      socket.broadcast.to(roomId).emit("roomParticipantLeft", {
        roomId,
        participantId: userId
      });
      
      console.log(`🔌 [BACKEND] Socket event: leaveRoom - User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error("🔌 [BACKEND] Socket event: leaveRoom - Error:", error);
    }
  });

  socket.on("roomTimerStart", ({ roomId, sessionType, duration }) => {
    // Broadcast timer start to all room participants
    io.to(roomId).emit("roomTimerStarted", {
      roomId,
      sessionType,
      duration,
      startTime: Date.now()
    });
  });

  socket.on("roomTimerPause", ({ roomId }) => {
    // Broadcast timer pause to all room participants
    io.to(roomId).emit("roomTimerPaused", {
      roomId,
      pauseTime: Date.now()
    });
  });

  socket.on("roomTimerStop", ({ roomId }) => {
    // Broadcast timer stop to all room participants
    io.to(roomId).emit("roomTimerStopped", {
      roomId,
      stopTime: Date.now()
    });
  });

  socket.on("roomMessage", ({ roomId, message, userId }) => {
    // Broadcast message to all room participants
    io.to(roomId).emit("roomMessageReceived", {
      roomId,
      message,
      userId,
      timestamp: Date.now()
    });
  });

  socket.on("disconnect", async () => {
    console.log("🔌 [BACKEND] Socket event: disconnect - socketId:", socket.id, "userId:", userId);
    delete userSocketMap[userId];
    
    // Remove from all rooms and notify participants
    const roomIds = Object.keys(roomSocketMap).filter(roomId => 
      roomSocketMap[roomId].includes(socket.id)
    );
    console.log("🔌 [BACKEND] Socket event: disconnect - User was in rooms:", roomIds);
    
    for (const roomId of roomIds) {
      try {
        console.log("🔌 [BACKEND] Socket event: disconnect - Processing room:", roomId);
        // Remove from room tracking
        roomSocketMap[roomId] = roomSocketMap[roomId].filter(id => id !== socket.id);
        if (roomSocketMap[roomId].length === 0) {
          delete roomSocketMap[roomId];
        }
        
        // Notify room participants that user left (use broadcast since socket is disconnecting)
        console.log("🔌 [BACKEND] Socket event: disconnect - Broadcasting roomParticipantLeft for room:", roomId);
        socket.broadcast.to(roomId).emit("roomParticipantLeft", {
          roomId,
          participantId: userId
        });
      } catch (error) {
        console.error(`🔌 [BACKEND] Socket event: disconnect - Error handling room ${roomId}:`, error);
      }
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
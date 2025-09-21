import Room from "../models/room.model.js";
import User from "../models/user.model.js";

// ============================================================================
// ROOM MANAGEMENT - CLEAN DB-FIRST ARCHITECTURE
// ============================================================================

export const createRoom = async (req, res) => {
  console.log("🏗️ [BACKEND] createRoom() START - userId:", req.user._id, "data:", req.body);
  try {
    const {
      name,
      description,
      isPublic = true,
      maxParticipants = 8,
      workDuration = 25,
      breakDuration = 5,
      enableChat = true,
    } = req.body;

    const userId = req.user._id;

    // Validate required fields
    if (!name || name.trim().length < 3) {
      console.log("🏗️ [BACKEND] createRoom() VALIDATION ERROR - Room name too short");
      return res.status(400).json({ message: "Room name must be at least 3 characters" });
    }

    if (maxParticipants < 2 || maxParticipants > 15) {
      console.log("🏗️ [BACKEND] createRoom() VALIDATION ERROR - Invalid max participants");
      return res.status(400).json({ message: "Max participants must be between 2 and 15" });
    }

    if (workDuration < 5 || workDuration > 60) {
      console.log("🏗️ [BACKEND] createRoom() VALIDATION ERROR - Invalid work duration");
      return res.status(400).json({ message: "Work duration must be between 5 and 60 minutes" });
    }

    if (breakDuration < 1 || breakDuration > 30) {
      console.log("🏗️ [BACKEND] createRoom() VALIDATION ERROR - Invalid break duration");
      return res.status(400).json({ message: "Break duration must be between 1 and 30 minutes" });
    }

    // Create new room with creator as first participant
    console.log("🏗️ [BACKEND] createRoom() Creating new room in database");
    const newRoom = new Room({
      name: name.trim(),
      description: description?.trim(),
      isPublic,
      maxParticipants,
      pomodoroMode: true, // Always true for group sessions
      workDuration,
      breakDuration,
      enableChat,
      creator: userId,
      participants: [userId], // Creator is automatically a participant
      isActive: true,
    });

    await newRoom.save();
    console.log("🏗️ [BACKEND] createRoom() Room created successfully");

    // Populate room data
    console.log("🏗️ [BACKEND] createRoom() Populating room data");
    const populatedRoom = await Room.findById(newRoom._id)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    console.log("🏗️ [BACKEND] createRoom() SUCCESS - Returning populated room:", newRoom._id, "isActive:", populatedRoom.isActive, "participants:", populatedRoom.participants.length);
    res.status(201).json(populatedRoom);
  } catch (error) {
    console.log("🏗️ [BACKEND] createRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getRooms = async (req, res) => {
  console.log("📋 [BACKEND] getRooms() START");
  try {
    const rooms = await Room.find({ isPublic: true, isActive: true })
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic")
      .sort({ createdAt: -1 });

    console.log("📋 [BACKEND] getRooms() SUCCESS - Found", rooms.length, "rooms");
    res.status(200).json(rooms);
  } catch (error) {
    console.log("📋 [BACKEND] getRooms() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserRooms = async (req, res) => {
  console.log("📋 [BACKEND] getUserRooms() START - userId:", req.user._id);
  try {
    const userId = req.user._id;
    
    // Get all rooms where user is creator or participant (including dormant rooms)
    const rooms = await Room.find({
      $or: [
        { creator: userId },
        { participants: userId }
      ]
    })
    .populate("creator", "fullName email profilePic")
    .populate("participants", "fullName email profilePic")
    .sort({ createdAt: -1 });

    console.log("📋 [BACKEND] getUserRooms() SUCCESS - Found", rooms.length, "rooms (including dormant)");
    res.status(200).json(rooms);
  } catch (error) {
    console.log("📋 [BACKEND] getUserRooms() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const reactivateRoom = async (req, res) => {
  console.log("🔄 [BACKEND] reactivateRoom() START - roomId:", req.params.roomId);
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only room creator can reactivate
    if (room.creator.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only room creator can reactivate the room" });
    }

    // Reactivate the room
    await room.reactivate();

    // Populate the reactivated room
    const reactivatedRoom = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    console.log("🔄 [BACKEND] reactivateRoom() SUCCESS - Room reactivated");
    res.status(200).json(reactivatedRoom);
  } catch (error) {
    console.log("🔄 [BACKEND] reactivateRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getRoomById = async (req, res) => {
  const { roomId } = req.params;
  console.log("📋 [BACKEND] getRoomById() START - roomId:", roomId);
  
  try {
    console.log("📋 [BACKEND] getRoomById() Querying database for room");
    const room = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    if (!room) {
      console.log("📋 [BACKEND] getRoomById() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }

    if (!room.isActive) {
      console.log("📋 [BACKEND] getRoomById() ERROR - Room is no longer active");
      return res.status(400).json({ message: "Room is no longer active" });
    }

    // Remove duplicates from participants list
    const removedCount = room.removeDuplicateParticipants();
    if (removedCount > 0) {
      console.log("📋 [BACKEND] getRoomById() Removed", removedCount, "duplicate participants");
      await room.save();
    }

    console.log("📋 [BACKEND] getRoomById() SUCCESS - Returning room with", room.participants.length, "participants");
    res.status(200).json(room);
  } catch (error) {
    console.log("📋 [BACKEND] getRoomById() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getRoomParticipants = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;
  console.log("👥 [BACKEND] getRoomParticipants() START - roomId:", roomId, "userId:", userId);
  
  try {
    console.log("👥 [BACKEND] getRoomParticipants() Querying database for room");
    const room = await Room.findById(roomId)
      .populate("participants", "username fullName email profilePic");

    if (!room) {
      console.log("👥 [BACKEND] getRoomParticipants() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }

    if (!room.isActive) {
      console.log("👥 [BACKEND] getRoomParticipants() ERROR - Room is no longer active");
      return res.status(400).json({ message: "Room is no longer active" });
    }

    // Remove duplicates from participants list
    const removedCount = room.removeDuplicateParticipants();
    if (removedCount > 0) {
      console.log("👥 [BACKEND] getRoomParticipants() Removed", removedCount, "duplicate participants");
      await room.save();
    }

    // Check if user is a participant - robust check
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
      
      const userIdStr = userId.toString();
      return participantId === userIdStr;
    });

    if (!isParticipant) {
      console.log("👥 [BACKEND] getRoomParticipants() ERROR - User not a participant");
      return res.status(403).json({ message: "Access denied. You are not a participant in this room." });
    }

    console.log("👥 [BACKEND] getRoomParticipants() SUCCESS - Returning", room.participants.length, "participants");
    res.status(200).json(room.participants);
  } catch (error) {
    console.log("👥 [BACKEND] getRoomParticipants() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ============================================================================
// EXPLICIT JOIN/LEAVE LOGIC - DATABASE AS SOURCE OF TRUTH
// ============================================================================

export const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user._id;

  console.log("🚪 [BACKEND] joinRoom() START - roomId:", roomId, "userId:", userId);
  
  try {
    console.log("🚪 [BACKEND] joinRoom() Querying database for room");
    const room = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    if (!room) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }
    
    if (!room.isActive) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room is no longer active");
      return res.status(400).json({ message: "Room is no longer active" });
    }

    if (!room.isPublic) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room is private");
      return res.status(403).json({ message: "Room is private" });
    }

    // CRITICAL FIX: Remove duplicates from participants list first
    console.log("🚪 [BACKEND] joinRoom() Removing duplicates from participants list");
    const removedCount = room.removeDuplicateParticipants();
    if (removedCount > 0) {
      console.log("🚪 [BACKEND] joinRoom() Removed", removedCount, "duplicate participants");
      await room.save();
    }

    // Check if user is already a participant (after deduplication) - robust check
    const isAlreadyParticipant = room.participants.some(participant => {
      // Handle different participant formats (populated vs unpopulated)
      let participantId;
      if (typeof participant === 'string') {
        participantId = participant;
      } else if (participant && participant._id) {
        participantId = participant._id.toString();
      } else if (participant) {
        participantId = participant.toString();
      }
      
      const userIdStr = userId.toString();
      const isMatch = participantId === userIdStr;
      
      console.log("🔍 [BACKEND] Participant check:", {
        participant,
        participantId,
        userIdStr,
        isMatch
      });
      
      return isMatch;
    });
    
    console.log("🚪 [BACKEND] joinRoom() DEBUG - userId:", userId.toString(), "participants:", room.participants.map(p => p._id ? p._id.toString() : p.toString()));
    console.log("🚪 [BACKEND] joinRoom() isAlreadyParticipant:", isAlreadyParticipant, "current participants:", room.participants.length, "max:", room.maxParticipants);
    console.log("🚪 [BACKEND] joinRoom() room details:", {
      roomId: room._id,
      roomName: room.name,
      isPublic: room.isPublic,
      isActive: room.isActive,
      maxParticipants: room.maxParticipants,
      currentParticipants: room.participants.length,
      creator: room.creator?._id ? room.creator._id.toString() : room.creator?.toString()
    });
    
    if (isAlreadyParticipant) {
      console.log("🚪 [BACKEND] joinRoom() User already a participant, returning existing room");
      res.status(200).json(room);
      return;
    }

    // Check if room is full (after deduplication)
    if (room.participants.length >= room.maxParticipants) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room is full");
      return res.status(400).json({ message: "Room is full" });
    }

    // Add user to participants (only if not already present)
    console.log("🚪 [BACKEND] joinRoom() Adding user to participants");
    
    // Double-check that user is not already in the list (safety check) - robust
    const isStillNotParticipant = !room.participants.some(participant => {
      // Handle different participant formats (populated vs unpopulated)
      let participantId;
      if (typeof participant === 'string') {
        participantId = participant;
      } else if (participant && participant._id) {
        participantId = participant._id.toString();
      } else if (participant) {
        participantId = participant.toString();
      }
      
      const userIdStr = userId.toString();
      return participantId === userIdStr;
    });
    
    if (isStillNotParticipant) {
      console.log("🚪 [BACKEND] joinRoom() Adding user to participants list");
      room.participants.push(userId);
      await room.save();
      console.log("🚪 [BACKEND] joinRoom() User successfully added to participants");
    } else {
      console.log("🚪 [BACKEND] joinRoom() User already in participants list, skipping addition");
    }

    // Re-populate the room with updated participants
    console.log("🚪 [BACKEND] joinRoom() Re-populating room with updated participants");
    const updatedRoom = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    // Final safety check - remove any duplicates that might have been created
    const finalDuplicateCount = updatedRoom.removeDuplicateParticipants();
    if (finalDuplicateCount > 0) {
      console.log(`🚪 [BACKEND] joinRoom() Final cleanup - removed ${finalDuplicateCount} duplicates`);
      await updatedRoom.save();
      
      // Re-populate again after final cleanup
      const finalRoom = await Room.findById(roomId)
        .populate("creator", "fullName email profilePic")
        .populate("participants", "fullName email profilePic");
      
      console.log("🚪 [BACKEND] joinRoom() SUCCESS - User joined room, participants:", finalRoom.participants.length);
      res.status(200).json(finalRoom);
    } else {
      console.log("🚪 [BACKEND] joinRoom() SUCCESS - User joined room, participants:", updatedRoom.participants.length);
      res.status(200).json(updatedRoom);
    }
  } catch (error) {
    console.log("🚪 [BACKEND] joinRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveRoom = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;
  const user = req.user;

  console.log("🚪 [BACKEND] leaveRoom() START - roomId:", roomId, "userId:", userId);
  
  try {
    console.log("🚪 [BACKEND] leaveRoom() Querying database for room");
    const room = await Room.findById(roomId)
      .populate("creator", "username fullName email profilePic")
      .populate("participants", "username fullName email profilePic");

    if (!room) {
      console.log("🚪 [BACKEND] leaveRoom() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }
    
    // Check if user is a participant
    const isParticipant = room.participants.some(participant => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      return participantId === userId.toString();
    });

    console.log("🚪 [BACKEND] leaveRoom() isParticipant:", isParticipant, "current participants:", room.participants.length);

    if (!isParticipant) {
      console.log("🚪 [BACKEND] leaveRoom() ERROR - User is not a participant");
      return res.status(400).json({ message: "You are not a participant in this room" });
    }

    // Check if user is the creator
    const isCreator = room.creator._id.toString() === userId.toString() || 
                     room.creator.toString() === userId.toString();
    
    let newAdmin = null;

    // If creator is leaving and there are other participants, transfer admin to another participant
    if (isCreator && room.participants.length > 1) {
      try {
        // Find the first participant who is not the current user
        const newAdminUser = room.participants.find(participant => {
          const participantId = participant._id ? participant._id.toString() : participant.toString();
          return participantId !== userId.toString();
        });

        if (newAdminUser) {
          // Use the transferAdmin method to handle the transfer
          await room.transferAdmin(newAdminUser._id || newAdminUser);
          
          // Get the populated new admin user
          const populatedNewAdmin = await mongoose.model('User').findById(newAdminUser._id || newAdminUser)
            .select('username fullName email profilePic');
          
          if (populatedNewAdmin) {
            newAdmin = {
              _id: populatedNewAdmin._id,
              username: populatedNewAdmin.username || 'User',
              fullName: populatedNewAdmin.fullName,
              email: populatedNewAdmin.email,
              profilePic: populatedNewAdmin.profilePic
            };
            console.log("🚪 [BACKEND] Transferred admin to user:", newAdmin.username);
          }
        }
      } catch (error) {
        console.error("🚪 [BACKEND] Error transferring admin:", error.message);
        // Continue with leaving the room even if admin transfer fails
      }
    }

    // Remove user from participants
    console.log("🚪 [BACKEND] leaveRoom() Removing user from participants");
    room.participants = room.participants.filter(participant => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      return participantId !== userId.toString();
    });

    // If no participants left, delete the room
    if (room.participants.length === 0) {
      console.log("🚪 [BACKEND] No participants left, deleting room");
      await Room.findByIdAndDelete(roomId);
      return res.status(200).json({ room: null, newAdmin });
    }

    await room.save();

    // Re-populate the room with updated participants
    console.log("🚪 [BACKEND] leaveRoom() Re-populating room with updated participants");
    const updatedRoom = await Room.findById(room._id)
      .populate("creator", "username fullName email profilePic")
      .populate("participants", "username fullName email profilePic");

    console.log("🚪 [BACKEND] leaveRoom() SUCCESS - User left room, participants:", updatedRoom.participants.length);
    res.status(200).json({ room: updatedRoom, newAdmin });
  } catch (error) {
    console.log("🚪 [BACKEND] leaveRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ============================================================================
// CLEANUP ENDPOINTS FOR DISCONNECTED USERS
// ============================================================================

export const cleanupUserSockets = async (req, res) => {
  console.log("🧹 [BACKEND] cleanupUserSockets() START - userId:", req.body.userId);
  try {
    const { userId } = req.body;

    if (!userId) {
      console.log("🧹 [BACKEND] cleanupUserSockets() ERROR - No userId provided");
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find all rooms where user is a participant
    const rooms = await Room.find({ 
      participants: userId,
      isActive: true 
    });

    console.log("🧹 [BACKEND] cleanupUserSockets() Found", rooms.length, "rooms to clean up");

    // Remove user from all rooms, but preserve creator status
    for (const room of rooms) {
      const initialLength = room.participants.length;
      
      // CRITICAL: NEVER remove the room creator from participants
      // The creator maintains their host position even when disconnected
      const isCreator = room.creator.toString() === userId;
      
      if (isCreator) {
        console.log("🧹 [BACKEND] cleanupUserSockets() Skipping removal of room creator", userId, "from room", room._id, "- creator status preserved");
        // Don't remove creator from participants list
        // They remain the host even when disconnected
      } else {
        // Only remove non-creator participants
        room.participants = room.participants.filter(participant => 
          participant._id ? participant._id.toString() !== userId : participant.toString() !== userId
        );
        
        if (room.participants.length < initialLength) {
          await room.save();
          console.log("🧹 [BACKEND] cleanupUserSockets() Removed user from room:", room._id);
        }
      }
    }

    console.log("🧹 [BACKEND] cleanupUserSockets() SUCCESS - Cleaned up", rooms.length, "rooms");
    res.status(200).json({ message: "User sockets cleaned up successfully", roomsCleaned: rooms.length });
  } catch (error) {
    console.log("🧹 [BACKEND] cleanupUserSockets() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ============================================================================
// ROOM MANAGEMENT ENDPOINTS
// ============================================================================

export const updateRoom = async (req, res) => {
  console.log("🔄 [BACKEND] updateRoom() START - roomId:", req.params.roomId);
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only room creator can update
    if (room.creator.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only room creator can update the room" });
    }

    // Update room
    Object.assign(room, updateData);
    await room.save();

    const updatedRoom = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
     .populate("participants", "fullName email profilePic");

    console.log("🔄 [BACKEND] updateRoom() SUCCESS");
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.log("🔄 [BACKEND] updateRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteRoom = async (req, res) => {
  console.log("🗑️ [BACKEND] deleteRoom() START - roomId:", req.params.roomId);
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only room creator can delete
    if (room.creator.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only room creator can delete the room" });
    }

    // Mark room as inactive instead of deleting
    room.isActive = false;
    await room.save();

    console.log("🗑️ [BACKEND] deleteRoom() SUCCESS");
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.log("🗑️ [BACKEND] deleteRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ============================================================================
// LEGACY ENDPOINTS (KEEP FOR COMPATIBILITY)
// ============================================================================

export const leaveRoomOnUnload = async (req, res) => {
  console.log("🚪 [BACKEND] leaveRoomOnUnload() START - userId:", req.body.userId, "roomId:", req.body.roomId);
  try {
    const { userId, roomId } = req.body;

    if (!userId || !roomId) {
      console.log("🚪 [BACKEND] leaveRoomOnUnload() ERROR - Missing userId or roomId");
      return res.status(400).json({ message: "User ID and Room ID are required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      console.log("🚪 [BACKEND] leaveRoomOnUnload() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }

    // Remove user from participants
    const initialLength = room.participants.length;
    room.participants = room.participants.filter(participant => 
      participant._id ? participant._id.toString() !== userId : participant.toString() !== userId
    );

    if (room.participants.length < initialLength) {
      await room.save();
      console.log("🚪 [BACKEND] leaveRoomOnUnload() SUCCESS - Removed user from room");
    }

    res.status(200).json({ message: "User removed from room successfully" });
  } catch (error) {
    console.log("🚪 [BACKEND] leaveRoomOnUnload() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
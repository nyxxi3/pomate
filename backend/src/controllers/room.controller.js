import Room from "../models/room.model.js";
import User from "../models/user.model.js";

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

    // Create new room
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
    });

    await newRoom.save();
    console.log("🏗️ [BACKEND] createRoom() Room saved to database - roomId:", newRoom._id, "isActive:", newRoom.isActive, "participants:", newRoom.participants.length);

    // Populate the room with creator and participants data
    console.log("🏗️ [BACKEND] createRoom() Populating room data");
    const populatedRoom = await Room.findById(newRoom._id)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    console.log("🏗️ [BACKEND] createRoom() SUCCESS - Returning populated room:", populatedRoom._id, "isActive:", populatedRoom.isActive, "participants:", populatedRoom.participants.length);
    res.status(201).json(populatedRoom);
  } catch (error) {
    console.log("🏗️ [BACKEND] createRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isPublic: true, isActive: true })
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    console.log("Error in getRooms controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getRoomById = async (req, res) => {
  console.log("📋 [BACKEND] getRoomById() START - roomId:", req.params.roomId);
  try {
    const { roomId } = req.params;

    console.log("📋 [BACKEND] getRoomById() Querying database for room");
    const room = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    if (!room) {
      console.log("📋 [BACKEND] getRoomById() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }

    console.log("📋 [BACKEND] getRoomById() Room found - isActive:", room.isActive, "participants:", room.participants.length);
    if (!room.isActive) {
      console.log("📋 [BACKEND] getRoomById() ERROR - Room is no longer active");
      return res.status(400).json({ message: "Room is no longer active" });
    }

    console.log("📋 [BACKEND] getRoomById() SUCCESS - Returning room");
    res.status(200).json(room);
  } catch (error) {
    console.log("📋 [BACKEND] getRoomById() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const joinRoom = async (req, res) => {
  console.log("🚪 [BACKEND] joinRoom() START - roomId:", req.params.roomId, "userId:", req.user._id);
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    console.log("🚪 [BACKEND] joinRoom() Querying database for room");
    const room = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    if (!room) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room not found");
      return res.status(404).json({ message: "Room not found" });
    }

    console.log("🚪 [BACKEND] joinRoom() Room found - isActive:", room.isActive, "isPublic:", room.isPublic, "participants:", room.participants.length, "maxParticipants:", room.maxParticipants);
    
    if (!room.isActive) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room is no longer active");
      return res.status(400).json({ message: "Room is no longer active" });
    }

    if (!room.isPublic) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room is private");
      return res.status(403).json({ message: "Room is private" });
    }

    // Check if user is already a participant
    const isAlreadyParticipant = room.participants.some(participant => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      const userIdStr = userId.toString();
      console.log("🚪 [BACKEND] joinRoom() Comparing participant:", participantId, "with user:", userIdStr);
      return participantId === userIdStr;
    });
    
    console.log("🚪 [BACKEND] joinRoom() isAlreadyParticipant:", isAlreadyParticipant, "participants count:", room.participants.length);
    
    if (isAlreadyParticipant) {
      console.log("🚪 [BACKEND] joinRoom() User already a participant, returning existing room");
      res.status(200).json(room);
      return;
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      console.log("🚪 [BACKEND] joinRoom() ERROR - Room is full");
      return res.status(400).json({ message: "Room is full" });
    }

    // Add user to participants
    console.log("🚪 [BACKEND] joinRoom() Adding user to participants");
    room.participants.push(userId);
    await room.save();
    console.log("🚪 [BACKEND] joinRoom() Room saved - participants:", room.participants.length);

    // Populate the updated room
    console.log("🚪 [BACKEND] joinRoom() Populating updated room");
    const updatedRoom = await Room.findById(roomId)
      .populate("creator", "fullName email profilePic")
      .populate("participants", "fullName email profilePic");

    console.log("🚪 [BACKEND] joinRoom() SUCCESS - Returning updated room");
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.log("🚪 [BACKEND] joinRoom() ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Remove user from participants (handle both ObjectId and string formats)
    const initialLength = room.participants.length;
    console.log("🚪 [BACKEND] leaveRoom() Initial participants count:", initialLength);
    
    room.participants = room.participants.filter(participant => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      const userIdStr = userId.toString();
      console.log("🚪 [BACKEND] leaveRoom() Comparing participant:", participantId, "with user:", userIdStr);
      return participantId !== userIdStr;
    });

    console.log("🚪 [BACKEND] leaveRoom() After filtering participants count:", room.participants.length);

    // Check if user was actually a participant
    if (room.participants.length === initialLength) {
      console.log("🚪 [BACKEND] leaveRoom() ERROR - User was not a participant in this room");
      return res.status(400).json({ message: "You are not a participant in this room" });
    }

    // Don't deactivate room when users leave - let it remain active for rejoining
    // Rooms will only be deactivated when explicitly deleted or through other means
    console.log(`🏠 [BACKEND] leaveRoom() Keeping room ${roomId} active - participants: ${room.participants.length}`);

    // Save the updated room to database
    const updatedRoom = await room.save();
    
    console.log(`✅ User ${userId} successfully left room ${roomId}. Participants: ${updatedRoom.participants.length}`);

    res.status(200).json({ 
      message: "Left room successfully",
      room: updatedRoom
    });
  } catch (error) {
    console.log("Error in leaveRoom controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only creator can update room
    if (room.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only room creator can update room" });
    }

    // Update allowed fields
    const allowedUpdates = [
      "name", "description", "isPublic", "maxParticipants", 
      "workDuration", "breakDuration", "enableChat"
    ];

    const updates = {};
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      updates,
      { new: true, runValidators: true }
    ).populate("creator", "fullName email profilePic")
     .populate("participants", "fullName email profilePic");

    res.status(200).json(updatedRoom);
  } catch (error) {
    console.log("Error in updateRoom controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // In development, anyone can delete any room
    // TODO: Add creator check back for production
    // if (room.creator.toString() !== userId) {
    //   return res.status(403).json({ message: "Only room creator can delete room" });
    // }

    // Deactivate room instead of deleting
    room.isActive = false;
    await room.save();

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.log("Error in deleteRoom controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveRoomOnUnload = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({ message: "Room ID and User ID are required" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Remove user from participants (handle both ObjectId and string formats)
    const initialLength = room.participants.length;
    room.participants = room.participants.filter(participant => 
      participant._id ? participant._id.toString() !== userId.toString() : participant.toString() !== userId.toString()
    );

    // Only update if user was actually a participant
    if (room.participants.length < initialLength) {
      // Don't deactivate room when users leave - let it remain active for rejoining
      // Rooms will only be deactivated when explicitly deleted or through other means
      console.log(`🏠 [BACKEND] leaveRoomOnUnload() Keeping room ${roomId} active - participants: ${room.participants.length}`);

      await room.save();
      console.log(`✅ Unload: User ${userId} removed from room ${roomId} DB. Participants: ${room.participants.length}`);
    }

    res.status(200).json({ message: "Left room successfully" });
  } catch (error) {
    console.log("Error in leaveRoomOnUnload controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

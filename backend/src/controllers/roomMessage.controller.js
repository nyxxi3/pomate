import Room from "../models/room.model.js";
import User from "../models/user.model.js";
import RoomMessage from "../models/roomMessage.model.js";
import { getSocketServer } from "../lib/socket.js";

export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    // Check if user is a participant in the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isParticipant = room.participants.some(participant => 
      participant._id.toString() === userId || participant.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant in this room" });
    }

    // Check if chat is enabled for this room
    if (!room.enableChat) {
      return res.status(403).json({ message: "Chat is disabled for this room" });
    }

    // Get messages for the room
    const messages = await RoomMessage.find({ roomId })
      .populate('senderId', 'fullName username profilePic')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getRoomMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendRoomMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text } = req.body;
    const senderId = req.user._id;

    // Check if user is a participant in the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isParticipant = room.participants.some(participant => 
      participant._id.toString() === senderId || participant.toString() === senderId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant in this room" });
    }

    // Check if chat is enabled for this room
    if (!room.enableChat) {
      return res.status(403).json({ message: "Chat is disabled for this room" });
    }

    // Create new message
    const newMessage = new RoomMessage({
      roomId,
      senderId,
      text,
    });

    await newMessage.save();

    // Populate sender info for real-time broadcast
    await newMessage.populate('senderId', 'fullName username profilePic');

    // Broadcast message to all room participants
    const io = getSocketServer();
    if (io) {
      io.to(roomId).emit('newRoomMessage', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendRoomMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

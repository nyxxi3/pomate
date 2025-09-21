import express from "express";
import {
  createRoom,
  getRooms,
  getUserRooms,
  getRoomById,
  getRoomParticipants,
  joinRoom,
  leaveRoom,
  updateRoom,
  deleteRoom,
  reactivateRoom,
  leaveRoomOnUnload,
  cleanupUserSockets,
} from "../controllers/room.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Special endpoint for leaving room on page unload (no auth required)
router.post("/leave-on-unload", leaveRoomOnUnload);

// All other routes require authentication
router.use(protectRoute);

// Cleanup endpoint for user logout
router.post("/cleanup-user-sockets", cleanupUserSockets);

// Room CRUD operations
router.post("/create", createRoom);
router.get("/", getRooms);
router.get("/my-rooms", getUserRooms);
router.get("/:roomId", getRoomById);
router.get("/:roomId/participants", getRoomParticipants);
router.post("/:roomId/join", joinRoom);
router.post("/:roomId/leave", leaveRoom);
router.put("/:roomId", updateRoom);
router.post("/:roomId/reactivate", reactivateRoom);
router.delete("/:roomId", deleteRoom);

export default router;

import express from "express";
import {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
  deleteRoom,
  leaveRoomOnUnload,
} from "../controllers/room.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Special endpoint for leaving room on page unload (no auth required)
router.post("/leave-on-unload", leaveRoomOnUnload);

// All other routes require authentication
router.use(protectRoute);

// Room CRUD operations
router.post("/create", createRoom);
router.get("/", getRooms);
router.get("/:roomId", getRoomById);
router.post("/:roomId/join", joinRoom);
router.post("/:roomId/leave", leaveRoom);
router.put("/:roomId", updateRoom);
router.delete("/:roomId", deleteRoom);

export default router;

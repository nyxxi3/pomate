import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getRoomMessages, sendRoomMessage } from "../controllers/roomMessage.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get messages for a room
router.get("/:roomId", getRoomMessages);

// Send message to a room
router.post("/:roomId", sendRoomMessage);

export default router;









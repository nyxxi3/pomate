import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createSession, getStats } from "../controllers/session.controller.js";

const router = express.Router();

router.post("/", protectRoute, createSession);
router.get("/stats", protectRoute, getStats);

export default router;




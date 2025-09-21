import express from "express";
import {
  getUserPreferences,
  updateUserPreferences,
  updateDashboardLayout
} from "../controllers/userPreferences.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Get user preferences
router.get("/", getUserPreferences);

// Update user preferences
router.put("/", updateUserPreferences);

// Update dashboard layout specifically
router.put("/dashboard-layout", updateDashboardLayout);

export default router;


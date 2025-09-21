import express from "express";
import {
  createHabit,
  getHabits,
  updateHabit,
  deleteHabit,
  reorderHabits,
  completeHabit,
  uncompleteHabit,
  getHabitStats,
} from "../controllers/habit.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Habit CRUD operations
router.post("/", createHabit);
router.get("/", getHabits);
router.put("/:habitId", updateHabit);
router.delete("/:habitId", deleteHabit);
router.put("/reorder", reorderHabits);

// Habit completion
router.post("/:habitId/complete", completeHabit);
router.delete("/:habitId/complete", uncompleteHabit);

// Habit statistics
router.get("/:habitId/stats", getHabitStats);

export default router;

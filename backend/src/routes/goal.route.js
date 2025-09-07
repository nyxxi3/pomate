import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGoal, getGoals, updateGoal, deleteGoal, reorderGoals } from "../controllers/goal.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGoal);
router.get("/", protectRoute, getGoals);
router.put("/:goalId", protectRoute, updateGoal);
router.delete("/:goalId", protectRoute, deleteGoal);
router.post("/reorder", protectRoute, reorderGoals);

export default router;




import express from "express";
import { 
  getFavorites, 
  addFavorite, 
  deleteFavorite 
} from "../controllers/favorites.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get user's favorites
router.get("/:userId", getFavorites);

// Add a new favorite
router.post("/:userId/add", addFavorite);

// Delete a favorite
router.delete("/:userId/:favoriteId", deleteFavorite);

export default router;


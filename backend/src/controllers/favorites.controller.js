import User from "../models/user.model.js";

// Get user's favorites
export const getFavorites = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('favorites');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ data: user.favorites || [] });
  } catch (error) {
    console.error("Error getting favorites:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add a new favorite
export const addFavorite = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, url } = req.body;

    console.log("Add favorite request:", { userId, name, url });

    if (!name || !url) {
      return res.status(400).json({ error: "Name and URL are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user already has 10 favorites
    if (user.favorites && user.favorites.length >= 10) {
      return res.status(400).json({ error: "Maximum 10 favorites allowed" });
    }

    // Check if URL already exists
    if (user.favorites && user.favorites.some(fav => fav.url === url)) {
      return res.status(400).json({ error: "This URL is already in your favorites" });
    }

    const newFavorite = {
      name: name.trim(),
      url: url.trim(),
      createdAt: new Date()
    };

    if (!user.favorites) {
      user.favorites = [];
    }
    
    user.favorites.push(newFavorite);
    await user.save();

    // Get the newly added favorite with its generated _id
    const savedFavorite = user.favorites[user.favorites.length - 1];

    console.log("Saved favorite:", savedFavorite);

    res.status(201).json({ 
      data: savedFavorite,
      message: "Favorite added successfully" 
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a favorite
export const deleteFavorite = async (req, res) => {
  try {
    const { userId, favoriteId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.favorites) {
      return res.status(404).json({ error: "No favorites found" });
    }

    const favoriteIndex = user.favorites.findIndex(fav => fav._id.toString() === favoriteId);
    if (favoriteIndex === -1) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    user.favorites.splice(favoriteIndex, 1);
    await user.save();

    res.status(200).json({ message: "Favorite deleted successfully" });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

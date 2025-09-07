const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

// Get user's favorites
export const getFavorites = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/favorites/${userId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch favorites");
  }

  return response.json();
};

// Add a new favorite
export const addFavorite = async (userId, name, url) => {
  const response = await fetch(`${API_BASE_URL}/favorites/${userId}/add`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add favorite");
  }

  return response.json();
};

// Delete a favorite
export const deleteFavorite = async (userId, favoriteId) => {
  const response = await fetch(`${API_BASE_URL}/favorites/${userId}/${favoriteId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete favorite");
  }

  return response.json();
};



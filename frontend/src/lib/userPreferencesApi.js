import { axiosInstance } from "./axios.js";

// Get user preferences
export const getUserPreferences = async () => {
  const response = await axiosInstance.get("/user-preferences");
  return response.data;
};

// Update user preferences
export const updateUserPreferences = async (preferences) => {
  const response = await axiosInstance.put("/user-preferences", preferences);
  return response.data;
};

// Update dashboard layout specifically
export const updateDashboardLayout = async (layout) => {
  const response = await axiosInstance.put("/user-preferences/dashboard-layout", { layout });
  return response.data;
};


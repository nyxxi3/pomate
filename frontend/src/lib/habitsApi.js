import { axiosInstance } from "./axios.js";

// Habit CRUD operations
export const createHabit = async (habitData) => {
  const response = await axiosInstance.post("/habits", habitData);
  return response.data;
};

export const fetchHabits = async (params = {}) => {
  const response = await axiosInstance.get("/habits", { params });
  return response.data;
};

export const updateHabit = async (habitId, updates) => {
  const response = await axiosInstance.put(`/habits/${habitId}`, updates);
  return response.data;
};

export const deleteHabit = async (habitId) => {
  const response = await axiosInstance.delete(`/habits/${habitId}`);
  return response.data;
};

export const reorderHabits = async (habitIds) => {
  const response = await axiosInstance.put("/habits/reorder", { habitIds });
  return response.data;
};

// Habit completion
export const completeHabit = async (habitId, completionData = {}) => {
  const response = await axiosInstance.post(`/habits/${habitId}/complete`, completionData);
  return response.data;
};

export const uncompleteHabit = async (habitId, completionData = {}) => {
  const response = await axiosInstance.delete(`/habits/${habitId}/complete`, { data: completionData });
  return response.data;
};

// Habit statistics
export const getHabitStats = async (habitId, period = 'week') => {
  const response = await axiosInstance.get(`/habits/${habitId}/stats`, { 
    params: { period } 
  });
  return response.data;
};

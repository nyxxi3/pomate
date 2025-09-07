import { axiosInstance } from "./axios.js";

export const createGoal = async (payload) => {
  const res = await axiosInstance.post("/goals", payload);
  return res.data;
};

export const fetchGoals = async (date = null) => {
  const params = date ? { date } : {};
  const res = await axiosInstance.get("/goals", { params });
  return res.data;
};

export const updateGoal = async (goalId, payload) => {
  const res = await axiosInstance.put(`/goals/${goalId}`, payload);
  return res.data;
};

export const deleteGoal = async (goalId) => {
  const res = await axiosInstance.delete(`/goals/${goalId}`);
  return res.data;
};

export const reorderGoals = async (goalIds) => {
  const res = await axiosInstance.post("/goals/reorder", { goalIds });
  return res.data;
};




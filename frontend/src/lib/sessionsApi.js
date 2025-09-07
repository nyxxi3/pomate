import { axiosInstance } from "./axios.js";

export const createSession = async (payload) => {
  const res = await axiosInstance.post("/sessions", payload);
  return res.data;
};

export const fetchStats = async () => {
  const res = await axiosInstance.get("/sessions/stats");
  return res.data;
};




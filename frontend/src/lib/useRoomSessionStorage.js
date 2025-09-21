import { useCallback } from "react";
import { createSession } from "./sessionsApi.js";

const STORAGE_KEY = "roomSession";

export const useRoomSessionStorage = () => {
  const getStored = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const start = useCallback((sessionType, durationSeconds, goal = "", roomId = "") => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
    const data = {
      sessionType,
      duration: durationSeconds,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      goal,
      roomId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const markCompleted = useCallback(async () => {
    const data = getStored();
    if (!data) return false;

    try {
      const created = await createSession({
        sessionType: data.sessionType,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        status: "completed",
        goal: data.goal,
      });
      
      console.log("✅ [ROOM SESSION] Session marked as completed:", created);
      clear();
      return created;
    } catch (error) {
      console.error("❌ [ROOM SESSION] Failed to mark session as completed:", error);
      return false;
    }
  }, [getStored, clear]);

  const markAbandoned = useCallback(async () => {
    const data = getStored();
    if (!data) return false;

    try {
      const created = await createSession({
        sessionType: data.sessionType,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        status: "abandoned",
        goal: data.goal,
      });
      
      console.log("❌ [ROOM SESSION] Session marked as abandoned:", created);
      clear();
      return created;
    } catch (error) {
      console.error("❌ [ROOM SESSION] Failed to mark session as abandoned:", error);
      return false;
    }
  }, [getStored, clear]);

  return { getStored, start, clear, markCompleted, markAbandoned };
};

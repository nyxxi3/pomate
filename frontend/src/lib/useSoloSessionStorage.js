import { useCallback } from "react";
import { createSession } from "./sessionsApi.js";

const STORAGE_KEY = "soloSession";

export const useSoloSessionStorage = () => {
  const getStored = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const start = useCallback((sessionType, durationSeconds, goal = "") => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
    const data = {
      sessionType,
      duration: durationSeconds,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      goal,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const markCompleted = useCallback(async () => {
    const data = getStored();
    console.log("🎯 markCompleted called, session data:", data);
    if (!data) {
      console.warn("No session data found in localStorage");
      return null;
    }
    // Use current time as actual end time for accurate timestamp
    const actualEndTime = new Date().toISOString();
    const payload = {
      sessionType: data.sessionType,
      startTime: data.startTime,
      endTime: actualEndTime,
      duration: data.duration,
      status: "completed",
      goal: data.goal || "",
    };
    console.log("🎯 Using actual end time:", actualEndTime, "vs original:", data.endTime);
    console.log("💾 Sending session to database:", payload);
    try {
      const created = await createSession(payload);
      console.log("✅ Session successfully saved to database:", created);
      clear();
      // Clean up dialog tracking
      const sessionKey = `${data.sessionType}-${data.startTime}`;
      sessionStorage.removeItem(`dialog-shown-${sessionKey}`);
      return created;
    } catch (error) {
      console.error("Failed to save session to database:", error);
      throw error;
    }
  }, [getStored, clear]);

  const markAbandoned = useCallback(async () => {
    const data = getStored();
    if (!data) return null;
    const now = new Date();
    const start = new Date(data.startTime);
    const actualSeconds = Math.max(0, Math.round((now.getTime() - start.getTime()) / 1000));
    const payload = {
      sessionType: data.sessionType,
      startTime: data.startTime,
      endTime: now.toISOString(),
      duration: actualSeconds,
      status: "abandoned",
      goal: data.goal || "",
    };
    const created = await createSession(payload);
    clear();
    // Clean up dialog tracking
    const sessionKey = `${data.sessionType}-${data.startTime}`;
    sessionStorage.removeItem(`dialog-shown-${sessionKey}`);
    return created;
  }, [getStored, clear]);

  const resumeIfActive = useCallback(async () => {
    const data = getStored();
    if (!data) return { resumed: false };
    const now = new Date();
    const end = new Date(data.endTime);
    if (end.getTime() <= now.getTime()) {
      // Check if we've already shown the dialog for this session
      const sessionKey = `${data.sessionType}-${data.startTime}`;
      const hasShownDialog = sessionStorage.getItem(`dialog-shown-${sessionKey}`);
      
      if (!hasShownDialog) {
        const shouldComplete = window.confirm("A previous session ended while you were away. Mark it completed?");
        // Mark that we've shown the dialog for this session
        sessionStorage.setItem(`dialog-shown-${sessionKey}`, 'true');
        
        if (shouldComplete) {
          await markCompleted();
        } else {
          await markAbandoned();
        }
      } else {
        // Auto-complete if dialog was already shown
        await markCompleted();
      }
      return { resumed: false };
    }
    const remainingSeconds = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000));
    return { resumed: true, sessionType: data.sessionType, remainingSeconds, duration: data.duration, goal: data.goal };
  }, [getStored, markCompleted, markAbandoned]);

  return { getStored, start, clear, markCompleted, markAbandoned, resumeIfActive };
};




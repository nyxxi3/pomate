import Navbar from "./components/Navbar";
import GlobalTimer from "./components/GlobalTimer";
import MusicPlayer from "./components/MusicPlayer";

import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import SoloSessionPage from "./pages/SoloSessionPage";
import ProfilePage from "./pages/ProfilePage";
import RoomPage from "./pages/RoomPage";

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useRoomStore } from "./store/useRoomStore";
import { useEffect, useRef } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const { initializeCleanup, cleanupOnNavigation } = useRoomStore();
  const location = useLocation();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Ensure theme applies consistently across the document (fixes theme shifts on scroll)
  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // Initialize room cleanup listeners
  useEffect(() => {
    const cleanup = initializeCleanup();
    return cleanup;
  }, [initializeCleanup]);

  // Handle navigation cleanup - use a ref to track previous path
  const prevPathRef = useRef(location.pathname);
  
  useEffect(() => {
    // Only cleanup if we're actually navigating away from a room
    if (prevPathRef.current !== location.pathname) {
      const wasInRoom = prevPathRef.current.startsWith('/room/');
      if (wasInRoom) {
        // Call async cleanup function
        cleanupOnNavigation().catch(error => {
          console.error("Error during navigation cleanup:", error);
        });
      }
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname, cleanupOnNavigation]);

  console.log({ authUser });

  if (isCheckingAuth)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme} className="min-h-screen bg-base-100">
      <Navbar />
      <GlobalTimer />

      <main className="min-h-screen bg-base-100">
        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <LandingPage />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/" />} />
          <Route path="/solo" element={authUser ? <SoloSessionPage /> : <Navigate to="/" />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/room/:roomId" element={authUser ? <RoomPage /> : <Navigate to="/login" />} />
        </Routes>
      </main>

      {/* Global Music Player - mounted once and never unmounted */}
      {authUser && <MusicPlayer />}

      <Toaster />
    </div>
  );
};

export default App;

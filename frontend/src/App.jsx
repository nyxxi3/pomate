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
import { useRoomTimerStore } from "./store/useRoomTimerStore";
import { useZoomStore } from "./store/useZoomStore";
import { useEffect, useRef } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { currentRoom, initializeRoomStore } = useRoomStore();
  const { restoreTimerState } = useRoomTimerStore();
  const { toggleZoom } = useZoomStore();
  const location = useLocation();
  const audioRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F11 key to toggle zoom mode
      if (e.key === 'F11') {
        e.preventDefault();
        // Determine zoom type based on current route
        if (location.pathname === '/solo') {
          toggleZoom('solo');
        } else if (location.pathname.startsWith('/room/')) {
          toggleZoom('room');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, toggleZoom]);

  // Restore room state on app load (for page refresh)
  useEffect(() => {
    if (authUser && !currentRoom) {
      console.log("🏠 [APP] App loaded, trying to restore room state");
      const restoredRoom = initializeRoomStore();
      if (restoredRoom) {
        console.log("🏠 [APP] Successfully restored room on app load:", restoredRoom._id);
        // Also restore timer state when room is restored with a delay
        setTimeout(() => {
          console.log("⏰ [APP] Restoring timer state on app load (delayed)");
          restoreTimerState();
        }, 200);
      }
    }
  }, [authUser, currentRoom, initializeRoomStore, restoreTimerState]);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await useAuthStore.getState().checkAuth();
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };
    checkAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-base-content/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine if user is on an auth page
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="min-h-screen bg-base-100">
      {/* Navbar - only show if user is authenticated and not on auth pages */}
      {authUser && !isAuthPage && <Navbar />}
      
      {/* Global Timer - only show if user is authenticated and not on auth pages */}
      {authUser && !isAuthPage && <GlobalTimer />}
      
      {/* Music Player - only show if user is authenticated and not on auth pages */}
      {authUser && !isAuthPage && <MusicPlayer />}

      {/* Main Content */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={authUser ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={authUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={authUser ? <Navigate to="/dashboard" replace /> : <SignUpPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={authUser ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/solo" element={authUser ? <SoloSessionPage /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="/room/:roomId" element={authUser ? <RoomPage /> : <Navigate to="/login" replace />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to={authUser ? "/dashboard" : "/"} replace />} />
      </Routes>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--b1))',
            color: 'hsl(var(--bc))',
            border: '1px solid hsl(var(--b3))',
          },
        }}
      />
    </div>
  );
};

export default App;

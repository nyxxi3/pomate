import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useTimerStore } from "../store/useTimerStore";
import { useRoomStore } from "../store/useRoomStore";
import DashboardSidebar from "../components/DashboardSidebar";
import QuickStartCard from "../components/QuickStartCard";
import ActiveRooms from "../components/ActiveRooms";
import GoalsCard from "../components/GoalsCard";
import HabitTracker from "../components/HabitTracker";
import DraggableDashboard from "../components/DraggableDashboard";
import ProgressCard from "../components/ProgressCard";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import SoloTimer from "../components/solo/SoloTimer";
import { useNavigate } from "react-router-dom";
import { fetchStats } from "../lib/sessionsApi";
import notificationService from "../lib/notificationService.js";

const Dashboard = () => {
  const { authUser } = useAuthStore();
  const { selectedUser } = useChatStore();
  const { clearAllRoomState } = useRoomStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const navigate = useNavigate();
  
  // Use global timer store
  const { getActiveSession } = useTimerStore();
  const [activeSolo, setActiveSolo] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [stats, setStats] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear any room state when dashboard loads
  useEffect(() => {
    clearAllRoomState();
  }, [clearAllRoomState]);

  useEffect(() => {
    const readActive = () => {
      const activeSession = getActiveSession();
      
      if (!activeSession) {
        // Session completed - show notification and clear
        if (activeSolo) {
          const sessionType = activeSolo.sessionType === "focus" ? "Focus session" : "Break session";
          notificationService.showSessionCompletedNotification(sessionType);
        }
        setActiveSolo(null);
        setRemaining(0);
        return;
      }
      
      setActiveSolo(activeSession);
      setRemaining(activeSession.remainingSeconds);
    };

    let animationFrameId;
    
    const updateSession = () => {
      readActive();
      animationFrameId = requestAnimationFrame(updateSession);
    };
    
    // Start the animation loop
    animationFrameId = requestAnimationFrame(updateSession);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [getActiveSession, activeSolo]); // Include activeSolo to detect completion

  // Load stats on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const fetchedStats = await fetchStats();
        setStats(fetchedStats);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    loadStats();
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-base-100 pt-16">
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden min-h-0">
        {/* Sidebar */}
        <DashboardSidebar 
          expanded={true}
          onToggle={() => {}}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto min-h-0">
          {selectedUser ? (
            /* Chat Interface */
            <div className="flex-1">
              <ChatContainer />
            </div>
          ) : (
            /* Dashboard Content */
            <>
              {/* Header */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold font-fredoka text-primary">
                      Welcome back, {authUser?.fullName?.split(' ')[0] || 'Pomate'}!
                    </h1>
                    <p className="text-base-content/70 mt-2">
                      Ready to stay focused and achieve your goals today?
                    </p>
                  </div>
                  
                  {/* Reset Layout Button - Desktop Only */}
                  {isDesktop && (
                    <button
                      onClick={() => {
                        // Get the reset function from DraggableDashboard
                        const event = new CustomEvent('resetLayout');
                        window.dispatchEvent(event);
                      }}
                      className="btn btn-sm btn-outline gap-2 opacity-60 hover:opacity-100 transition-opacity"
                      title="Reset to default layout"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Layout
                    </button>
                  )}
                </div>
              </div>

              {/* Active Solo Session Banner */}
              {activeSolo && remaining > 0 && (
                <div className="w-full">
                  <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-300">
                    {/* Session Goal Display */}
                    {activeSolo.goal && activeSolo.sessionType === "focus" && (
                      <div className="text-center mb-3">
                        <h3 className="text-xl font-semibold text-primary font-fredoka">
                          {activeSolo.goal}
                        </h3>
                      </div>
                    )}
                    <SoloTimer
                      remainingSeconds={remaining}
                      totalSeconds={activeSolo.duration}
                      colorToken={activeSolo.sessionType === "focus" ? "primary" : "accent"}
                    />
                  </div>
                </div>
              )}

              {/* Draggable Dashboard Layout */}
              <DraggableDashboard
                QuickStartCard={QuickStartCard}
                ActiveRooms={ActiveRooms}
                HabitTracker={HabitTracker}
                ProgressCard={ProgressCard}
                GoalsCard={GoalsCard}
                activeSolo={activeSolo}
                remaining={remaining}
                isDesktop={isDesktop}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

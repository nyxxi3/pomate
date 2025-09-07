import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useTimerStore } from "../store/useTimerStore";
import DashboardSidebar from "../components/DashboardSidebar";
import QuickStartCard from "../components/QuickStartCard";
import ActiveRooms from "../components/ActiveRooms";
import GoalsCard from "../components/GoalsCard";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import SoloTimer from "../components/solo/SoloTimer";
import { useNavigate } from "react-router-dom";
import { fetchStats } from "../lib/sessionsApi";

const Dashboard = () => {
  const { authUser } = useAuthStore();
  const { selectedUser } = useChatStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const navigate = useNavigate();
  
  // Use global timer store
  const { getActiveSession } = useTimerStore();
  const [activeSolo, setActiveSolo] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const readActive = () => {
      const activeSession = getActiveSession();
      
      if (!activeSession) {
        // Session completed - show notification and clear
        if (activeSolo) {
          const sessionType = activeSolo.sessionType === "focus" ? "Focus session" : "Break session";
          new Notification(`${sessionType} completed!`, {
            body: "Time to take a break or start a new session.",
            icon: "/pixel tomato.png"
          });
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
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold font-fredoka text-primary">
                    Welcome back, {authUser?.fullName?.split(' ')[0] || 'Pomate'}!
                  </h1>
                  <p className="text-base-content/70 mt-2">
                    Ready to stay focused and achieve your goals today?
                  </p>
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

              {/* Content Cards - Stack vertically on mobile, side by side on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Quick Start Card */}
                  <QuickStartCard activeSolo={activeSolo} remaining={remaining} />

                  {/* Active Rooms */}
                  <ActiveRooms />
                </div>

                {/* Right Column - Progress and Goals */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Progress Section */}
                  <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-primary-content font-bold">⚡</span>
                      </div>
                      <h3 className="text-3xl font-semibold text-base-content font-fredoka">Your Progress</h3>
                    </div>
                    
                    {/* Today's Date and Time */}
                    <div className="mb-4 text-center">
                      <div className="text-lg font-semibold text-base-content">
                        {new Date().toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-base font-medium text-base-content/70 mt-1">
                        {new Date().toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                    </div>
                    
                    {/* Today's Progress - Primary Metrics */}
                    <div className="text-center mb-4">
                                              <div className="text-5xl font-bold text-primary font-fredoka">
                          {stats ? formatTime(stats.todayFocusSeconds) : "0m"}
                        </div>
                        <div className="text-sm text-base-content/60 mb-2">Focus Time Today</div>
                        
                        <div className="text-3xl font-bold text-primary font-fredoka">
                          {stats ? stats.todayCompletedCount : 0}
                        </div>
                        <div className="text-sm text-base-content/60">Completed Sessions</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-base-content/70">This Week</span>
                        <div className="text-right">
                          <div className="text-base-content font-medium">{stats ? formatTime(stats.weekFocusSeconds) : "0m"}</div>
                          <div className="text-xs text-base-content/60">{stats ? stats.weekCompletedCount : 0} sessions</div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-base-content/70">This Month</span>
                        <div className="text-right">
                          <div className="text-base-content font-medium">{stats ? formatTime(stats.monthFocusSeconds) : "0m"}</div>
                          <div className="text-xs text-base-content/60">{stats ? stats.monthCompletedCount : 0} sessions</div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-base-content/70">This Year</span>
                        <div className="text-right">
                          <div className="text-base-content font-medium">{stats ? formatTime(stats.yearFocusSeconds) : "0m"}</div>
                          <div className="text-xs text-base-content/60">{stats ? stats.yearCompletedCount : 0} sessions</div>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Goals Card */}
                  <GoalsCard />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

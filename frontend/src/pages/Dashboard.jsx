import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import DashboardSidebar from "../components/DashboardSidebar";
import QuickStartCard from "../components/QuickStartCard";
import ActiveRooms from "../components/ActiveRooms";
import GoalsCard from "../components/GoalsCard";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";

const Dashboard = () => {
  const { authUser } = useAuthStore();
  const { selectedUser } = useChatStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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

              {/* Content Cards - Stack vertically on mobile, side by side on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Quick Start Card */}
                  <QuickStartCard />

                  {/* Active Rooms */}
                  <ActiveRooms />
                </div>

                {/* Right Column - Goals */}
                <div className="lg:col-span-1">
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

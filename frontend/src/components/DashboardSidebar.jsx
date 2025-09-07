import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useMobileSidebarStore } from "../store/useMobileSidebarStore";
import { 
  MessageCircle, 
  Users, 
  TrendingUp, 
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft
} from "lucide-react";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const DashboardSidebar = ({ expanded, onToggle, disabled = false }) => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSidebarStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileSidebarOpen && !event.target.closest('.mobile-sidebar')) {
        setIsMobileSidebarOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  const navigationItems = [
    { icon: MessageCircle, label: "Direct Messages", count: 0 },
    { icon: Users, label: "Group DMs", count: 0 },
    { icon: TrendingUp, label: "Progress", count: 0 },
  ];

  return (
    <>


      {/* Removed static desktop sidebar; using only slide-out overlay */}

      {/* Slide-out Sidebar Overlay (animated) */}
      <>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => !disabled && setIsMobileSidebarOpen(false)}
        />
        
                  {/* Slide-out Sidebar */}
        <aside className={`fixed left-0 top-0 h-full w-80 bg-base-100 border-r border-base-300 z-50 transform transition-transform duration-300 mobile-sidebar ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Header */}
            <div className="border-b border-base-300 w-full p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Menu</h3>
                                  <button
                    onClick={() => !disabled && setIsMobileSidebarOpen(false)}
                    className={`btn btn-ghost btn-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={disabled}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="p-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.count > 0 && (
                    <span className="badge badge-primary badge-sm ml-auto">{item.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Direct Messages Section */}
            <div className="px-4">
              <h3 className="font-medium text-sm text-base-content/70 mb-3">Direct Messages</h3>
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`
                    w-full p-3 flex items-center gap-3 rounded-lg
                    hover:bg-base-300 transition-colors mb-2
                    ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-primary" : ""}
                  `}
                >
                  <div className="relative">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.name}
                      className="w-10 h-10 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full ring-2 ring-base-100" />
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-base-content/60 truncate">
                      {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center text-base-content/50 py-4">No online users</div>
              )}
            </div>
          </aside>
        </>
      
    </>
  );
};

export default DashboardSidebar;


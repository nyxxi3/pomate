import { Clock, Trash2, Users, UserPlus, UserCheck, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useRoomStore } from "../store/useRoomStore";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import CreateRoomDialog from "./CreateRoomDialog";

// ============================================================================
// CLEAN ACTIVE ROOMS COMPONENT - EXPLICIT JOIN/LEAVE WITH PROPER STATE
// ============================================================================

const ActiveRooms = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { 
    rooms, 
    userRooms,
    loadRooms, 
    loadUserRooms,
    reactivateRoom,
    joinRoom, 
    leaveRoom,
    deleteRoom,
    isRoomsLoading,
    isJoiningRoom,
    isLeavingRoom,
    canJoinRoom,
    isUserInRoom,
    getParticipantCount
  } = useRoomStore();

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("public"); // "public" or "my-rooms"
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const refreshIntervalRef = useRef(null);
  const lastRefreshTimeRef = useRef(Date.now());
  const backoffMultiplierRef = useRef(1);
  const userActivityTimeoutRef = useRef(null);

  // Initial load
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Load user rooms when switching to my-rooms tab
  useEffect(() => {
    if (activeTab === "my-rooms") {
      loadUserRooms();
    }
  }, [activeTab, loadUserRooms]);

  // Handle tab switching
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSelectedRooms(new Set()); // Clear selection when switching tabs
    if (tab === "my-rooms") {
      loadUserRooms();
    }
  };

  // Selection handlers
  const handleRoomSelect = (roomId) => {
    setSelectedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (activeTab === "my-rooms" && userRooms.length > 0) {
      if (selectedRooms.size === userRooms.length) {
        // Deselect all
        setSelectedRooms(new Set());
      } else {
        // Select all
        setSelectedRooms(new Set(userRooms.map(room => room._id)));
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedRooms.size} room(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setIsBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedRooms).map(roomId => deleteRoom(roomId));
      await Promise.all(deletePromises);
      
      // Clear selection and refresh
      setSelectedRooms(new Set());
      await loadUserRooms();
    } catch (error) {
      console.error("Error bulk deleting rooms:", error);
      toast.error("Failed to delete some rooms");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCreateRoom = () => {
    setShowCreateRoomDialog(true);
  };

  // User activity detection
  useEffect(() => {
    const handleUserActivity = () => {
      setIsUserActive(true);
      
      // Clear existing timeout
      if (userActivityTimeoutRef.current) {
        clearTimeout(userActivityTimeoutRef.current);
      }
      
      // Set user as inactive after 2 minutes of no activity
      userActivityTimeoutRef.current = setTimeout(() => {
        setIsUserActive(false);
        console.log("🔄 [ACTIVITY] User marked as inactive, reducing refresh frequency");
      }, 120000); // 2 minutes
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Initial activity
    handleUserActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      if (userActivityTimeoutRef.current) {
        clearTimeout(userActivityTimeoutRef.current);
      }
    };
  }, []);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);
      
      if (isVisible) {
        console.log("🔄 [VISIBILITY] Tab became visible, resuming normal refresh");
        // Reset backoff when user returns to tab
        backoffMultiplierRef.current = 1;
      } else {
        console.log("🔄 [VISIBILITY] Tab hidden, reducing refresh frequency");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Smart auto-refresh with exponential backoff and activity detection
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up auto-refresh with intelligent intervals
    const setupAutoRefresh = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      // Base intervals based on user activity and tab visibility
      let baseInterval = 30000; // 30 seconds base
      
      if (!isTabVisible) {
        // Tab is hidden - refresh much less frequently
        baseInterval = 300000; // 5 minutes
      } else if (!isUserActive) {
        // User is inactive - refresh less frequently
        baseInterval = 120000; // 2 minutes
      }
      
      // Apply exponential backoff multiplier
      const interval = baseInterval * backoffMultiplierRef.current;
      
      // Rate limiting: minimum 10 seconds between refreshes
      const minInterval = 10000;
      const finalInterval = Math.max(interval, minInterval);
      
      console.log(`🔄 [AUTO-REFRESH] Setting up refresh with ${finalInterval/1000}s interval (active: ${isUserActive}, visible: ${isTabVisible}, backoff: ${backoffMultiplierRef.current})`);
      
      refreshIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        
        // Only auto-refresh if it's been at least 10 seconds since last refresh
        if (timeSinceLastRefresh >= minInterval) {
          console.log("🔄 [AUTO-REFRESH] Auto-refreshing rooms list");
          handleRefresh(true); // true = silent refresh
          
          // Increase backoff multiplier for next refresh (up to 4x)
          backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 1.5, 4);
        }
      }, finalInterval);
    };

    setupAutoRefresh();

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, lastRefresh, isUserActive, isTabVisible]);

  // Update "time ago" display every second
  useEffect(() => {
    if (!lastRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(prev => prev); // Trigger re-render to update time display
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRefresh]);

  // Manual refresh handler
  const handleRefresh = async (silent = false) => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    // Rate limiting: prevent too frequent refreshes
    if (timeSinceLastRefresh < 5000) { // 5 seconds minimum
      if (!silent) {
        toast.error("Please wait a moment before refreshing again");
      }
      return;
    }

    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      await loadRooms();
      lastRefreshTimeRef.current = now;
      setLastRefresh(now);
      
      // Reset backoff multiplier on successful manual refresh
      if (!silent) {
        backoffMultiplierRef.current = 1;
        toast.success("Rooms list updated!");
      }
    } catch (error) {
      if (!silent) {
        toast.error("Failed to refresh rooms list");
      }
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  };

  // ============================================================================
  // ROOM ACTIONS
  // ============================================================================

  const handleJoinRoom = async (roomId) => {
    if (!authUser) {
      console.log("🚪 [FRONTEND] User not authenticated, cannot join room");
      return;
    }

    // Solo session conflict detection is now handled in the joinRoom store function

    try {
      console.log("🚪 [FRONTEND] ActiveRooms handleJoinRoom() START - roomId:", roomId);
      
      const joinSuccess = await joinRoom(roomId);
      
      if (joinSuccess) {
        console.log("🚪 [FRONTEND] Successfully joined room, navigating to room page");
        navigate(`/room/${roomId}`);
      } else {
        console.log("🚪 [FRONTEND] Failed to join room");
      }
    } catch (error) {
      console.error("🚪 [FRONTEND] Error joining room:", error);
    }
  };

  const handleReactivateRoom = async (roomId) => {
    try {
      console.log("🔄 [FRONTEND] Reactivating room:", roomId);
      
      const reactivatedRoom = await reactivateRoom(roomId);
      
      if (reactivatedRoom) {
        console.log("🔄 [FRONTEND] Room reactivated successfully");
        // Optionally navigate to the room or just refresh the list
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error("🔄 [FRONTEND] Error reactivating room:", error);
    }
  };

  const handleLeaveRoom = async (roomId, e) => {
    e.stopPropagation(); // Prevent triggering join
    
    if (!authUser) {
      console.log("🚪 [FRONTEND] User not authenticated, cannot leave room");
      return;
    }

    try {
      console.log("🚪 [FRONTEND] ActiveRooms handleLeaveRoom() START - roomId:", roomId);
      
      const leaveSuccess = await leaveRoom(roomId);
      
      if (leaveSuccess) {
        console.log("🚪 [FRONTEND] Successfully left room, refreshing rooms list");
        await loadRooms(); // Refresh the rooms list
      } else {
        console.log("🚪 [FRONTEND] Failed to leave room");
      }
    } catch (error) {
      console.error("🚪 [FRONTEND] Error leaving room:", error);
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation(); // Prevent triggering join
    
    if (!authUser) {
      console.log("🚪 [FRONTEND] User not authenticated, cannot delete room");
      return;
    }

    if (window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      try {
        console.log("🗑️ [FRONTEND] ActiveRooms handleDeleteRoom() START - roomId:", roomId);
        
        const success = await deleteRoom(roomId);
        if (success) {
          // If deletion was successful, refresh the rooms list
          await loadRooms();
        }
      } catch (error) {
        console.error("🗑️ [FRONTEND] Error in handleDeleteRoom:", error);
        // Error toast will be shown by the deleteRoom function in the store
      }
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getRoomStatus = (room) => {
    if (!authUser) return "login-required";
    
    const isParticipant = room.participants.some(participant => 
      participant._id === authUser._id || participant.toString() === authUser._id
    );
    
    if (isParticipant) return "participant";
    if (canJoinRoom(room)) return "can-join";
    return "full";
  };

  const getRoomButton = (room) => {
    const status = getRoomStatus(room);
    const participantCount = getParticipantCount(room);
    
    // Special handling for dormant rooms
    if (!room.isActive) {
      if (room.creator._id === authUser?._id) {
        return (
          <button 
            onClick={() => handleReactivateRoom(room._id)}
            className="btn btn-warning btn-sm w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reactivate Room</span>
            <span className="sm:hidden">Reactivate</span>
          </button>
        );
      } else {
        return (
          <button 
            disabled
            className="btn btn-disabled btn-sm w-full sm:w-auto"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Room Dormant</span>
            <span className="sm:hidden">Dormant</span>
          </button>
        );
      }
    }
    
    switch (status) {
      case "login-required":
        return (
          <button 
            onClick={() => navigate("/login")}
            className="btn btn-primary btn-sm w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Login to Join</span>
            <span className="sm:hidden">Login</span>
          </button>
        );
        
      case "participant":
        return (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={() => navigate(`/room/${room._id}`)}
              className="btn btn-success btn-sm flex-1 sm:flex-none"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Enter Room</span>
              <span className="sm:hidden">Enter</span>
            </button>
            <button 
              onClick={(e) => handleLeaveRoom(room._id, e)}
              disabled={isLeavingRoom}
              className="btn btn-error btn-sm flex-1 sm:flex-none"
            >
              {isLeavingRoom ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Leave"
              )}
            </button>
          </div>
        );
        
      case "can-join":
        return (
          <button 
            onClick={() => handleJoinRoom(room._id)}
            disabled={isJoiningRoom}
            className="btn btn-primary btn-sm w-full sm:w-auto"
          >
            {isJoiningRoom ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Join Room</span>
                <span className="sm:hidden">Join</span>
              </>
            )}
          </button>
        );
        
      case "full":
        return (
          <button 
            disabled
            className="btn btn-disabled btn-sm w-full sm:w-auto"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Room Full</span>
            <span className="sm:hidden">Full</span>
          </button>
        );
        
      default:
        return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isRoomsLoading) {
    return (
      <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-content" />
            </div>
            <h2 className="text-xl font-semibold">Active Rooms</h2>
          </div>
          
          {/* Refresh Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRefresh(false)}
              disabled={true}
              className="btn btn-ghost btn-sm"
              title="Refresh rooms list"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline ml-1">Loading...</span>
            </button>
          </div>
        </div>
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  // Show empty state only if both public rooms and user rooms are empty
  const currentRooms = activeTab === "public" ? rooms : userRooms;
  const showEmptyState = currentRooms.length === 0;

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary-content" />
          </div>
          <h2 className="text-xl font-semibold">Active Rooms</h2>
        </div>
        
        {/* Refresh Controls */}
        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          <button
            onClick={() => handleRefresh(false)}
            disabled={isRefreshing || isRoomsLoading}
            className="btn btn-ghost btn-sm"
            title="Refresh rooms list"
          >
            <RefreshCw 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
            />
            <span className="hidden sm:inline ml-1">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
        </div>
      </div>
      
      {/* Tab Interface */}
      <div className="tabs tabs-boxed mb-4">
        <button
          onClick={() => handleTabSwitch("public")}
          className={`tab tab-sm flex-1 ${
            activeTab === "public" ? "tab-active" : ""
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Public Rooms</span>
          </div>
        </button>
        <button
          onClick={() => handleTabSwitch("my-rooms")}
          className={`tab tab-sm flex-1 ${
            activeTab === "my-rooms" ? "tab-active" : ""
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <Users className="w-3 h-3" />
            <span className="hidden sm:inline">My Rooms</span>
          </div>
        </button>
      </div>
      
      {/* Bulk Selection UI for My Rooms */}
      {activeTab === "my-rooms" && userRooms.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-base-200 rounded-lg">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selectedRooms.size === userRooms.length && userRooms.length > 0}
                onChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedRooms.size === userRooms.length ? "Deselect All" : "Select All"}
              </span>
            </label>
            {selectedRooms.size > 0 && (
              <span className="text-sm text-base-content/70">
                {selectedRooms.size} of {userRooms.length} selected
              </span>
            )}
          </div>
          
          {selectedRooms.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRooms(new Set())}
                className="btn btn-ghost btn-sm"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="btn btn-error btn-sm"
              >
                {isBulkDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedRooms.size})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {showEmptyState ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-base-content/70 mb-2">
              {activeTab === "public" ? "No Active Rooms" : "No Rooms Created"}
            </h3>
            <p className="text-base-content/50 mb-4">
              {activeTab === "public" 
                ? "Be the first to create a room!" 
                : "Create your first room to get started!"
              }
            </p>
            <button 
              onClick={handleCreateRoom}
              className="btn btn-primary btn-sm"
            >
              Create Room
            </button>
          </div>
        ) : (
          currentRooms.map((room) => (
          <div 
            key={room._id}
            className={`p-4 rounded-lg border transition-colors ${
              activeTab === "my-rooms" && selectedRooms.has(room._id)
                ? "border-primary bg-primary/5" 
                : "border-base-300 hover:border-primary/50"
            } ${activeTab === "my-rooms" ? "cursor-pointer" : ""}`}
            onClick={activeTab === "my-rooms" ? () => handleRoomSelect(room._id) : undefined}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {activeTab === "my-rooms" && (
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedRooms.has(room._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRoomSelect(room._id);
                      }}
                    />
                  )}
                  <h3 className="font-semibold text-lg truncate">{room.name}</h3>
                  {room.creator._id === authUser?._id && activeTab === "public" && (
                    <span className="badge badge-primary badge-sm flex-shrink-0">Your Room</span>
                  )}
                  {!room.isActive && (
                    <span className="badge badge-warning badge-sm flex-shrink-0">Dormant</span>
                  )}
                </div>
                
                {room.description && (
                  <p className="text-base-content/70 text-sm mb-3 line-clamp-2">{room.description}</p>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-base-content/60">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>{getParticipantCount(room)}/{room.maxParticipants} participants</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{room.workDuration}min work / {room.breakDuration}min break</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span>Created by {room.creator.fullName}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-4">
                <div onClick={(e) => e.stopPropagation()}>
                  {getRoomButton(room)}
                </div>
                
                {room.creator._id === authUser?._id && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room._id, e);
                    }}
                    className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                    title={!room.isActive ? "Delete dormant room" : "Delete room"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
        )}
      </div>
      
      {/* Create Room Dialog */}
      <CreateRoomDialog 
        isOpen={showCreateRoomDialog}
        onClose={() => setShowCreateRoomDialog(false)}
      />
    </div>
  );
};

export default ActiveRooms;
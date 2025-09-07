import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Clock, MessageCircle, Settings, LogOut } from "lucide-react";
import { useRoomStore } from "../store/useRoomStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTimerStore } from "../store/useTimerStore";
import toast from "react-hot-toast";

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { 
    currentRoom, 
    participants, 
    joinRoom, 
    leaveRoom, 
    getRoomDetails, 
    subscribeToRoom, 
    unsubscribeFromRoom,
    setCurrentRoom,
    setParticipants,
    isJoiningRoom 
  } = useRoomStore();
  const { 
    isRunning, 
    timeLeft, 
    sessionType, 
    startTimer, 
    pauseTimer, 
    stopTimer,
    workMinutes,
    breakMinutes,
    setWorkMinutes,
    setBreakMinutes
  } = useTimerStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const hasJoinedRoom = useRef(false);

  useEffect(() => {
    console.log("🏠 [FRONTEND] RoomPage useEffect() START - roomId:", roomId);
    // Reset the joined room flag when roomId changes
    hasJoinedRoom.current = false;
    
    const loadRoom = async () => {
      try {
        console.log("🏠 [FRONTEND] RoomPage loadRoom() START");
        setIsLoading(true);
        
        // Check if we already have the current room in store (from room creation)
        if (currentRoom && currentRoom._id === roomId) {
          console.log("🏠 [FRONTEND] RoomPage loadRoom() Using existing room from store");
          // User is already a participant from room creation, just set the current room
          setCurrentRoom(currentRoom);
          setParticipants(currentRoom.participants);
          hasJoinedRoom.current = true;
          
          console.log("🏠 [FRONTEND] RoomPage loadRoom() Subscribing to room events");
          // Subscribe to room events
          subscribeToRoom(roomId);
          
          // Set timer settings from room
          setWorkMinutes(currentRoom.workDuration);
          setBreakMinutes(currentRoom.breakDuration);
          
          console.log("🏠 [FRONTEND] RoomPage loadRoom() SUCCESS - Using existing room");
          setIsLoading(false);
          return;
        }
        
        // If we don't have the room in store, fetch it from API
        const room = await getRoomDetails(roomId);
        
        // Check if user is already a participant (e.g., from room creation)
        const isAlreadyParticipant = room.participants.some(p => {
          const participantId = p._id ? p._id.toString() : p.toString();
          const userId = authUser._id.toString();
          console.log("🏠 [FRONTEND] RoomPage loadRoom() Comparing participant:", participantId, "with user:", userId);
          return participantId === userId;
        });
        console.log("🏠 [FRONTEND] RoomPage loadRoom() isAlreadyParticipant:", isAlreadyParticipant, "room.isActive:", room.isActive, "participants count:", room.participants.length);
        
        if (!isAlreadyParticipant) {
          console.log("🏠 [FRONTEND] RoomPage loadRoom() User not participant, calling joinRoom()");
          // Only join if user is not already a participant
          await joinRoom(roomId);
          // After joining, fetch fresh room details to ensure accurate state
          console.log("🏠 [FRONTEND] RoomPage loadRoom() Fetching fresh room details after join");
          const freshRoom = await getRoomDetails(roomId);
          setCurrentRoom(freshRoom);
          setParticipants(freshRoom.participants);
        } else {
          console.log("🏠 [FRONTEND] RoomPage loadRoom() User already participant, setting current room");
          // User is already a participant, just set the current room
          setCurrentRoom(room);
          setParticipants(room.participants);
        }
        
        hasJoinedRoom.current = true;
        
        console.log("🏠 [FRONTEND] RoomPage loadRoom() Subscribing to room events");
        // Subscribe to room events
        subscribeToRoom(roomId);
        
        // Set timer settings from room
        setWorkMinutes(room.workDuration);
        setBreakMinutes(room.breakDuration);
        
        console.log("🏠 [FRONTEND] RoomPage loadRoom() SUCCESS");
      } catch (error) {
        console.error("🏠 [FRONTEND] RoomPage loadRoom() ERROR:", error);
        toast.error("Failed to load room");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    if (roomId) {
      loadRoom();
    }

    // Cleanup function - only unsubscribe from socket events, don't leave room
    return () => {
      console.log("🏠 [FRONTEND] RoomPage cleanup() Unsubscribing from room events only");
      unsubscribeFromRoom();
    };
  }, [roomId, authUser._id]); // Add authUser._id to prevent multiple calls

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      navigate("/");
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerControl = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-base-content mb-4">Room not found</h2>
          <button 
            onClick={() => navigate("/")}
            className="btn btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="btn btn-ghost btn-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-base-content">
                {currentRoom.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-base-content/70">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {participants.length}/{currentRoom.maxParticipants}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {currentRoom.workDuration}m/{currentRoom.breakDuration}m
                </div>
                {currentRoom.enableChat && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    Chat enabled
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-ghost btn-sm"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLeaveRoom}
              className="btn btn-outline btn-sm"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Timer Section */}
          <div className="lg:col-span-2">
            <div className="bg-base-100 rounded-xl p-8 shadow-sm border border-base-300">
              <div className="text-center">
                {/* Timer Display */}
                <div className="mb-8">
                  <div className="text-6xl font-mono font-bold text-primary mb-2">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-lg text-base-content/70 capitalize">
                    {sessionType} Session
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={handleTimerControl}
                    className={`btn btn-lg ${isRunning ? 'btn-warning' : 'btn-primary'}`}
                  >
                    {isRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={stopTimer}
                    className="btn btn-outline btn-lg"
                  >
                    Stop
                  </button>
                </div>

                {/* Session Info */}
                <div className="text-sm text-base-content/60">
                  Work: {workMinutes}min • Break: {breakMinutes}min
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({participants.length})
              </h3>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant._id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-base-200"
                  >
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-semibold">
                        {participant.fullName?.charAt(0) || 'U'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-base-content">
                        {participant.fullName}
                        {participant._id === authUser._id && (
                          <span className="text-xs text-primary ml-2">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-base-content/60">
                        {participant.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Section */}
            {currentRoom.enableChat && (
              <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
                <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat
                </h3>
                <div className="text-center py-8 text-base-content/60">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-base-content/30" />
                  <p>Chat functionality coming soon!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
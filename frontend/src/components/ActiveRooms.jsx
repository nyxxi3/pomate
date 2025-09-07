import { Clock, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useRoomStore } from "../store/useRoomStore";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const ActiveRooms = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { rooms, getRooms, joinRoom, deleteRoom, isRoomsLoading } = useRoomStore();

  useEffect(() => {
    getRooms();
  }, [getRooms]);

  const handleJoinRoom = async (roomId) => {
    try {
      console.log("🚪 [FRONTEND] ActiveRooms handleJoinRoom() START - roomId:", roomId);
      // Always join the room (backend handles duplicates)
      await joinRoom(roomId);
      // After joining, fetch fresh rooms list to ensure accurate participant counts
      console.log("🚪 [FRONTEND] ActiveRooms handleJoinRoom() Fetching fresh rooms list after join");
      await getRooms();
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation(); // Prevent triggering join
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        console.log("🗑️ [FRONTEND] ActiveRooms handleDeleteRoom() START - roomId:", roomId);
        await deleteRoom(roomId);
        // After deleting, fetch fresh rooms list to ensure accurate state
        console.log("🗑️ [FRONTEND] ActiveRooms handleDeleteRoom() Fetching fresh rooms list after delete");
        await getRooms();
      } catch (error) {
        console.error("Failed to delete room:", error);
      }
    }
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary-content" />
        </div>
        <h2 className="text-3xl font-semibold text-base-content font-fredoka">Active Rooms</h2>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <p className="text-base-content/70">Join ongoing Pomodoro sessions</p>
        <button
          onClick={() => {
            if (window.confirm("Delete ALL rooms? (Dev only)")) {
              rooms.forEach(room => {
                deleteRoom(room._id);
              });
            }
          }}
          className="btn btn-error btn-xs"
        >
          Delete All Rooms
        </button>
      </div>

      <div className="space-y-3">
        {isRoomsLoading ? (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-md"></div>
            <p className="text-base-content/60 mt-2">Loading rooms...</p>
          </div>
        ) : (
          <>
            {rooms.map((room) => (
              <div
                key={room._id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-base-300 hover:bg-base-200 transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  
                  {/* Room info */}
                  <div className="flex-1">
                    <span className="font-medium">{room.name}</span>
                    <div className="text-sm text-base-content/60">
                      {room.participants?.length || 0}/{room.maxParticipants} participants
                      <span className="ml-2">• {room.workDuration}m/{room.breakDuration}m</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinRoom(room._id)}
                    className="btn btn-primary btn-sm"
                    disabled={room.participants?.length >= room.maxParticipants}
                  >
                    {room.participants?.length >= room.maxParticipants ? 'Full' : 'Join'}
                  </button>
                  
                  {/* Delete button - anyone can delete in dev */}
                  <button
                    onClick={(e) => handleDeleteRoom(room._id, e)}
                    className="btn btn-error btn-sm"
                    title="Delete room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="text-center py-8 text-base-content/50">
                No active rooms available
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActiveRooms;
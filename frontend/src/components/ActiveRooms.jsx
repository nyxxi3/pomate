import { Clock } from "lucide-react";

const ActiveRooms = () => {
  // Mock data for active rooms - replace with real data later
  const activeRooms = [
    {
      id: 1,
      name: "Deep Work Session",
      participants: 5,
    },
    {
      id: 2,
      name: "Math Study Room",
      participants: 3,
    },
    {
      id: 3,
      name: "Design Sprint",
      participants: 2,
    },
  ];

  const handleJoinRoom = (roomId) => {
    // TODO: Implement join room functionality
    console.log("Joining room:", roomId);
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary-content" />
        </div>
        <h2 className="text-xl font-semibold">Active Rooms</h2>
      </div>
      
      <p className="text-base-content/70 mb-4">Join ongoing Pomodoro sessions</p>

      <div className="space-y-3">
        {activeRooms.map((room) => (
          <div
            key={room.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-base-300 hover:bg-base-200 transition-colors gap-3"
          >
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="w-2 h-2 bg-success rounded-full"></div>
              
              {/* Room info */}
              <div className="flex-1">
                <span className="font-medium">{room.name}</span>
                <div className="text-sm text-base-content/60">
                  {room.participants} participants
                </div>
              </div>
            </div>

            <button
              onClick={() => handleJoinRoom(room.id)}
              className="btn btn-primary btn-sm w-full sm:w-auto"
            >
              Join
            </button>
          </div>
        ))}

        {activeRooms.length === 0 && (
          <div className="text-center py-8 text-base-content/50">
            No active rooms available
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveRooms;


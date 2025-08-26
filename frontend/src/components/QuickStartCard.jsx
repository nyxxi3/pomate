import { Plus, Users } from "lucide-react";

const QuickStartCard = () => {
  const handleCreateRoom = () => {
    // TODO: Implement create room functionality
    console.log("Create room clicked");
  };

  const handleJoinRoom = () => {
    // TODO: Implement join room functionality
    console.log("Join room clicked");
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-content font-bold">▷</span>
        </div>
        <h2 className="text-xl font-semibold">Quick Start</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          className="group p-6 rounded-xl border-2 border-primary bg-primary hover:bg-primary-focus transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <Plus className="w-6 h-6 text-primary-content" />
            <span className="text-lg font-semibold text-primary-content">Create Room</span>
          </div>
          <p className="text-primary-content/80 text-sm">
            Start a new Pomodoro session
          </p>
        </button>

        {/* Join Room Button */}
        <button
          onClick={handleJoinRoom}
          className="group p-6 rounded-xl border-2 border-base-300 bg-base-100 hover:bg-base-200 hover:border-primary transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-base-content" />
            <span className="text-lg font-semibold text-base-content">Join Room</span>
          </div>
          <p className="text-base-content/70 text-sm">
            Find an active session
          </p>
        </button>
      </div>
    </div>
  );
};

export default QuickStartCard;


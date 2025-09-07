import { Plus, Users, CornerDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import CreateRoomDialog from "./CreateRoomDialog";

const QuickStartCard = ({ activeSolo, remaining }) => {
  const navigate = useNavigate();
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  
  const handleCreateSoloSession = () => {
    navigate("/solo");
  };

  const handleCreateRoom = () => {
    setShowCreateRoomDialog(true);
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-content font-bold">▷</span>
        </div>
        <h2 className="text-3xl font-semibold text-base-content font-fredoka">Quick Start</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create/Return Solo Session Button */}
        {activeSolo && remaining > 0 ? (
          <button
            onClick={handleCreateSoloSession}
            className="group p-6 rounded-xl border-2 border-primary bg-primary hover:bg-primary-focus transition-all duration-200 text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-2">
              <CornerDownLeft className="w-6 h-6 text-primary-content" />
              <span className="text-lg font-semibold text-primary-content">Return to Solo Session</span>
            </div>
            <p className="text-primary-content/80 text-sm">
              {activeSolo.sessionType === "focus" ? "Focus" : "Break"} • {Math.floor(remaining/60)}m {remaining%60}s left
            </p>
            {activeSolo.goal && activeSolo.sessionType === "focus" && (
              <p className="text-primary-content/60 text-xs mt-1">
                {activeSolo.goal}
              </p>
            )}
          </button>
        ) : (
          <button
            onClick={handleCreateSoloSession}
            className="group p-6 rounded-xl border-2 border-primary bg-primary hover:bg-primary-focus transition-all duration-200 text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-2">
              <Plus className="w-6 h-6 text-primary-content" />
              <span className="text-lg font-semibold text-primary-content">Create Solo Session</span>
            </div>
            <p className="text-primary-content/80 text-sm">
              Start a personal Pomodoro session
            </p>
          </button>
        )}

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          className="group p-6 rounded-xl border-2 border-base-300 bg-base-100 hover:bg-base-200 hover:border-primary transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-base-content" />
            <span className="text-lg font-semibold text-base-content">Create Room</span>
          </div>
          <p className="text-base-content/70 text-sm">
            Start a new group session
          </p>
        </button>
      </div>

      {/* Create Room Dialog */}
      <CreateRoomDialog 
        isOpen={showCreateRoomDialog}
        onClose={() => setShowCreateRoomDialog(false)}
      />
    </div>
  );
};

export default QuickStartCard;


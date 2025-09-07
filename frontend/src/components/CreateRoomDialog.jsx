import { useState } from "react";
import { X, Users, Clock, MessageCircle, HelpCircle, Plus, Minus } from "lucide-react";
import { useRoomStore } from "../store/useRoomStore";
import { useNavigate } from "react-router-dom";

const CreateRoomDialog = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { roomForm, setRoomForm, createRoom, isCreatingRoom, resetRoomForm } = useRoomStore();
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setRoomForm({ [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!roomForm.name.trim()) {
      newErrors.name = "Room name is required";
    } else if (roomForm.name.trim().length < 3) {
      newErrors.name = "Room name must be at least 3 characters";
    }
    
    if (roomForm.maxParticipants < 2 || roomForm.maxParticipants > 15) {
      newErrors.maxParticipants = "Max participants must be between 2 and 15";
    }
    
    if (roomForm.workDuration < 5 || roomForm.workDuration > 60) {
      newErrors.workDuration = "Work duration must be between 5 and 60 minutes";
    }
    
    if (roomForm.breakDuration < 1 || roomForm.breakDuration > 30) {
      newErrors.breakDuration = "Break duration must be between 1 and 30 minutes";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log("🏗️ [FRONTEND] CreateRoomDialog handleSubmit() START");
      const room = await createRoom(roomForm);
      console.log("🏗️ [FRONTEND] CreateRoomDialog handleSubmit() Room created, navigating to:", `/room/${room._id}`);
      resetRoomForm();
      onClose();
      
      // Small delay to ensure room is fully created and stored before navigation
      setTimeout(() => {
        navigate(`/room/${room._id}`);
      }, 100);
    } catch (error) {
      console.error("🏗️ [FRONTEND] CreateRoomDialog handleSubmit() ERROR:", error);
    }
  };

  const handleCancel = () => {
    resetRoomForm();
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-xl font-semibold text-base-content">Create New Room</h2>
          <button
            onClick={handleCancel}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Room Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Room Name
            </label>
            <input
              type="text"
              value={roomForm.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter room name..."
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && (
              <p className="text-error text-xs">{errors.name}</p>
            )}
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Room Type
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={roomForm.isPublic}
                  onChange={(e) => handleInputChange("isPublic", e.target.checked)}
                />
                <span className="text-sm text-base-content">Public</span>
              </div>
              <div className="tooltip tooltip-right" data-tip="Public rooms can be discovered and joined by anyone">
                <HelpCircle className="w-4 h-4 text-base-content/60" />
              </div>
            </div>
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content flex items-center gap-2">
              <Users className="w-4 h-4" />
              Max Participants
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleInputChange("maxParticipants", Math.max(2, roomForm.maxParticipants - 1))}
                disabled={roomForm.maxParticipants <= 2}
                className="btn btn-outline btn-sm btn-circle"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-lg font-semibold">{roomForm.maxParticipants}</span>
                <span className="text-sm text-base-content/60 ml-1">participants</span>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange("maxParticipants", Math.min(15, roomForm.maxParticipants + 1))}
                disabled={roomForm.maxParticipants >= 15}
                className="btn btn-outline btn-sm btn-circle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {errors.maxParticipants && (
              <p className="text-error text-xs">{errors.maxParticipants}</p>
            )}
          </div>

          {/* Pomodoro Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              <h3 className="text-sm font-medium text-base-content">Pomodoro Settings</h3>
            </div>
            
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content">
                  Work Duration (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={roomForm.workDuration}
                  onChange={(e) => handleInputChange("workDuration", parseInt(e.target.value))}
                  className={`input input-bordered w-full ${errors.workDuration ? 'input-error' : ''}`}
                />
                {errors.workDuration && (
                  <p className="text-error text-xs">{errors.workDuration}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content">
                  Break Duration (min)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={roomForm.breakDuration}
                  onChange={(e) => handleInputChange("breakDuration", parseInt(e.target.value))}
                  className={`input input-bordered w-full ${errors.breakDuration ? 'input-error' : ''}`}
                />
                {errors.breakDuration && (
                  <p className="text-error text-xs">{errors.breakDuration}</p>
                )}
              </div>
            </div>
          </div>

          {/* Enable Chat */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Enable Chat
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content">Allow participants to chat</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={roomForm.enableChat}
                onChange={(e) => handleInputChange("enableChat", e.target.checked)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingRoom}
              className="btn btn-primary flex-1"
            >
              {isCreatingRoom ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                "Create Room"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomDialog;

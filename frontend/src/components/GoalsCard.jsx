import { useState, useEffect } from "react";
import { Target, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { createGoal, fetchGoals, updateGoal, deleteGoal, reorderGoals } from "../lib/goalsApi";
import { useNavigate } from "react-router-dom";
import { useTimerStore } from "../store/useTimerStore";
import { useRoomStore } from "../store/useRoomStore";
import { useRoomTimerStore } from "../store/useRoomTimerStore";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableGoal = ({ goal, onToggle, onDelete, onEdit, onFocus, isActiveGoal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(goal.text);
  const [editDescription, setEditDescription] = useState(goal.description);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(goal.text);
    setEditDescription(goal.description);
  };

  const handleSaveEdit = async () => {
    if (editText.trim()) {
      await onEdit(goal._id, {
        text: editText.trim(),
        description: editDescription.trim()
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(goal.text);
    setEditDescription(goal.description);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 group p-3 rounded-lg bg-base-50 border border-base-200 hover:bg-base-100 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      }`}
      {...attributes}
    >
      {/* Drag Handle - Mobile Optimized */}
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing mt-1 opacity-70 sm:opacity-30 sm:group-hover:opacity-70 transition-opacity touch-manipulation"
        title="Drag to reorder"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="5" r="1"/>
          <circle cx="15" cy="5" r="1"/>
          <circle cx="9" cy="12" r="1"/>
          <circle cx="15" cy="12" r="1"/>
          <circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={goal.completed}
        onChange={() => onToggle(goal._id)}
        className="checkbox checkbox-sm mt-1"
      />

      {/* Goal Content - Mobile Optimized */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="input input-bordered input-sm w-full"
              placeholder="Goal text..."
              maxLength={100}
              autoFocus
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              className="input input-bordered input-sm w-full"
              placeholder="Description (optional)..."
              maxLength={200}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="btn btn-xs btn-primary"
                title="Save changes"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn btn-xs btn-outline"
                title="Cancel editing"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Goal Text - Mobile Optimized */}
            <div className={`font-medium ${goal.completed ? 'line-through text-base-content/50' : ''} ${
              isActiveGoal ? 'text-primary font-semibold' : ''
            }`}>
              {goal.text}
            </div>
            
            {/* Active Focus Badge - Mobile Optimized */}
            {isActiveGoal && (
              <div className="mt-1">
                <span className="inline-block text-xs bg-primary text-primary-content px-2 py-1 rounded-full">
                  🎯 Active Focus
                </span>
              </div>
            )}
            
            {/* Description - Mobile Optimized */}
            {goal.description && (
              <div className="text-sm text-base-content/60 mt-1">
                {goal.description}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons - Mobile Optimized */}
      {!isEditing && (
        <div className="flex flex-row gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          {/* Focus Button - Only show for incomplete goals */}
          {!goal.completed && (
            <button
              onClick={() => onFocus(goal)}
              className={`p-2 rounded touch-manipulation transition-all ${
                isActiveGoal 
                  ? 'bg-primary text-primary-content hover:bg-primary-focus' 
                  : 'hover:bg-base-200 text-primary'
              }`}
              title={isActiveGoal ? "Currently focused goal" : "Focus on this goal"}
            >
              <Target className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleEdit}
            className="p-2 hover:bg-base-200 rounded touch-manipulation"
            title="Edit goal"
          >
            <Edit2 className="w-4 h-4 text-info" />
          </button>
          <button
            onClick={() => onDelete(goal._id)}
            className="p-2 hover:bg-base-200 rounded touch-manipulation"
            title="Delete goal"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </button>
        </div>
      )}
    </div>
  );
};

const GoalsCard = ({ colorToken = "primary" }) => {
  const [goals, setGoals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ text: "", description: "" });
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { sessionGoal, setSessionGoal } = useTimerStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load goals from database on component mount
  useEffect(() => {
    const loadGoals = async () => {
      try {
        setIsLoading(true);
        const fetchedGoals = await fetchGoals();
        setGoals(fetchedGoals);
      } catch (error) {
        console.error('Failed to load goals:', error);
        toast.error('Failed to load goals');
        setGoals([]); // Set empty array if API fails
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, []);

  const handleToggleGoal = async (goalId) => {
    try {
      const goal = goals.find(g => g._id === goalId);
      if (!goal) return;

      const updatedGoal = await updateGoal(goalId, { completed: !goal.completed });
      setGoals(goals.map(goal => 
        goal._id === goalId 
          ? { ...goal, completed: updatedGoal.completed }
          : goal
      ));
    } catch (error) {
      console.error('Failed to update goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const handleEditGoal = async (goalId, updates) => {
    try {
      const updatedGoal = await updateGoal(goalId, updates);
      setGoals(goals.map(goal => 
        goal._id === goalId 
          ? { ...goal, ...updatedGoal }
          : goal
      ));
      toast.success('Goal updated successfully');
    } catch (error) {
      console.error('Failed to update goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await deleteGoal(goalId);
      setGoals(goals.filter(goal => goal._id !== goalId));
      toast.success('Goal deleted successfully');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = goals.findIndex(goal => goal._id === active.id);
      const newIndex = goals.findIndex(goal => goal._id === over.id);
      
      const newGoals = arrayMove(goals, oldIndex, newIndex);
      setGoals(newGoals);

      try {
        // Send new order to backend
        const goalIds = newGoals.map(goal => goal._id);
        await reorderGoals(goalIds);
      } catch (error) {
        console.error('Failed to reorder goals:', error);
        toast.error('Failed to save new order');
        // Revert on error
        setGoals(goals);
      }
    }
  };

  const handleAddGoal = () => {
    setShowAddForm(true);
  };

  const handleSubmitGoal = async (e) => {
    e.preventDefault();
    if (newGoal.text.trim()) {
      try {
        const payload = {
          text: newGoal.text.trim(),
        };

        const createdGoal = await createGoal(payload);
        setGoals([createdGoal, ...goals]);
        setNewGoal({ text: "", description: "" });
        setShowAddForm(false);
        toast.success('Goal added successfully');
      } catch (error) {
        console.error('Failed to create goal:', error);
        toast.error('Failed to create goal');
      }
    }
  };

  const handleCancelAdd = () => {
    setNewGoal({ text: "", description: "" });
    setShowAddForm(false);
  };

  const handleFocusGoal = async (goal) => {
    // Check if user is in a room
    const { currentRoom, leaveRoom } = useRoomStore.getState();
    
    if (currentRoom) {
      // In a room - set user-specific focus goal for the room timer
      const { setUserFocusGoal } = useRoomTimerStore.getState();
      setUserFocusGoal(goal.text);
    } else {
      // Not in a room - start solo session
      // Set the session goal in the timer store
      setSessionGoal(goal.text);
      
      // Navigate to solo page
      navigate('/solo');
    }
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 bg-${colorToken} rounded-lg flex items-center justify-center`}>
          <Target className="w-5 h-5 text-primary-content" />
        </div>
        <h2 className="text-3xl font-semibold text-base-content font-fredoka">Goals</h2>
      </div>
      
      <p className="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
        🎯 Click focus button on incomplete goals to start sessions
      </p>

      <div className="space-y-2 sm:space-y-3 mb-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="loading loading-spinner loading-md"></div>
            <p className="text-sm text-base-content/60 mt-2">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-base-content/60">No goals set yet</p>
            <p className="text-sm text-base-content/40">Add your first goal to get started!</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={goals.map(goal => goal._id)} strategy={verticalListSortingStrategy}>
              {goals.map((goal) => (
                <SortableGoal
                  key={goal._id}
                  goal={goal}
                  onToggle={handleToggleGoal}
                  onDelete={handleDeleteGoal}
                  onEdit={handleEditGoal}
                  onFocus={handleFocusGoal}
                  isActiveGoal={sessionGoal === goal.text}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showAddForm ? (
        <form onSubmit={handleSubmitGoal} className="space-y-3">
          <div>
            <label className="label">
              <span className="label-text text-sm">Goal</span>
            </label>
            <input
              type="text"
              value={newGoal.text}
              onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
              placeholder="Enter your goal..."
              className="input input-bordered input-sm w-full"
              maxLength={100}
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className={`btn btn-sm btn-${colorToken} flex-1`}
            >
              Add Goal
            </button>
            <button
              type="button"
              onClick={handleCancelAdd}
              className="btn btn-sm btn-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={handleAddGoal}
          className={`btn btn-outline btn-${colorToken} w-full gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      )}
    </div>
  );
};

export default GoalsCard;
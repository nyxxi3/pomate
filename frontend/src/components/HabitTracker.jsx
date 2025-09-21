import { useState, useEffect } from "react";
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  TrendingUp,
  Flame,
  Clock,
  BarChart3,
  CalendarDays,
  List
} from "lucide-react";
import EmojiPickerComponent from "./EmojiPickerMart";
import { 
  createHabit, 
  fetchHabits, 
  updateHabit, 
  deleteHabit, 
  reorderHabits,
  completeHabit,
  uncompleteHabit,
  getHabitStats 
} from "../lib/habitsApi";
import { useTimerStore } from "../store/useTimerStore";
import { useNavigate } from "react-router-dom";
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

// Habit Dialog Component
const HabitDialog = ({ isOpen, onClose, onSave, habit = null, title = "Add Habit" }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "other",
    frequency: "daily",
    customFrequency: { type: "days", interval: 1 },
    color: "#3b82f6",
    emoji: "🎯"
  });

  const categories = [
    { value: 'health', label: 'Health', color: '#10b981' },
    { value: 'productivity', label: 'Productivity', color: '#3b82f6' },
    { value: 'learning', label: 'Learning', color: '#8b5cf6' },
    { value: 'mindfulness', label: 'Mindfulness', color: '#ec4899' },
    { value: 'social', label: 'Social', color: '#f59e0b' },
    { value: 'other', label: 'Other', color: '#6b7280' }
  ];

  const habitColors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Pink", value: "#ec4899" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Indigo", value: "#6366f1" }
  ];

  // Initialize form data when dialog opens or habit changes
  useEffect(() => {
    if (isOpen) {
      if (habit) {
        // Editing existing habit
        setFormData({
          name: habit.name || "",
          description: habit.description || "",
          category: habit.category || "other",
          frequency: habit.frequency || "daily",
          customFrequency: habit.customFrequency || { type: "days", interval: 1 },
          color: habit.color || "#3b82f6",
          emoji: habit.emoji || "🎯"
        });
      } else {
        // Creating new habit
        setFormData({
          name: "",
          description: "",
          category: "other",
          frequency: "daily",
          customFrequency: { type: "days", interval: 1 },
          color: "#3b82f6",
          emoji: "🎯"
        });
      }
    }
  }, [isOpen, habit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
      onClose();
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      description: "",
      category: "other",
      frequency: "daily",
      customFrequency: { type: "days", interval: 1 },
      color: "#3b82f6",
      emoji: "🎯"
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-base-content">{title}</h2>
            <button
              onClick={handleCancel}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text text-sm">Habit Name</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter habit name..."
                className="input input-bordered w-full"
                maxLength={100}
                required
                autoFocus
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text text-sm">Description (optional)</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a description..."
                className="input input-bordered w-full"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">
                  <span className="label-text text-sm">Category</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="select select-bordered w-full"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text text-sm">Frequency</span>
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {formData.frequency === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    <span className="label-text text-sm">Every</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.customFrequency.interval}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      customFrequency: { 
                        ...formData.customFrequency, 
                        interval: parseInt(e.target.value) || 1 
                      } 
                    })}
                    className="input input-bordered w-full"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text text-sm">Period</span>
                  </label>
                  <select
                    value={formData.customFrequency.type}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      customFrequency: { 
                        ...formData.customFrequency, 
                        type: e.target.value 
                      } 
                    })}
                    className="select select-bordered w-full"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text text-sm">Color</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {habitColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full border-3 transition-all relative ${
                        formData.color === color.value 
                          ? 'border-primary shadow-lg scale-110' 
                          : 'border-base-300 hover:border-base-400 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {formData.color === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow-md border border-white/20">
                            <Check className="w-3 h-3 text-gray-700 font-bold" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text text-sm">Emoji</span>
                </label>
                <div className="flex items-center gap-3">
                  <EmojiPickerComponent
                    selectedEmoji={formData.emoji}
                    onEmojiSelect={(emoji) => setFormData({ ...formData, emoji })}
                  />
                  <span className="text-sm text-base-content/60">
                    Click to choose
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="btn btn-primary flex-1"
              >
                {habit ? 'Update Habit' : 'Add Habit'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const SortableHabit = ({ habit, onComplete, onDelete, onEdit, onViewStats, onFocus, isCompletedToday }) => {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleEdit = () => {
    onEdit(habit);
  };

  const getCategoryColor = (category) => {
    const colors = {
      health: 'bg-green-100 text-green-800',
      productivity: 'bg-blue-100 text-blue-800',
      learning: 'bg-purple-100 text-purple-800',
      mindfulness: 'bg-pink-100 text-pink-800',
      social: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 group p-4 rounded-lg bg-base-50 border border-base-200 hover:bg-base-100 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      } ${isCompletedToday ? 'bg-success/10 border-success/20' : ''}`}
      {...attributes}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing mt-1 opacity-70 sm:opacity-30 sm:group-hover:opacity-70 transition-opacity touch-manipulation"
        title="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="5" r="1"/>
          <circle cx="15" cy="5" r="1"/>
          <circle cx="9" cy="12" r="1"/>
          <circle cx="15" cy="12" r="1"/>
          <circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      {/* Habit Checkbox */}
      <div className="flex flex-col items-center gap-2 px-2">
        <input
          type="checkbox"
          checked={isCompletedToday}
          onChange={() => onComplete(habit._id)}
          className="checkbox checkbox-sm"
          style={{
            '--chkbg': habit.color || '#3b82f6',
            '--chkfg': '#ffffff'
          }}
        />
      </div>

      {/* Habit Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{habit.emoji || '🎯'}</span>
          <h3 className={`font-medium ${isCompletedToday ? 'line-through text-base-content/50' : ''}`}>
            {habit.name}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(habit.category)}`}>
            {habit.category}
          </span>
        </div>
        
        {habit.description && (
          <p className="text-sm text-base-content/60 mb-2">{habit.description}</p>
        )}

        {/* Habit Stats */}
        <div className="flex items-center gap-4 text-xs text-base-content/60">
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3" />
            <span>{habit.streak} day streak</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>{habit.totalCompletions} total</span>
          </div>
          {habit.longestStreak > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Best: {habit.longestStreak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-row gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          
          {/* Focus Button - Start Pomodoro session for this habit */}
          {!isCompletedToday && (
            <button
              onClick={() => onFocus(habit)}
              className="p-2 rounded touch-manipulation transition-all hover:bg-primary hover:text-primary-content"
              title="Start Pomodoro session for this habit"
            >
              <Target className="w-4 h-4" />
            </button>
          )}
          
          {/* Stats Button */}
          <button
            onClick={() => onViewStats(habit._id)}
            className="p-2 hover:bg-base-200 rounded touch-manipulation"
            title="View statistics"
          >
            <BarChart3 className="w-4 h-4 text-info" />
          </button>
          
          <button
            onClick={handleEdit}
            className="p-2 hover:bg-base-200 rounded touch-manipulation"
            title="Edit habit"
          >
            <Edit2 className="w-4 h-4 text-info" />
          </button>
          <button
            onClick={() => onDelete(habit._id)}
            className="p-2 hover:bg-base-200 rounded touch-manipulation"
            title="Delete habit"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </button>
        </div>
    </div>
  );
};

const HabitTracker = ({ colorToken = "primary" }) => {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [completionsByDate, setCompletionsByDate] = useState(new Map()); // Track completions by habitId and date
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [habitStats, setHabitStats] = useState(null);
  const [viewMode, setViewMode] = useState('today'); // 'today', 'week', or 'month'
  const [currentMonth, setCurrentMonth] = useState(new Date()); // For month navigation
  
  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const navigate = useNavigate();
  const { getActiveSession, setSessionGoal } = useTimerStore();



  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load habits and check today's completions
  useEffect(() => {
    const loadHabits = async () => {
      try {
        setIsLoading(true);
        const fetchedHabits = await fetchHabits();
        setHabits(fetchedHabits);
        
        // Check which habits are completed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedIds = new Set();
        const completionsMap = new Map();
        
        // Check each habit's lastCompleted date
        fetchedHabits.forEach(habit => {
          if (habit.lastCompleted) {
            console.log(`Raw habit data for ${habit._id}:`, habit);
            const lastCompleted = new Date(habit.lastCompleted);
            lastCompleted.setHours(0, 0, 0, 0);
            console.log(`Habit ${habit._id} lastCompleted:`, habit.lastCompleted, 'Parsed:', formatDateForAPI(lastCompleted), 'Today:', formatDateForAPI(today));
            console.log(`Date comparison - lastCompleted time: ${lastCompleted.getTime()}, today time: ${today.getTime()}`);
            
            if (lastCompleted.getTime() === today.getTime()) {
              completedIds.add(habit._id);
              console.log(`Habit ${habit._id} marked as completed today`);
            }
            
            // Add to completions map for week view
            const dateKey = `${habit._id}-${formatDateForAPI(lastCompleted)}`;
            console.log(`Setting initial completion for habit ${habit._id} on date:`, formatDateForAPI(lastCompleted));
            completionsMap.set(dateKey, true);
          }
        });
        
        setCompletedToday(completedIds);
        setCompletionsByDate(completionsMap);
      } catch (error) {
        console.error('Failed to load habits:', error);
        toast.error('Failed to load habits');
        setHabits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHabits();
  }, []);

  // Helper functions for week view
  const getLast7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    console.log('Last 7 days:', days.map(d => formatDateForAPI(d)));
    return days;
  };

  // Helper functions for month view
  const getMonthDates = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday of first week
    
    const dates = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const isDateCheckable = (date) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Only past 7 days are checkable
    return date >= sevenDaysAgo && date <= today;
  };

  const isCurrentMonth = (date, currentMonth) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const isHabitCompletedOnDate = (habit, date) => {
    const dateKey = `${habit._id}-${formatDateForAPI(date)}`;
    const isCompleted = completionsByDate.has(dateKey);
    console.log(`Checking habit ${habit._id} for date ${formatDateForAPI(date)}:`, isCompleted, 'Date key:', dateKey);
    return isCompleted;
  };

  const getMonthName = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Helper function to format date in local timezone (avoid UTC conversion)
  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCompleteHabit = async (habitId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      const isCurrentlyCompleted = completedToday.has(habitId);
      
      console.log('Completing habit:', habitId, 'Currently completed:', isCurrentlyCompleted);
      console.log('Today date object:', today);
      console.log('Today ISO string:', today.toISOString());
      console.log('Today date part (old method):', today.toISOString().split('T')[0]);
      console.log('Today date part (new method):', formatDateForAPI(today));
      
      if (isCurrentlyCompleted) {
        // Uncomplete the habit
        const completionData = {
          date: formatDateForAPI(today) // Send only date part (YYYY-MM-DD)
        };
        
        await uncompleteHabit(habitId, completionData);
        
        // Update local state
        setCompletedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });
        
        // Update completions by date for week view
        const dateKey = `${habitId}-${formatDateForAPI(today)}`;
        console.log('Removing completion date key:', dateKey);
        setCompletionsByDate(prev => {
          const newMap = new Map(prev);
          newMap.delete(dateKey);
          console.log('Updated completions map after removal:', Array.from(newMap.entries()));
          return newMap;
        });
        
        // Update habit stats
        setHabits(prev => prev.map(habit => 
          habit._id === habitId 
            ? { 
                ...habit, 
                streak: Math.max(0, habit.streak - 1),
                totalCompletions: Math.max(0, habit.totalCompletions - 1),
                lastCompleted: null
              }
            : habit
        ));
        
        toast.success('Habit completion removed!');
        
        // Refresh habits data from backend to ensure consistency
        setTimeout(async () => {
          try {
            const refreshedHabits = await fetchHabits();
            setHabits(refreshedHabits);
            console.log('Refreshed habits from backend after uncheck:', refreshedHabits);
          } catch (error) {
            console.error('Failed to refresh habits:', error);
          }
        }, 500);
      } else {
        // Complete the habit
        const activeSession = getActiveSession();
        
        const completionData = {
          notes: "",
          pomodoroSessionId: activeSession?.sessionId || null,
          date: formatDateForAPI(today) // Send only date part (YYYY-MM-DD)
        };
        
        const completionResponse = await completeHabit(habitId, completionData);
        console.log('Completion response from backend:', completionResponse);
        setCompletedToday(prev => new Set([...prev, habitId]));
        
        // Update completions by date for week view
        const dateKey = `${habitId}-${formatDateForAPI(today)}`;
        console.log('Setting completion date key:', dateKey);
        setCompletionsByDate(prev => {
          const newMap = new Map(prev);
          newMap.set(dateKey, true);
          console.log('Updated completions map:', Array.from(newMap.entries()));
          return newMap;
        });
        
        // Update habit stats
        setHabits(prev => prev.map(habit => 
          habit._id === habitId 
            ? { 
                ...habit, 
                streak: habit.streak + 1,
                totalCompletions: habit.totalCompletions + 1,
                lastCompleted: today // Use the same date object we sent to backend
              }
            : habit
        ));
        console.log('Updated habit with lastCompleted:', today.toISOString());
        
        const habit = habits.find(h => h._id === habitId);
        const streakMessage = habit.streak > 0 ? ` (${habit.streak + 1} day streak!)` : '';
        toast.success(`Habit completed! 🔥${streakMessage}`);
        
        // Refresh habits data from backend to ensure consistency
        setTimeout(async () => {
          try {
            const refreshedHabits = await fetchHabits();
            setHabits(refreshedHabits);
            console.log('Refreshed habits from backend:', refreshedHabits);
          } catch (error) {
            console.error('Failed to refresh habits:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to toggle habit completion:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        habitId,
        isCurrentlyCompleted,
        completionData: isCurrentlyCompleted ? { date: today.toISOString().split('T')[0] } : {
          notes: "",
          pomodoroSessionId: getActiveSession()?.sessionId || null,
          date: today.toISOString().split('T')[0]
        }
      });
      
      if (error.response?.data?.message?.includes('already completed')) {
        toast.error('Habit already completed today');
      } else if (error.response?.data?.message?.includes('inactive')) {
        toast.error('Cannot complete inactive habit');
      } else if (error.response?.data?.message?.includes('not found')) {
        toast.error('Habit not found');
      } else {
        toast.error(`Failed to toggle habit completion: ${error.response?.data?.message || 'Unknown error'}`);
      }
    }
  };

  const handleCompleteHabitForDate = async (habitId, date, isCompleted) => {
    try {
      console.log('Completing habit for date:', habitId, date, 'Is completed:', isCompleted);
      console.log('Date object:', date);
      console.log('Date ISO string:', date.toISOString());
      console.log('Date part (old method):', date.toISOString().split('T')[0]);
      console.log('Date part (new method):', formatDateForAPI(date));
      
      const dateKey = `${habitId}-${formatDateForAPI(date)}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const isToday = targetDate.getTime() === today.getTime();
      
      console.log('Today:', formatDateForAPI(today));
      console.log('Target date:', formatDateForAPI(targetDate));
      console.log('Is today?', isToday);
      
      if (isCompleted) {
        // Remove completion for this date
        const completionData = {
          date: formatDateForAPI(date) // Send only date part (YYYY-MM-DD)
        };
        
        await uncompleteHabit(habitId, completionData);
        
        // Update local state
        setHabits(prev => prev.map(habit => 
          habit._id === habitId 
            ? { 
                ...habit, 
                totalCompletions: Math.max(0, habit.totalCompletions - 1),
                streak: isToday ? Math.max(0, habit.streak - 1) : habit.streak,
                lastCompleted: isToday ? null : habit.lastCompleted
              }
            : habit
        ));
        
        // Update completions by date
        setCompletionsByDate(prev => {
          const newMap = new Map(prev);
          newMap.delete(dateKey);
          return newMap;
        });
        
        // Update completed today set if it's today
        if (isToday) {
          setCompletedToday(prev => {
            const newSet = new Set(prev);
            newSet.delete(habitId);
            return newSet;
          });
        }
        
        toast.success('Habit completion removed!');
        return;
      }
      
      // Get current session info if available
      const activeSession = getActiveSession();
      
      const completionData = {
        notes: "",
        pomodoroSessionId: activeSession?.sessionId || null,
        date: formatDateForAPI(date) // Send only date part (YYYY-MM-DD)
      };
      
      await completeHabit(habitId, completionData);
      
      // Update local state
      setHabits(prev => prev.map(habit => 
        habit._id === habitId 
          ? { 
              ...habit, 
              totalCompletions: habit.totalCompletions + 1, 
              lastCompleted: date.toISOString(),
              streak: isToday ? habit.streak + 1 : habit.streak
            }
          : habit
      ));
      
      // Update completions by date
      setCompletionsByDate(prev => {
        const newMap = new Map(prev);
        newMap.set(dateKey, true);
        return newMap;
      });
      
      // Update completed today set if it's today
      if (isToday) {
        setCompletedToday(prev => new Set([...prev, habitId]));
      }
      
      toast.success('Habit completed! 🔥');
    } catch (error) {
      console.error('Failed to complete habit:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        habitId,
        date,
        isCompleted
      });
      
      if (error.response?.data?.message?.includes('already completed')) {
        toast.error('Habit already completed on this date');
      } else if (error.response?.data?.message?.includes('inactive')) {
        toast.error('Cannot complete inactive habit');
      } else if (error.response?.data?.message?.includes('not found')) {
        toast.error('Habit not found');
      } else {
        toast.error(`Failed to complete habit: ${error.response?.data?.message || 'Unknown error'}`);
      }
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setShowDialog(true);
  };

  const handleSaveHabit = async (habitData) => {
    try {
      if (editingHabit) {
        // Update existing habit
        const updatedHabit = await updateHabit(editingHabit._id, habitData);
        setHabits(prev => prev.map(habit => 
          habit._id === editingHabit._id ? { ...habit, ...updatedHabit } : habit
        ));
        toast.success('Habit updated successfully');
      } else {
        // Create new habit
        const createdHabit = await createHabit(habitData);
        setHabits([createdHabit, ...habits]);
        toast.success('Habit added successfully');
      }
    } catch (error) {
      console.error('Failed to save habit:', error);
      toast.error(`Failed to ${editingHabit ? 'update' : 'create'} habit`);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      try {
        await deleteHabit(habitId);
        setHabits(prev => prev.filter(habit => habit._id !== habitId));
        setCompletedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });
        toast.success('Habit deleted successfully');
      } catch (error) {
        console.error('Failed to delete habit:', error);
        toast.error('Failed to delete habit');
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = habits.findIndex(habit => habit._id === active.id);
      const newIndex = habits.findIndex(habit => habit._id === over.id);
      
      const newHabits = arrayMove(habits, oldIndex, newIndex);
      setHabits(newHabits);

      try {
        const habitIds = newHabits.map(habit => habit._id);
        await reorderHabits(habitIds);
      } catch (error) {
        console.error('Failed to reorder habits:', error);
        toast.error('Failed to save new order');
        setHabits(habits);
      }
    }
  };

  const handleAddHabit = () => {
    setEditingHabit(null);
    setShowDialog(true);
  };

  const handleViewStats = async (habitId) => {
    try {
      const stats = await getHabitStats(habitId, 'week');
      setHabitStats(stats);
      setSelectedHabit(habitId);
    } catch (error) {
      console.error('Failed to load habit stats:', error);
      toast.error('Failed to load habit statistics');
    }
  };

  const handleFocusHabit = async (habit) => {
    // Set the session goal in the timer store
    setSessionGoal(habit.name);
    
    // Navigate to solo page
    navigate('/solo');
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-fit">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 bg-${colorToken} rounded-lg flex items-center justify-center`}>
            <Target className="w-5 h-5 text-primary-content" />
          </div>
          <h2 className="text-3xl font-semibold text-base-content font-fredoka">Habits</h2>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-base-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode('today')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'today' 
                ? `bg-${colorToken} text-primary-content` 
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <List className="w-4 h-4" />
            Today
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'week' 
                ? `bg-${colorToken} text-primary-content` 
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'month' 
                ? `bg-${colorToken} text-primary-content` 
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Month
          </button>
        </div>
      </div>
      
      <p className="text-xs sm:text-sm text-base-content/60 mb-3 sm:mb-4">
        🔥 Build consistent habits with daily tracking and streaks
      </p>

      <div className="space-y-2 sm:space-y-3 mb-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="loading loading-spinner loading-md"></div>
            <p className="text-sm text-base-content/60 mt-2">Loading habits...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-base-content/60">No habits set yet</p>
            <p className="text-sm text-base-content/40">Add your first habit to get started!</p>
          </div>
        ) : viewMode === 'today' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={habits.map(habit => habit._id)} strategy={verticalListSortingStrategy}>
              {habits.map((habit) => (
                <SortableHabit
                  key={habit._id}
                  habit={habit}
                  onComplete={handleCompleteHabit}
                  onDelete={handleDeleteHabit}
                  onEdit={handleEditHabit}
                  onViewStats={handleViewStats}
                  onFocus={handleFocusHabit}
                  isCompletedToday={completedToday.has(habit._id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : viewMode === 'week' ? (
          /* Week View */
          <div className="space-y-4">
            {/* Month Header */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-base-content">{getMonthName()}</h3>
            </div>
            
            {/* Week Grid */}
            <div className="space-y-3">
              {habits.map((habit) => {
                const last7Days = getLast7Days();
                return (
                  <div key={habit._id} className="flex items-center gap-4">
                    {/* Habit Name - 50% width */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg mr-2">
                          {habit.emoji || '🎯'}
                        </span>
                        <span className="text-sm font-medium text-base-content truncate">
                          {habit.name}
                        </span>
                      </div>
                    </div>
                    
                    {/* Week Progress - 50% width */}
                    <div className="flex-1 flex justify-between">
                      {last7Days.map((date, index) => {
                        const isCompleted = isHabitCompletedOnDate(habit, date);
                        const isToday = index === 6;
                        return (
                          <div key={index} className="flex flex-col items-center gap-2 px-2">
                            <div className="text-sm font-bold text-base-content">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className="text-sm font-bold text-base-content">
                              {date.getDate()}
                            </div>
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => {
                                handleCompleteHabitForDate(habit._id, date, isCompleted);
                              }}
                              className="checkbox checkbox-sm"
                              style={{
                                '--chkbg': habit.color || '#3b82f6',
                                '--chkfg': '#ffffff'
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Month View */
          <div className="space-y-4">
            {/* Month Header with Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateMonth(-1)}
                className="btn btn-sm btn-outline"
              >
                ←
              </button>
              <h3 className="text-lg font-semibold text-base-content">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateMonth(1)}
                className="btn btn-sm btn-outline"
              >
                →
              </button>
            </div>
            
            {/* Month Grid - Same layout as week view */}
            <div className="space-y-3">
              {habits.map((habit) => {
                const monthDates = getMonthDates(currentMonth.getFullYear(), currentMonth.getMonth());
                // Filter to only show dates from current month
                const currentMonthDates = monthDates.filter(date => isCurrentMonth(date, currentMonth));
                
                return (
                  <div key={habit._id} className="flex items-center gap-4">
                    {/* Habit Name - Fixed width */}
                    <div className="w-32 min-w-32 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg mr-2">
                          {habit.emoji || '🎯'}
                        </span>
                        <span className="text-sm font-medium text-base-content truncate">
                          {habit.name}
                        </span>
                      </div>
                    </div>
                    
                    {/* Month Progress - Scrollable horizontal */}
                    <div className="flex-1 overflow-x-auto">
                      <div className="flex gap-1 min-w-max">
                        {currentMonthDates.map((date, index) => {
                          const isCompleted = isHabitCompletedOnDate(habit, date);
                          const canCheck = isDateCheckable(date);
                          
                          return (
                            <div key={index} className="flex flex-col items-center gap-1 px-1 min-w-[40px]">
                              <div className="text-xs font-bold text-base-content">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div className="text-xs font-bold text-base-content">
                                {date.getDate()}
                              </div>
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={canCheck ? () => {
                                  handleCompleteHabitForDate(habit._id, date, isCompleted);
                                } : undefined}
                                disabled={!canCheck}
                                className="checkbox checkbox-xs"
                                style={{
                                  '--chkbg': habit.color || '#3b82f6',
                                  '--chkfg': '#ffffff'
                                }}
                                title={canCheck 
                                  ? `${isCompleted ? 'Click to uncheck' : 'Click to check'} for ${formatDateForAPI(date)}`
                                  : `${isCompleted ? 'Completed' : 'Not completed'} on ${formatDateForAPI(date)} (past 7 days only)`
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="text-xs text-base-content/60 space-y-1">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="checkbox checkbox-xs" checked disabled />
                <span>Past 7 days (clickable)</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="checkbox checkbox-xs" disabled />
                <span>Older dates (view only)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleAddHabit}
        className={`btn btn-outline btn-${colorToken} w-full gap-2`}
      >
        <Plus className="w-4 h-4" />
        Add Habit
      </button>

      {/* Habit Dialog */}
      <HabitDialog
        isOpen={showDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveHabit}
        habit={editingHabit}
        title={editingHabit ? "Edit Habit" : "Add Habit"}
      />
    </div>
  );
};

export default HabitTracker;

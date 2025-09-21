import Habit from "../models/habit.model.js";
import HabitCompletion from "../models/habitCompletion.model.js";

export const createHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, category, frequency, targetCount, color, emoji, customFrequency } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Habit name is required" });
    }

    const habit = await Habit.create({
      userId,
      name: name.trim(),
      description: description?.trim() || "",
      category: category || 'other',
      frequency: frequency || 'daily',
      targetCount: targetCount || 1,
      color: color || '#3b82f6',
      emoji: emoji || '🎯',
      customFrequency: frequency === 'custom' ? customFrequency : undefined,
    });

    res.status(201).json(habit);
  } catch (error) {
    console.error("Error in createHabit: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getHabits = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, isActive } = req.query;

    let query = { userId };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const habits = await Habit.find(query).sort({ order: 1, createdAt: -1 });
    res.json(habits);
  } catch (error) {
    console.error("Error in getHabits: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { habitId } = req.params;
    const { name, description, category, frequency, targetCount, color, emoji, isActive } = req.body;

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (category !== undefined) updateData.category = category;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (targetCount !== undefined) updateData.targetCount = targetCount;
    if (color !== undefined) updateData.color = color;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedHabit = await Habit.findByIdAndUpdate(
      habitId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedHabit);
  } catch (error) {
    console.error("Error in updateHabit: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // Delete all completions for this habit
    await HabitCompletion.deleteMany({ habitId });
    
    // Delete the habit
    await Habit.findByIdAndDelete(habitId);
    
    res.json({ message: "Habit deleted successfully" });
  } catch (error) {
    console.error("Error in deleteHabit: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reorderHabits = async (req, res) => {
  try {
    const userId = req.user._id;
    const { habitIds } = req.body;

    if (!Array.isArray(habitIds)) {
      return res.status(400).json({ message: "habitIds must be an array" });
    }

    const updatePromises = habitIds.map((habitId, index) => 
      Habit.findOneAndUpdate(
        { _id: habitId, userId },
        { order: index },
        { new: true }
      )
    );

    await Promise.all(updatePromises);
    
    const updatedHabits = await Habit.find({ userId }).sort({ order: 1, createdAt: -1 });
    
    res.json(updatedHabits);
  } catch (error) {
    console.error("Error in reorderHabits: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const completeHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { habitId } = req.params;
    const { notes, pomodoroSessionId, date } = req.body;

    console.log(`[BACKEND] CompleteHabit called - habitId: ${habitId}, date: ${date}`);

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    if (!habit.isActive) {
      return res.status(400).json({ message: "Cannot complete inactive habit" });
    }

    // Use provided date or default to today
    let completionDate;
    if (date) {
      // Parse date string more safely to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      completionDate = new Date(year, month - 1, day); // month is 0-indexed
      console.log(`[BACKEND] Parsing date "${date}" -> Year: ${year}, Month: ${month}, Day: ${day}`);
      console.log(`[BACKEND] Resulting completion date: ${completionDate.toISOString()}`);
    } else {
      completionDate = new Date();
      console.log(`[BACKEND] No date provided, using today: ${completionDate.toISOString()}`);
    }
    completionDate.setHours(0, 0, 0, 0);
    console.log(`[BACKEND] Final completion date after normalization: ${completionDate.toISOString()}`);

    // Check if already completed on this date
    const existingCompletion = await HabitCompletion.findOne({
      userId,
      habitId,
      date: { $gte: completionDate, $lt: new Date(completionDate.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (existingCompletion) {
      return res.status(400).json({ message: "Habit already completed on this date" });
    }

    // Create completion record
    const completion = await HabitCompletion.create({
      userId,
      habitId,
      completedAt: new Date(),
      date: completionDate,
      notes: notes || "",
      pomodoroSessionId: pomodoroSessionId || null,
    });

    // Update habit stats
    const updateData = {
      totalCompletions: habit.totalCompletions + 1,
      lastCompleted: completionDate,
    };
    
    console.log(`[BACKEND] Updating habit ${habitId} with lastCompleted: ${completionDate.toISOString()}`);

    // Calculate streak (only for today's completions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (completionDate.getTime() === today.getTime()) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayCompletion = await HabitCompletion.findOne({
        userId,
        habitId,
        date: { $gte: yesterday, $lt: today }
      });

      if (yesterdayCompletion) {
        // Continue streak
        updateData.streak = habit.streak + 1;
      } else {
        // Start new streak
        updateData.streak = 1;
      }

      // Update longest streak
      if (updateData.streak > habit.longestStreak) {
        updateData.longestStreak = updateData.streak;
      }
    }

    await Habit.findByIdAndUpdate(habitId, updateData);

    res.json({ completion, message: "Habit completed successfully" });
  } catch (error) {
    console.error("Error in completeHabit: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const uncompleteHabit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { habitId } = req.params;
    const { date } = req.body;

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // Use provided date or default to today
    let completionDate;
    if (date) {
      // Parse date string more safely to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      completionDate = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      completionDate = new Date();
    }
    completionDate.setHours(0, 0, 0, 0);

    // Find and delete the completion record
    const completion = await HabitCompletion.findOneAndDelete({
      userId,
      habitId,
      date: { $gte: completionDate, $lt: new Date(completionDate.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (!completion) {
      return res.status(404).json({ message: "No completion found for this date" });
    }

    // Update habit stats
    const updateData = {
      totalCompletions: Math.max(0, habit.totalCompletions - 1),
    };

    // Update lastCompleted to the most recent completion
    const lastCompletion = await HabitCompletion.findOne(
      { userId, habitId },
      { sort: { date: -1 } }
    );
    
    if (lastCompletion) {
      updateData.lastCompleted = lastCompletion.date;
    } else {
      updateData.lastCompleted = null;
    }

    await Habit.findByIdAndUpdate(habitId, updateData);

    res.json({ message: "Habit completion removed successfully" });
  } catch (error) {
    console.error("Error in uncompleteHabit: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getHabitStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { habitId } = req.params;
    const { period = 'week' } = req.query; // week, month, year

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const completions = await HabitCompletion.find({
      userId,
      habitId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const stats = {
      habit: {
        _id: habit._id,
        name: habit.name,
        streak: habit.streak,
        longestStreak: habit.longestStreak,
        totalCompletions: habit.totalCompletions,
      },
      period,
      completions: completions.length,
      completionRate: period === 'week' ? (completions.length / 7) * 100 : 
                     period === 'month' ? (completions.length / 30) * 100 : 
                     (completions.length / 365) * 100,
      completions,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error in getHabitStats: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

import Goal from "../models/goal.model.js";

export const createGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { text, description } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Goal text is required" });
    }

    const goal = await Goal.create({
      userId,
      text: text.trim(),
      description: description?.trim() || "",
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error("Error in createGoal: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date } = req.query;

    let query = { userId };
    
    // Only filter by date if explicitly provided
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      query.date = { $gte: startOfDay, $lt: endOfDay };
    }
    // If no date provided, get all goals for the user (persistent goals)

    let goals = await Goal.find(query).sort({ order: 1, createdAt: -1 });

    res.json(goals);
  } catch (error) {
    console.error("Error in getGoals: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goalId } = req.params;
    const { text, description, completed } = req.body;

    const goal = await Goal.findOne({ _id: goalId, userId });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const updateData = {};
    if (text !== undefined) updateData.text = text.trim();
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (completed !== undefined) updateData.completed = completed;

    const updatedGoal = await Goal.findByIdAndUpdate(
      goalId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedGoal);
  } catch (error) {
    console.error("Error in updateGoal: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goalId } = req.params;

    const goal = await Goal.findOne({ _id: goalId, userId });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await Goal.findByIdAndDelete(goalId);
    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGoal: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reorderGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goalIds } = req.body; // Array of goal IDs in new order

    if (!Array.isArray(goalIds)) {
      return res.status(400).json({ message: "goalIds must be an array" });
    }

    // Update order for each goal
    const updatePromises = goalIds.map((goalId, index) => 
      Goal.findOneAndUpdate(
        { _id: goalId, userId },
        { order: index },
        { new: true }
      )
    );

    await Promise.all(updatePromises);
    
    // Fetch updated goals to return
    const updatedGoals = await Goal.find({ userId }).sort({ order: 1, createdAt: -1 });
    
    res.json(updatedGoals);
  } catch (error) {
    console.error("Error in reorderGoals: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

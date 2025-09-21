import mongoose from "mongoose";

const habitCompletionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    completedAt: { type: Date, required: true, default: Date.now },
    date: { type: Date, required: true }, // Date of completion (for daily tracking)
    notes: { type: String, maxlength: 500, default: "" }, // Optional notes about the completion
    pomodoroSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" }, // Link to pomodoro session if applicable
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
habitCompletionSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true }); // Prevent duplicate completions per day
habitCompletionSchema.index({ userId: 1, date: -1 });
habitCompletionSchema.index({ habitId: 1, date: -1 });

const HabitCompletion = mongoose.model("HabitCompletion", habitCompletionSchema);

export default HabitCompletion;


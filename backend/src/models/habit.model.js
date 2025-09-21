import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 200, default: "" },
    category: { 
      type: String, 
      enum: ['health', 'productivity', 'learning', 'mindfulness', 'social', 'other'], 
      default: 'other' 
    },
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'custom'], 
      default: 'daily' 
    },
    customFrequency: {
      type: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        default: 'days'
      },
      interval: { type: Number, default: 1 }, // e.g., every 10 days, every 2 weeks
    },
    targetCount: { type: Number, default: 1 }, // How many times per period
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#3b82f6' }, // Hex color for UI
    emoji: { type: String, default: "🎯" }, // Emoji for the habit
    order: { type: Number, default: 0 }, // For custom ordering
    streak: { type: Number, default: 0 }, // Current streak count
    longestStreak: { type: Number, default: 0 }, // Best streak ever
    totalCompletions: { type: Number, default: 0 }, // Total times completed
    startDate: { type: Date, default: Date.now },
    lastCompleted: { type: Date }, // Last completion date
  },
  { timestamps: true }
);

// Indexes for efficient queries
habitSchema.index({ userId: 1, isActive: 1 });
habitSchema.index({ userId: 1, category: 1 });
habitSchema.index({ userId: 1, order: 1 });

const Habit = mongoose.model("Habit", habitSchema);

export default Habit;
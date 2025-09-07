import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 200, default: "" },
    completed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }, // For daily goals
    order: { type: Number, default: 0 }, // For custom ordering via drag and drop
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, date: -1 });
goalSchema.index({ userId: 1, completed: 1 });

const Goal = mongoose.model("Goal", goalSchema);

export default Goal;




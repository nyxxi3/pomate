import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionType: { type: String, enum: ["focus", "break"], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // seconds
    status: { type: String, enum: ["completed", "abandoned"], required: true },
    goal: { type: String, default: "" },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, createdAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;




import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 2,
      max: 15,
      default: 8,
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pomodoroMode: {
      type: Boolean,
      default: true,
    },
    workDuration: {
      type: Number,
      min: 5,
      max: 60,
      default: 25,
    },
    breakDuration: {
      type: Number,
      min: 1,
      max: 30,
      default: 5,
    },
    enableChat: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentSession: {
      type: {
        type: String,
        enum: ["work", "break"],
        default: "work",
      },
      startTime: {
        type: Date,
      },
      duration: {
        type: Number, // in seconds
      },
    },
  },
  { timestamps: true }
);

// Index for better query performance
roomSchema.index({ isPublic: 1, isActive: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ participants: 1 });

// Virtual for participant count
roomSchema.virtual("participantCount").get(function() {
  return this.participants.length;
});

// Ensure virtual fields are serialized
roomSchema.set("toJSON", { virtuals: true });

const Room = mongoose.model("Room", roomSchema);

export default Room;

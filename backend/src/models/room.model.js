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
    timer: {
      sessionType: {
        type: String,
        enum: ['work', 'break'],
        default: 'work'
      },
      startTime: Date,
      endTime: Date,
      duration: Number, // in seconds
      isRunning: {
        type: Boolean,
        default: false
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    autoMode: {
      type: Boolean,
      default: false
    },
    dormantAt: {
      type: Date,
      default: null
    }
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

// Method to remove duplicate participants - enhanced
roomSchema.methods.removeDuplicateParticipants = function() {
  const uniqueParticipants = [];
  const seenIds = new Set();
  
  console.log(`🧹 [ROOM MODEL] Starting duplicate removal for room ${this._id}, current participants: ${this.participants.length}`);
  
  for (const participant of this.participants) {
    // Handle different participant formats (populated vs unpopulated)
    let participantId;
    if (typeof participant === 'string') {
      participantId = participant;
    } else if (participant && participant._id) {
      participantId = participant._id.toString();
    } else if (participant) {
      participantId = participant.toString();
    }
    
    console.log(`🧹 [ROOM MODEL] Processing participant:`, { participant, participantId, seen: seenIds.has(participantId) });
    
    if (!seenIds.has(participantId)) {
      seenIds.add(participantId);
      uniqueParticipants.push(participant);
    } else {
      console.log(`🧹 [ROOM MODEL] Duplicate found, skipping participant: ${participantId}`);
    }
  }
  
  const removedCount = this.participants.length - uniqueParticipants.length;
  if (removedCount > 0) {
    console.log(`🧹 [ROOM MODEL] Removed ${removedCount} duplicate participants from room ${this._id}`);
    console.log(`🧹 [ROOM MODEL] Before: ${this.participants.length}, After: ${uniqueParticipants.length}`);
    this.participants = uniqueParticipants;
    this.markModified('participants');
  } else {
    console.log(`🧹 [ROOM MODEL] No duplicates found in room ${this._id}`);
  }
  
  return removedCount;
};

// Method to transfer admin rights to another participant
roomSchema.methods.transferAdmin = async function(newAdminId) {
  // Check if new admin is a participant
  const isParticipant = this.participants.some(participant => 
    participant._id ? 
    participant._id.toString() === newAdminId.toString() : 
    participant.toString() === newAdminId.toString()
  );

  if (!isParticipant) {
    throw new Error('New admin must be a participant in the room');
  }

  this.creator = newAdminId;
  return this.save();
};

// Method to start a timer session
roomSchema.methods.startTimer = function(sessionType = 'work', customDuration = null) {
  const now = new Date();
  let duration;
  
  if (customDuration !== null) {
    // Use custom duration if provided
    duration = customDuration;
  } else {
    // Use room's default duration
    duration = (sessionType === 'work' ? this.workDuration : this.breakDuration) * 60;
  }
  
  this.timer = {
    sessionType,
    startTime: now,
    endTime: new Date(now.getTime() + duration * 1000),
    duration,
    isRunning: true,
    lastUpdated: now
  };
  
  this.markModified('timer');
  return this.save();
};


// Method to stop the timer
roomSchema.methods.stopTimer = function() {
  // Preserve the current session type when stopping
  const currentSessionType = this.timer?.sessionType || 'work';
  this.timer = {
    sessionType: currentSessionType,
    startTime: null,
    endTime: null,
    duration: null,
    isRunning: false,
    lastUpdated: null
  };
  return this.save();
};

// Method to get current timer state
roomSchema.methods.getTimerState = function() {
  return {
    sessionType: this.timer?.sessionType || 'work',
    startTime: this.timer?.startTime,
    endTime: this.timer?.endTime,
    duration: this.timer?.duration,
    isRunning: this.timer?.isRunning || false,
    lastUpdated: this.timer?.lastUpdated
  };
};

// Method to check if room should be marked as dormant
roomSchema.methods.checkDormantStatus = function() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  // Room becomes dormant if:
  // 1. No participants (except creator) for 24 hours, OR
  // 2. No activity (timer updates, messages) for 24 hours
  const hasParticipants = this.participants.length > 1; // More than just creator
  const lastActivity = this.timer?.lastUpdated || this.updatedAt;
  const isInactive = lastActivity < oneDayAgo;
  
  if (!hasParticipants && isInactive) {
    this.dormantAt = now;
    this.isActive = false;
    console.log(`💤 [ROOM MODEL] Room ${this._id} marked as dormant - no participants and inactive for 24h`);
    return true;
  }
  
  return false;
};

// Method to reactivate a dormant room
roomSchema.methods.reactivate = function() {
  this.dormantAt = null;
  this.isActive = true;
  console.log(`🔄 [ROOM MODEL] Room ${this._id} reactivated`);
  return this.save();
};

// Ensure virtual fields are serialized
roomSchema.set("toJSON", { 
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Room = mongoose.model("Room", roomSchema);

export default Room;

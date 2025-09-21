import { io } from './socket.js';
import Room from '../models/room.model.js';

// Track active timers by room ID
const activeTimers = new Map();

// Start broadcasting timer updates for a room
const startTimerBroadcast = async (roomId) => {
  if (activeTimers.has(roomId)) return;

  const broadcastUpdate = async () => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        stopTimerBroadcast(roomId);
        return;
      }

      const timerState = room.getTimerState();
      if (!timerState) {
        stopTimerBroadcast(roomId);
        return;
      }

      // Broadcast the current timer state to all clients in the room
      console.log(`⏰ [BACKEND] Broadcasting timer update to room ${roomId}:`, timerState);
      io.to(roomId).emit('timer:update', timerState);

      // If timer is running and has ended, handle completion
      if (timerState.isRunning && timerState.remaining <= 0) {
        await handleTimerCompletion(room);
      }
    } catch (error) {
      console.error(`Error broadcasting timer update for room ${roomId}:`, error);
      stopTimerBroadcast(roomId);
    }
  };

  // Initial broadcast
  await broadcastUpdate();

  // Set up interval for updates (every second)
  const interval = setInterval(broadcastUpdate, 1000);
  activeTimers.set(roomId, { interval, lastUpdate: Date.now() });
};

// Stop broadcasting timer updates for a room
export const stopTimerBroadcast = (roomId) => {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearInterval(timer.interval);
    activeTimers.delete(roomId);
  }
};

// Handle timer completion (switch between work/break)
const handleTimerCompletion = async (room) => {
  try {
    const { timer } = room;
    const nextSessionType = timer.sessionType === 'work' ? 'break' : 'work';
    
    // Only auto-start next session if autoMode is enabled
    if (room.autoMode) {
      console.log(`[BACKEND] Auto mode enabled - starting next session: ${nextSessionType}`);
      // Update room with next session
      await room.startTimer(nextSessionType);
      
      // Notify all clients in the room
      io.to(room._id.toString()).emit('timer:complete', {
        previousSession: timer.sessionType,
        nextSession: nextSessionType
      });
    } else {
      console.log(`[BACKEND] Manual mode - stopping timer after ${timer.sessionType} session`);
      // Set the timer to the next session type but don't start it
      const nextSessionType = timer.sessionType === 'work' ? 'break' : 'work';
      const nextDuration = (nextSessionType === 'work' ? room.workDuration : room.breakDuration) * 60;
      
      // Update room timer to next session type but keep it stopped
      room.timer = {
        sessionType: nextSessionType,
        startTime: null,
        endTime: null,
        duration: nextDuration,
        isRunning: false,
        lastUpdated: new Date()
      };
      room.markModified('timer');
      await room.save();
      
      // Broadcast the updated timer state
      const timerState = room.getTimerState();
      if (timerState) {
        io.to(room._id.toString()).emit('timer:update', timerState);
      }
      
      // Notify all clients that timer completed and manual control is needed
      io.to(room._id.toString()).emit('timer:complete', {
        previousSession: timer.sessionType,
        nextSession: nextSessionType,
        requiresManualStart: true
      });
    }
  } catch (error) {
    console.error('Error handling timer completion:', error);
  }
};

// Initialize timer socket events
export const initializeTimerSync = (socket) => {
  // Handle timer control from clients
  socket.on('timer:start', async ({ roomId, sessionType = 'work', duration = null }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      // Verify user has permission (admin only)
      const isAdmin = room.creator.toString() === socket.userId || 
                     room.creator._id?.toString() === socket.userId;
      if (!isAdmin) return;

      console.log(`[BACKEND] Starting timer with sessionType: ${sessionType}, duration: ${duration}`);
      await room.startTimer(sessionType, duration);
      
      // Immediately broadcast the timer state to all users in the room
      const timerState = room.getTimerState();
      if (timerState) {
        console.log(`[BACKEND] Immediately broadcasting timer start to room ${roomId}:`, timerState);
        io.to(roomId).emit('timer:update', timerState);
      }
      
      startTimerBroadcast(roomId);
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  });


  socket.on('timer:stop', async ({ roomId }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      // Verify user has permission (admin only)
      const isAdmin = room.creator.toString() === socket.userId || 
                     room.creator._id?.toString() === socket.userId;
      if (!isAdmin) return;

      await room.stopTimer();
      stopTimerBroadcast(roomId);
      
      // Broadcast the updated timer state to all users (including the host)
      const timerState = room.getTimerState();
      if (timerState) {
        console.log(`[BACKEND] Broadcasting timer stop state to room ${roomId}:`, timerState);
        io.to(roomId).emit('timer:update', timerState);
      }
      
      // Also notify all clients that timer was stopped (for notifications)
      io.to(roomId).emit('timer:stopped');
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  });

  socket.on('timer:skip', async ({ roomId, sessionType }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      // Verify user has permission (admin only)
      const isAdmin = room.creator.toString() === socket.userId || 
                     room.creator._id?.toString() === socket.userId;
      if (!isAdmin) return;

      // Only allow skipping break sessions
      if (sessionType !== 'break') {
        console.log(`[BACKEND] Cannot skip ${sessionType} session, only break sessions can be skipped`);
        return;
      }

      console.log(`[BACKEND] Skipping break session in room ${roomId}`);
      
      // Set timer to work mode but keep it stopped
      const workDuration = room.workDuration * 60;
      room.timer = {
        sessionType: 'work',
        startTime: null,
        endTime: null,
        duration: workDuration,
        isRunning: false,
        lastUpdated: new Date()
      };
      room.markModified('timer');
      await room.save();
      
      stopTimerBroadcast(roomId);
      
      // Broadcast the updated timer state to all users (including the host)
      const timerState = room.getTimerState();
      if (timerState) {
        console.log(`[BACKEND] Broadcasting timer skip state to room ${roomId}:`, timerState);
        io.to(roomId).emit('timer:update', timerState);
      }
      
      // Notify all clients that break was skipped
      io.to(roomId).emit('timer:skipped', {
        skippedSession: 'break',
        nextSession: 'work'
      });
    } catch (error) {
      console.error('Error skipping timer:', error);
    }
  });

  // Handle auto mode toggle
  socket.on('room:setAutoMode', async ({ roomId, autoMode }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      // Verify user has permission (admin only)
      const isAdmin = room.creator.toString() === socket.userId || 
                     room.creator._id?.toString() === socket.userId;
      if (!isAdmin) return;

      console.log(`[BACKEND] Setting auto mode to ${autoMode} for room ${roomId}`);
      
      // Update room's auto mode setting
      room.autoMode = autoMode;
      await room.save();
      
      // Notify all clients in the room about the auto mode change
      io.to(roomId).emit('room:autoModeChanged', { autoMode });
    } catch (error) {
      console.error('Error setting auto mode:', error);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    // No need to clean up timers here as they're managed per-room
  });
};

// Clean up all timers on server shutdown
process.on('SIGTERM', () => {
  for (const [roomId, timer] of activeTimers.entries()) {
    clearInterval(timer.interval);
    activeTimers.delete(roomId);
  }
});

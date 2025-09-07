# Room Feature Implementation

This document describes the implementation of the collaborative room feature for the Pomate application.

## Overview

The room feature allows users to create and join collaborative Pomodoro sessions with other users. Users can work together in real-time with synchronized timers and chat functionality.

## Features Implemented

### 1. Room Creation Dialog
- **Component**: `CreateRoomDialog.jsx`
- **Features**:
  - Room name input with validation
  - Public/Private toggle
  - Max participants selector (2-20)
  - Pomodoro mode toggle
  - Work/Break duration settings
  - Chat enable/disable option
  - Form validation and error handling

### 2. Room Management
- **Store**: `useRoomStore.js`
- **Features**:
  - Room creation, joining, and leaving
  - Real-time participant updates
  - Room state management
  - Socket integration for live updates

### 3. Room Interface
- **Component**: `RoomPage.jsx`
- **Features**:
  - Shared Pomodoro timer
  - Participant list with online status
  - Room settings and controls
  - Leave room functionality
  - Real-time updates

### 4. Backend API
- **Model**: `room.model.js`
- **Controller**: `room.controller.js`
- **Routes**: `room.route.js`
- **Endpoints**:
  - `POST /api/rooms/create` - Create a new room
  - `GET /api/rooms` - Get all public rooms
  - `GET /api/rooms/:roomId` - Get room details
  - `POST /api/rooms/:roomId/join` - Join a room
  - `POST /api/rooms/:roomId/leave` - Leave a room
  - `PUT /api/rooms/:roomId` - Update room settings
  - `DELETE /api/rooms/:roomId` - Delete a room

### 5. Real-time Communication
- **Socket Events**:
  - `joinRoom` - Join a room socket room
  - `leaveRoom` - Leave a room socket room
  - `roomParticipantJoined` - Notify when someone joins
  - `roomParticipantLeft` - Notify when someone leaves
  - `roomTimerStart` - Synchronize timer start
  - `roomTimerPause` - Synchronize timer pause
  - `roomTimerStop` - Synchronize timer stop
  - `roomMessage` - Send chat messages

## Usage

### Creating a Room
1. Click "Create Room" button on the dashboard
2. Fill in the room creation form
3. Click "Create Room" to create and join the room

### Joining a Room
1. View available rooms in the "Active Rooms" section
2. Click "Join" on any available room
3. You'll be redirected to the room interface

### Room Interface
- **Timer**: Shared Pomodoro timer for all participants
- **Participants**: See who's in the room and their online status
- **Chat**: Real-time messaging (when enabled)
- **Settings**: Room configuration options

## Technical Details

### Frontend Architecture
- **State Management**: Zustand store for room state
- **Routing**: React Router for room navigation
- **UI Framework**: DaisyUI components with custom styling
- **Real-time**: Socket.io client integration

### Backend Architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Real-time**: Socket.io server integration
- **API**: RESTful endpoints with proper error handling

### Data Models
```javascript
// Room Schema
{
  name: String (required, 3-50 chars),
  description: String (optional, max 200 chars),
  isPublic: Boolean (default: true),
  maxParticipants: Number (2-20, default: 8),
  participants: [ObjectId] (ref: User),
  creator: ObjectId (ref: User),
  pomodoroMode: Boolean (default: true),
  workDuration: Number (5-60 min, default: 25),
  breakDuration: Number (1-30 min, default: 5),
  enableChat: Boolean (default: true),
  isActive: Boolean (default: true),
  currentSession: {
    type: String (work/break),
    startTime: Date,
    duration: Number (seconds)
  }
}
```

## Security Considerations
- All room endpoints require authentication
- Only room creators can update/delete rooms
- Private rooms are not discoverable
- Participant limits are enforced
- Input validation on all endpoints

## Future Enhancements
- Room chat functionality
- Room history and analytics
- Room templates
- Advanced timer synchronization
- Room moderation features
- File sharing in rooms


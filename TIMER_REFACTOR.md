# Timer Refactoring - Single Source of Truth Implementation

## Problem Solved

The original timer implementation had a critical issue where both the Dashboard and SoloSessionPage components were managing their own timer state independently. This caused:

1. **Double increment bug**: When navigating between pages, both timer intervals would run simultaneously, causing the timer to increment 2 seconds per second instead of 1
2. **Inconsistent state**: Each page had its own timer logic, leading to potential state mismatches
3. **Poor user experience**: Timer behavior was unpredictable when switching between pages

## Solution: Global Timer Store

### Architecture Overview

The new implementation uses a **single source of truth** approach with:

1. **Global Timer Store** (`useTimerStore.js`) - Manages all timer state using Zustand
2. **Global Timer Component** (`GlobalTimer.jsx`) - Single interval manager for the entire app
3. **Updated Components** - Dashboard and SoloSessionPage now consume from the global store

### Key Components

#### 1. useTimerStore.js
- **Centralized state management** for all timer-related data
- **Timer controls**: start, pause, stop, skip, reset
- **Session management**: work/break minutes, mode switching
- **Callback system**: for timer events (start, end, pause)
- **localStorage sync**: maintains persistence across page refreshes

#### 2. GlobalTimer.jsx
- **Single interval manager** - only one timer interval runs at a time
- **Automatic cleanup** - prevents memory leaks and duplicate intervals
- **State synchronization** - ensures timer state is always current

#### 3. Updated Pages
- **Dashboard**: Simplified to only read from global store
- **SoloSessionPage**: Removed duplicate timer logic, now uses global store

### Benefits

1. **Consistent Behavior**: Timer increments exactly 1 second per second, regardless of page
2. **Seamless Navigation**: Timer continues running when switching between pages
3. **Single Source of Truth**: All timer state is managed in one place
4. **Better Performance**: Only one interval runs at a time
5. **Easier Maintenance**: Timer logic is centralized and easier to debug

### How It Works

1. **App Initialization**: `GlobalTimer` component is mounted in `App.jsx` and initializes timer state from localStorage
2. **Timer Running**: When timer starts, `GlobalTimer` creates a single interval that updates the global store
3. **State Updates**: All components subscribe to the global store and automatically re-render when timer state changes
4. **Page Navigation**: Timer continues running because `GlobalTimer` is always mounted
5. **Persistence**: Timer state is saved to localStorage and restored on page refresh

### Migration Changes

#### Dashboard.jsx
- Removed local timer state and interval management
- Now uses `getActiveSession()` from global store
- Simplified to only display timer state

#### SoloSessionPage.jsx
- Removed duplicate timer logic (useEffect, interval management)
- Now uses global store methods for all timer operations
- Session storage operations handled separately (can't be done in store)

#### App.jsx
- Added `GlobalTimer` component to ensure timer is always running

### Testing the Fix

To verify the fix works:

1. Start a timer on the dashboard
2. Navigate to the solo session page
3. Verify timer continues at 1 second per second (not 2)
4. Navigate back to dashboard
5. Verify timer state is consistent
6. Test pause/resume functionality across pages

### Future Improvements

1. **Session persistence**: Could add server-side session storage
2. **Multiple timers**: Could extend to support multiple concurrent timers
3. **Timer history**: Could add timer completion history tracking
4. **Settings sync**: Could sync timer settings across devices

### Technical Notes

- Uses Zustand for state management (consistent with existing app architecture)
- Maintains backward compatibility with localStorage format
- Preserves all existing functionality (music player integration, notifications, etc.)
- Handles edge cases like page refresh and browser close


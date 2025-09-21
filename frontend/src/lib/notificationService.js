// Notification Service for Pomate
// Handles both in-tab and background notifications via Service Worker

class NotificationService {
  constructor() {
    this.isServiceWorkerReady = false;
    this.registration = null;
    this.init();
  }

  async init() {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      
      // Wait for service worker to be ready
      if (this.registration.installing) {
        await new Promise(resolve => {
          this.registration.installing.addEventListener('statechange', () => {
            if (this.registration.installing.state === 'installed') {
              resolve();
            }
          });
        });
      }
      
      this.isServiceWorkerReady = true;
      console.log('Service Worker ready');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async requestPermission() {
    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(title, options = {}) {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('Cannot show notification: permission denied');
      return;
    }

    const defaultOptions = {
      body: '',
      icon: '/pixel tomato.png',
      badge: '/pixel tomato.png',
      requireInteraction: true,
      tag: 'pomate-timer'
    };

    const notificationOptions = { ...defaultOptions, ...options };

    // Try to use service worker for background notifications
    if (this.isServiceWorkerReady && this.registration && this.registration.active) {
      try {
        // Send message to service worker
        this.registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          ...notificationOptions
        });
        console.log('Notification sent to service worker');
        return;
      } catch (error) {
        console.warn('Failed to send notification via service worker:', error);
      }
    }

    // Fallback to regular notification (only works when tab is active)
    try {
      new Notification(title, notificationOptions);
      console.log('Notification shown (fallback)');
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Convenience methods for different notification types
  async showTimerCompleteNotification(sessionType) {
    const isWorkSession = sessionType === 'work';
    const title = isWorkSession ? 'Break Time! 🎉' : 'Break Over! 💪';
    const body = isWorkSession 
      ? 'Great work! Time for a break.' 
      : 'Ready for another productive work session?';

    await this.showNotification(title, {
      body,
      tag: `timer-complete-${sessionType}`,
      requireInteraction: true
    });
  }

  async showSessionCompletedNotification(sessionType) {
    const title = `${sessionType} session completed!`;
    const body = 'Time to take a break or start a new session.';
    
    await this.showNotification(title, {
      body,
      icon: '/pixel tomato.png',
      tag: 'session-completed',
      requireInteraction: true
    });
  }

  async showFocusReminderNotification() {
    await this.showNotification('Focus Time! 🎯', {
      body: 'Your focus session is starting. Time to concentrate!',
      tag: 'focus-reminder',
      requireInteraction: false
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;




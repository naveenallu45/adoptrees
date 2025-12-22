/**
 * Profile Update Event System
 * Allows components to listen for profile updates without full page refresh
 */

type ProfileUpdateEvent = {
  type: 'profile_updated' | 'image_updated' | 'name_updated';
  userId: string;
  data: {
    image?: string | null;
    name?: string;
    [key: string]: unknown;
  };
};

class ProfileUpdateEventEmitter {
  private listeners: Map<string, Set<(event: ProfileUpdateEvent) => void>> = new Map();

  /**
   * Subscribe to profile update events
   */
  subscribe(userId: string, callback: (event: ProfileUpdateEvent) => void): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const userListeners = this.listeners.get(userId);
      if (userListeners) {
        userListeners.delete(callback);
        if (userListeners.size === 0) {
          this.listeners.delete(userId);
        }
      }
    };
  }

  /**
   * Emit profile update event
   */
  emit(event: ProfileUpdateEvent): void {
    const userListeners = this.listeners.get(event.userId);
    if (userListeners) {
      userListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in profile update listener:', error);
        }
      });
    }
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const profileUpdateEmitter = new ProfileUpdateEventEmitter();

/**
 * Helper function to emit profile update events
 */
export function emitProfileUpdate(
  userId: string,
  type: ProfileUpdateEvent['type'],
  data: ProfileUpdateEvent['data']
): void {
  profileUpdateEmitter.emit({
    type,
    userId,
    data,
  });
}


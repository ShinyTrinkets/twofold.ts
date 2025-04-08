/**
 * A basic event structure.
 * Must contain a 'name' property to identify the event type.
 * Can include any other properties as payload.
 */
export interface IEvent {
  readonly name: string;
  [key: string]: any; // Allows arbitrary payload properties
}

/**
 * The contract for an event emitter.
 */
export interface IEventEmitter {
  /**
   * Registers a listener function to be called when an event with the specified name is emitted.
   * @param name - The name of the event to listen for.
   * @param listener - The function to call when the event is emitted.
   */
  on(name: string, listener: (event: IEvent) => void): void;

  /**
   * Removes a previously registered listener function for the specified event name.
   * The listener function must be the exact same reference as the one passed to `on`.
   * @param name - The name of the event the listener was registered for.
   * @param listener - The listener function to remove.
   */
  off(name: string, listener: (event: IEvent) => void): void;

  /**
   * Removes all listeners for a specific event name, or all listeners for all events
   * if no name is specified.
   * @param name - Optional. The name of the event to remove listeners for.
   */
  removeAllListeners(name?: string): void;

  /**
   * Emits an event, calling all registered listeners for that event's name in order of registration.
   * @param event - The event object to emit. Must contain a 'name' property.
   * @returns `true` if the event had listeners, `false` otherwise.
   */
  emit(event: IEvent): boolean;

  /**
   * Returns the number of listeners currently registered for a specific event name.
   * @param name - The name of the event.
   * @returns The number of listeners for the event name.
   */
  listenerCount(name: string): number;
}

/**
 * A class for managing and emitting events.
 */
export class EventEmitter implements IEventEmitter {
  // Use a Map where keys are event names and values are Sets of listener functions.
  // Sets provide efficient addition, deletion, and checking for existence,
  // and they iterate in insertion order in modern JS engines.
  private listeners = new Map<string, Set<(event: IEvent) => void>>();

  /**
   * Registers a listener for the given event name.
   * @param name The event name.
   * @param listener The callback function.
   */
  on(name: string, listener: (event: IEvent) => void): void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    this.listeners.get(name)!.add(listener);
  }

  /**
   * Removes a specific listener for the given event name.
   * @param name The event name.
   * @param listener The callback function to remove.
   */
  off(name: string, listener: (event: IEvent) => void): void {
    const eventListeners = this.listeners.get(name);
    if (eventListeners) {
      eventListeners.delete(listener);
      // Clean up the Map entry if no listeners remain for this event
      if (eventListeners.size === 0) {
        this.listeners.delete(name);
      }
    }
  }

  /**
   * Removes all listeners for a specific event, or all listeners entirely.
   * @param name Optional event name. If provided, removes listeners only for this event.
   */
  removeAllListeners(name?: string): void {
    if (name) {
      this.listeners.delete(name);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emits an event, triggering all associated listeners.
   * @param event The event object containing the name and any payload.
   * @returns True if any listeners were called, false otherwise.
   */
  emit(event: IEvent): boolean {
    const eventListeners = this.listeners.get(event.name);
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }

    // Convert to array to make a copy of the listeners
    for (const listener of Array.from(eventListeners)) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in listener for event "${event.name}":`, error);
      }
    }
    return true;
  }

  /**
   * Gets the number of listeners for a specific event name.
   * @param name The event name.
   * @returns The number of listeners.
   */
  listenerCount(name: string): number {
    // Use optional chaining and nullish coalescing for concise check
    return this.listeners.get(name)?.size ?? 0;
  }
}

export const ee = new EventEmitter();

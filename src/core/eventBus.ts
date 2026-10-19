/**
 * RAWx Studio — Event Bus
 * Public API: eventBus.on(event, handler), eventBus.off(event, handler), eventBus.emit(event, payload)
 * Decoupled publish/subscribe architecture for studio modules and plugins.
 */

type EventHandler<T = any> = (payload: T) => void;

class StudioEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  emit<T = any>(event: string, payload?: T): void {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event "${event}":`, err);
        }
      });
    }
  }
}

export const eventBus = new StudioEventBus();

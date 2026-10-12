type Listener<T> = (payload: T) => void;

export class Emitter<T = void> {
  private readonly listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(payload: T): void {
    this.listeners.forEach((listener) => listener(payload));
  }
}

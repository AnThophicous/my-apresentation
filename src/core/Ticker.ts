export interface Tick {
  time: number;
  delta: number;
  frame: number;
}

type TickCallback = (tick: Tick) => void;

interface Subscriber {
  callback: TickCallback;
  priority: number;
}

const MAX_DELTA = 1 / 20;

export class Ticker {
  private readonly subscribers: Subscriber[] = [];
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private frame = 0;
  private running = false;

  constructor() {
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }

  add(callback: TickCallback, priority = 0): () => void {
    const subscriber = { callback, priority };
    this.subscribers.push(subscriber);
    this.subscribers.sort((a, b) => a.priority - b.priority);
    return () => this.subscribers.splice(this.subscribers.indexOf(subscriber), 1);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private readonly loop = (now: number): void => {
    if (!this.running) return;
    const delta = Math.min(MAX_DELTA, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.elapsed += delta;
    this.frame += 1;
    const tick = { time: this.elapsed, delta, frame: this.frame };
    for (const subscriber of this.subscribers) subscriber.callback(tick);
    this.frameId = requestAnimationFrame(this.loop);
  };
}

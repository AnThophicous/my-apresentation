import { formatIndex } from '@/core/math';

const SETTLE_DELAY = 650;

export class Loader {
  private readonly count: HTMLElement;
  private shown = 0;

  constructor(private readonly root: HTMLElement) {
    this.count = root.querySelector('.loader__count')!;
  }

  set(progress: number): void {
    this.shown = Math.max(this.shown, progress);
    this.root.style.setProperty('--load', this.shown.toFixed(3));
    this.count.textContent = formatIndex(Math.round(this.shown * 100), 3);
  }

  track(tasks: Promise<void>[]): Promise<void> {
    let settled = 0;
    return Promise.all(
      tasks.map((task) =>
        task.then(() => {
          settled += 1;
          this.set(settled / tasks.length);
        }),
      ),
    ).then(() => undefined);
  }

  finish(): Promise<void> {
    this.set(1);
    return new Promise((resolve) =>
      window.setTimeout(() => {
        document.body.classList.add('is-loaded');
        document.body.classList.remove('is-loading');
        resolve();
      }, SETTLE_DELAY),
    );
  }
}

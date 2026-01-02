/**
 * Simple timer utility for measuring operation duration
 */
export class Timer {
  private startTime = 0;

  start(): void {
    this.startTime = performance.now();
  }

  stop(): number {
    return Math.round(performance.now() - this.startTime);
  }

  format(ms: number): string {
    if (ms < 1000) return `${String(ms)}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }
}

/**
 * Create a new timer instance and start it
 */
export function createTimer(): Timer {
  const timer = new Timer();
  timer.start();
  return timer;
}

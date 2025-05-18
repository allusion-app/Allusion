/**
 * Used for debugging and performance measurement.
 * TimingManager is a utility class for measuring durations of labeled events.
 * It allows you to start and stop timers anywhere in your code, and log the duration.
 */
export class TimingManager {
  private static timings = new Map<string, number>();

  /**
   * Starts a timer for the given label.
   */
  static start(label: string): void {
    console.log(`%c[Timing] %c"${label}" starting timing.`, 'color: gray;', 'color: cyan;');
    this.timings.set(label, performance.now());
  }

  /**
   * Ends the timer for the given label and optionally logs the duration.
   * @param label The identifier for the timer to stop.
   * @returns The measured duration in milliseconds, or undefined if the timer was not started.
   */
  static end(label: string): number | undefined {
    const start = this.timings.get(label);
    if (start === undefined) {
      console.warn(`[TimingManager] No timer found for "${label}"`);
      return;
    }

    const duration = performance.now() - start;
    console.log(
      `%c[Timing] %c"${label}" took %c${duration.toFixed(2)} ms`,
      'color: gray;',
      'color: cyan;',
      'color: yellow;',
    );
    this.timings.delete(label);
    return duration;
  }

  /**
   * Checks if a timer exists for the given label.
   * If `endIfExists` is true and the timer exists, it ends and returns its duration.
   * @param label The identifier to check.
   * @param endIfExists If true, ends the timer if it exists.
   * @returns True if the timer exists (or existed), false otherwise. If ended, also logs the timing.
   */
  static has(label: string, endIfExists: false): boolean;
  static has(label: string, endIfExists: true): number | false;
  static has(label: string, endIfExists: boolean = false): boolean | number {
    const exists = this.timings.has(label);
    if (!exists) {
      return endIfExists ? false : false;
    }

    if (endIfExists) {
      return this.end(label) ?? false;
    }

    return true;
  }

  /**
   * Clears all active timers.
   */
  static clear(): void {
    this.timings.clear();
  }
}

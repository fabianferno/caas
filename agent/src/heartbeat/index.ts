export type EventChecker = () => Promise<string | null>;

export interface HeartbeatOptions {
  intervalMs: number;
  onEvent: (summary: string) => void;
}

export class Heartbeat {
  private checkers: EventChecker[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private opts: HeartbeatOptions;

  constructor(opts: HeartbeatOptions) {
    this.opts = opts;
  }

  registerChecker(checker: EventChecker): void {
    this.checkers.push(checker);
  }

  start(): void {
    this.timer = setInterval(() => this.check(), this.opts.intervalMs);
    console.log(`[heartbeat] Started (every ${this.opts.intervalMs / 1000}s)`);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async check(): Promise<void> {
    const events: string[] = [];
    for (const checker of this.checkers) {
      try {
        const result = await checker();
        if (result) events.push(result);
      } catch (err) {
        console.error("[heartbeat] Checker error:", err);
      }
    }
    if (events.length > 0) {
      this.opts.onEvent(events.join("\n"));
    }
  }
}

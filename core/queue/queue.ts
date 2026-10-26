// Chạy từng job một (render rất nặng). Job sau chờ job trước xong.
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private waiting = 0;

  get length(): number {
    return this.waiting;
  }

  push<T>(task: () => Promise<T>): Promise<T> {
    this.waiting++;
    const run = this.tail.then(task, task);
    this.tail = run.catch(() => undefined).finally(() => this.waiting--);
    return run;
  }
}

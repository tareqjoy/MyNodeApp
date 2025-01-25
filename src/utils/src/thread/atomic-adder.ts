export class AtomicAdder {
  private sharedBuffer: SharedArrayBuffer;
  private counter: BigInt64Array; // Use BigInt64Array for BigInt support

  constructor() {
    this.sharedBuffer = new SharedArrayBuffer(8); // 8 bytes for a 64-bit integer
    this.counter = new BigInt64Array(this.sharedBuffer);

    Atomics.store(this.counter, 0, BigInt(0));
  }

  public inc(value: number = 1) {
    Atomics.add(this.counter, 0, BigInt(value));
  }

  public getSum(): number {
    return Number(Atomics.load(this.counter, 0));
  }

  public reset() {
    Atomics.store(this.counter, 0, BigInt(0));
  }

  public getAndReset(): number {
    return Number(Atomics.exchange(this.counter, 0, BigInt(0)));
  }
}

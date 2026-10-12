export type Key = readonly [time: number, value: number];

export class Track {
  private readonly times: number[];
  private readonly values: number[];
  private readonly tangents: number[];

  constructor(keys: readonly Key[]) {
    this.times = keys.map(([time]) => time);
    this.values = keys.map(([, value]) => value);
    this.tangents = this.computeTangents();
  }

  sample(time: number): number {
    const { times, values, tangents } = this;
    const last = times.length - 1;
    if (time <= times[0]!) return values[0]!;
    if (time >= times[last]!) return values[last]!;
    let index = 0;
    while (time > times[index + 1]!) index += 1;
    const span = times[index + 1]! - times[index]!;
    const t = (time - times[index]!) / span;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * values[index]! +
      (t3 - 2 * t2 + t) * span * tangents[index]! +
      (-2 * t3 + 3 * t2) * values[index + 1]! +
      (t3 - t2) * span * tangents[index + 1]!
    );
  }

  private computeTangents(): number[] {
    const { times, values } = this;
    const count = times.length;
    const slopes = Array.from(
      { length: count - 1 },
      (_, i) => (values[i + 1]! - values[i]!) / (times[i + 1]! - times[i]!),
    );
    const tangents = Array.from({ length: count }, (_, i) => {
      if (i === 0) return slopes[0] ?? 0;
      if (i === count - 1) return slopes[count - 2] ?? 0;
      const before = slopes[i - 1]!;
      const after = slopes[i]!;
      return before * after <= 0 ? 0 : (before + after) / 2;
    });
    for (let i = 0; i < count - 1; i += 1) {
      const slope = slopes[i]!;
      if (slope === 0) {
        tangents[i] = 0;
        tangents[i + 1] = 0;
        continue;
      }
      const alpha = tangents[i]! / slope;
      const beta = tangents[i + 1]! / slope;
      const magnitude = alpha * alpha + beta * beta;
      if (magnitude > 9) {
        const scale = 3 / Math.sqrt(magnitude);
        tangents[i] = scale * alpha * slope;
        tangents[i + 1] = scale * beta * slope;
      }
    }
    return tangents;
  }
}

export const midiToFrequency = (note: number): number => 440 * Math.pow(2, (note - 69) / 12);

export const CALM_PROGRESSION: readonly (readonly number[])[] = [
  [50, 57, 61, 64, 69],
  [47, 54, 57, 62, 66],
  [43, 50, 54, 59, 64],
  [45, 52, 57, 61, 64],
];

export const TENSE_PROGRESSION: readonly (readonly number[])[] = [
  [38, 45, 51, 56, 58],
  [37, 44, 50, 55, 57],
  [36, 43, 49, 54, 56],
  [37, 44, 50, 55, 58],
];

export const PENTATONIC: readonly number[] = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86];

export function pentatonicNote(index: number): number {
  const length = PENTATONIC.length;
  return PENTATONIC[((index % length) + length) % length]!;
}

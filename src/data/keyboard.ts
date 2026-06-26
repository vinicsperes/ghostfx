export const WHITE_LAYOUT = [
  { key: "a", note: "C" },
  { key: "s", note: "D" },
  { key: "d", note: "E" },
  { key: "f", note: "F" },
  { key: "g", note: "G" },
  { key: "h", note: "A" },
  { key: "j", note: "B" },
  { key: "k", note: "C'" },
  { key: "l", note: "D'" },
] as const;

export const BLACK_LAYOUT = [
  { key: "w", after: 0, note: "C#" },
  { key: "e", after: 1, note: "D#" },
  { key: "t", after: 3, note: "F#" },
  { key: "y", after: 4, note: "G#" },
  { key: "u", after: 5, note: "A#" },
  { key: "o", after: 7, note: "C#'" },
  { key: "p", after: 8, note: "D#'" },
] as const;

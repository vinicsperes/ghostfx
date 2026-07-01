export const PRESETS = [
  { name: "GHOST", drive: 0.35, echo: 0.58, tone: 0.55, reverb: 0.78, flanger: 0.3, master: 0.85 },
  { name: "DOOM", drive: 0.72, echo: 0.1, tone: 0.36, reverb: 0.3, flanger: 0.12, master: 0.85 },
  { name: "FROST", drive: 0.0, echo: 0.2, tone: 0.8, reverb: 0.45, flanger: 0.75, master: 0.95 },
  { name: "HEAVY", drive: 0.92, echo: 0.04, tone: 0.48, reverb: 0.06, flanger: 0.0, master: 0.8 },
  { name: "HAZE", drive: 0.3, echo: 0.42, tone: 0.52, reverb: 0.82, flanger: 0.6, master: 0.72 },
] as const;

export const PALETTE = {
  bg: "#030308",
  pedal: "#1a1a1c",
  ink: "#e0e0ec",
  accent: "#20f040",
  cream: "#a8a8bc",
  metal: "#505060",
};

export const PRESET_META = [
  { color: "#20f040", word: "HAUNTED", chassis: "#0a0a10" },
  { color: "#7d22c4", word: "OCCULT", chassis: "#0a0412" },
  { color: "#a8c4dc", word: "GLACIER", chassis: "#080a10" },
  { color: "#e02828", word: "HOLLOW", chassis: "#0a0202" },
  { color: "#d46a9f", word: "ETHER", chassis: "#0c0510" },
] as const;

export const PRESET_TAGS = ["haunted", "abyssal", "glacial", "brutal", "dreamy"] as const;

export type CabProfile = {
  lowCut: number;
  bodyHz: number;
  bodyGain: number;
  presHz: number;
  presGain: number;
  topCut: number;
};

export const CABS: CabProfile[] = [
  { lowCut: 90, bodyHz: 110, bodyGain: 1.5, presHz: 2600, presGain: 2.5, topCut: 5500 },
  { lowCut: 80, bodyHz: 120, bodyGain: 3.0, presHz: 1500, presGain: 1.5, topCut: 4000 },
  { lowCut: 95, bodyHz: 100, bodyGain: 0.0, presHz: 3200, presGain: 2.0, topCut: 7000 },
  { lowCut: 115, bodyHz: 130, bodyGain: 2.0, presHz: 3400, presGain: 3.5, topCut: 5200 },
  { lowCut: 100, bodyHz: 110, bodyGain: 2.0, presHz: 1800, presGain: 1.0, topCut: 4600 },
];

export type ReverbProfile = {
  decay: number;
  predelay: number;
  tone: number;
  width: number;
};

export const REVERBS: ReverbProfile[] = [
  { decay: 3.4, predelay: 0.03, tone: 4200, width: 0.9 },
  { decay: 4.2, predelay: 0.05, tone: 2400, width: 0.85 },
  { decay: 2.4, predelay: 0.012, tone: 8000, width: 1.0 },
  { decay: 0.9, predelay: 0.008, tone: 5000, width: 0.5 },
  { decay: 3.8, predelay: 0.04, tone: 3600, width: 1.0 },
];

export const PRESETS = [
  { name: "GHOST",   drive: 0.55, echo: 0.48, tone: 0.50, reverb: 0.58, flanger: 0.45, master: 0.76 },
  { name: "DOOM",    drive: 0.66, echo: 0.16, tone: 0.56, reverb: 0.42, flanger: 0.32, master: 0.80 },
  { name: "FROST",   drive: 0.05, echo: 0.20, tone: 0.66, reverb: 0.34, flanger: 0.62, master: 0.95 },
  { name: "HEAVY",   drive: 0.85, echo: 0.08, tone: 0.40, reverb: 0.10, flanger: 0.00, master: 0.82 },
  { name: "HAZE",    drive: 0.50, echo: 0.35, tone: 0.52, reverb: 0.82, flanger: 0.70, master: 0.80 },
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
  { color: "#7d22c4", word: "OCCULT",  chassis: "#0a0412" },
  { color: "#a8c4dc", word: "GLACIER", chassis: "#080a10" },
  { color: "#e02828", word: "HOLLOW",  chassis: "#0a0202" },
  { color: "#d46a9f", word: "ETHER",   chassis: "#0c0510" },
] as const;

export const PRESET_TAGS = ["haunted", "abyssal", "glacial", "brutal", "dreamy"] as const;

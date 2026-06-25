export const PRESETS = [
  { name: "CLEAN",   drive: 0.06, echo: 0.12, tone: 0.70, reverb: 0.30, master: 0.80 },
  { name: "STATIC",  drive: 0.54, echo: 0.22, tone: 0.46, reverb: 0.12, master: 0.78 },
  { name: "HEAVY",   drive: 0.85, echo: 0.08, tone: 0.40, reverb: 0.10, master: 0.82 },
  { name: "FRUS",    drive: 0.04, echo: 0.30, tone: 0.85, reverb: 0.72, master: 0.82 },
  { name: "GHOST",   drive: 0.55, echo: 0.48, tone: 0.50, reverb: 0.58, master: 0.76 },
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
  { color: "#8a2be2", word: "OCCULT", chassis: "#09040e" },
  { color: "#cdd2da", word: "ASHEN",    chassis: "#0a0a0c" },
  { color: "#e02828", word: "HOLLOW",  chassis: "#0a0202" },
  { color: "#ff4a28", word: "PEPPER*", chassis: "#0d0402" },
  { color: "#20f040", word: "HAUNTED", chassis: "#0a0a10" },
] as const;

export const PRESET_TAGS = ["crystal", "grimy", "brutal", "cold", "haunted"] as const;

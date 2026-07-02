import type { DriveShape } from "../audio/dsp";

export const PRESETS = [
  { name: "GHOST", drive: 0.35, echo: 0.58, tone: 0.62, reverb: 0.78, mod: 0.3, master: 0.85 },
  { name: "DOOM", drive: 0.75, echo: 0.25, tone: 0.42, reverb: 0.35, mod: 0.1, master: 0.82 },
  { name: "FROST", drive: 0.25, echo: 0.35, tone: 0.8, reverb: 0.4, mod: 0.65, master: 0.95 },
  { name: "HEAVY", drive: 0.92, echo: 0.06, tone: 0.58, reverb: 0.08, mod: 0.0, master: 0.8 },
  { name: "HAZE", drive: 0.55, echo: 0.62, tone: 0.5, reverb: 0.85, mod: 0.7, master: 0.7 },
  { name: "FEVER", drive: 0.6, echo: 0.35, tone: 0.55, reverb: 0.5, mod: 0.55, master: 0.8 },
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
  { color: "#20f040", word: "HAUNTED", chassis: "#07120b" },
  { color: "#7d22c4", word: "OCCULT", chassis: "#0d0518" },
  { color: "#a8c4dc", word: "GLACIER", chassis: "#0a1018" },
  { color: "#e02828", word: "HOLLOW", chassis: "#120404" },
  { color: "#d46a9f", word: "ETHER", chassis: "#140812" },
  { color: "#f02a96", word: "DELIRIUM", chassis: "#150618" },
] as const;

export const PRESET_TAGS = [
  "haunted",
  "abyssal",
  "glacial",
  "brutal",
  "dreamy",
  "feverish",
] as const;

export const PRESET_INFO = [
  {
    blurb:
      "The house voice. Mid-pushed screamer drive into slow tape echoes, a hint of chorus and a wide haunted hall. Rolls back clean with your guitar volume.",
    circuit: "screamer drive → tape echo → slow chorus → hall reverb",
  },
  {
    blurb:
      "Low-tuned fuzz wall with a short, dark slapback and a cavern behind it. Chords collapse into sludge; single notes stay huge and heavy.",
    circuit: "vintage fuzz → dark slap delay → cavern reverb",
  },
  {
    blurb:
      "Glassy clean platform with lush chorus — the funky clean rig. Crystal delay and a bright open verb keep every note articulate.",
    circuit: "clean boost → chorus → crystal delay → plate reverb",
  },
  {
    blurb:
      "Scooped rectifier high-gain, tight and nearly dry. Percussive palm mutes, saturated leads — the amp-on-eleven preset.",
    circuit: "rectifier drive → tight slap delay → small room",
  },
  {
    blurb:
      "Shoegaze weather system. Smooth drive drowned in long saturating echoes, deep wide chorus and a reverb that never quite ends.",
    circuit: "smooth drive → tape wash delay → wide chorus → cathedral reverb",
  },
  {
    blurb:
      "Octave-up fuzz that rings like a circuit about to give up. High notes scream the upper octave; chords smear into ring-mod delirium.",
    circuit: "octave fuzz → mid delay → fast wobble → dark reverb",
  },
] as const;

export type DriveProfile = {
  shape: DriveShape;
  preHp: number;
  midHz: number;
  midGain: number;
  trim: number;
};

export const DRIVES: DriveProfile[] = [
  { shape: "screamer", preHp: 140, midHz: 700, midGain: 2, trim: 2.7 },
  { shape: "fuzz", preHp: 80, midHz: 450, midGain: 3, trim: 0.25 },
  { shape: "clean", preHp: 120, midHz: 2200, midGain: 2.5, trim: 3.8 },
  { shape: "rectifier", preHp: 180, midHz: 850, midGain: -2, trim: 0.33 },
  { shape: "smooth", preHp: 100, midHz: 550, midGain: 2, trim: 0.95 },
  { shape: "octafuzz", preHp: 110, midHz: 1200, midGain: 2, trim: 0.95 },
];

export type DelayProfile = {
  timeMin: number;
  timeMax: number;
  fbMin: number;
  fbMax: number;
  loopHp: number;
  loopLp: number;
  sat: number;
};

export const DELAYS: DelayProfile[] = [
  { timeMin: 0.3, timeMax: 0.6, fbMin: 0.25, fbMax: 0.7, loopHp: 180, loopLp: 2800, sat: 1.3 },
  { timeMin: 0.08, timeMax: 0.16, fbMin: 0.1, fbMax: 0.45, loopHp: 150, loopLp: 2200, sat: 1.5 },
  { timeMin: 0.12, timeMax: 0.3, fbMin: 0.15, fbMax: 0.5, loopHp: 200, loopLp: 5500, sat: 1.1 },
  { timeMin: 0.1, timeMax: 0.35, fbMin: 0.1, fbMax: 0.4, loopHp: 220, loopLp: 3000, sat: 1.2 },
  { timeMin: 0.35, timeMax: 0.75, fbMin: 0.35, fbMax: 0.8, loopHp: 160, loopLp: 1800, sat: 1.7 },
  { timeMin: 0.18, timeMax: 0.42, fbMin: 0.2, fbMax: 0.6, loopHp: 200, loopLp: 2400, sat: 1.5 },
];

export type ModProfile = {
  rate: number;
  base: number;
  depthMin: number;
  depthMax: number;
  fbMax: number;
  mixMax: number;
  damp: number;
};

export const MODS: ModProfile[] = [
  {
    rate: 0.25,
    base: 0.0025,
    depthMin: 0.0003,
    depthMax: 0.0015,
    fbMax: 0.25,
    mixMax: 0.35,
    damp: 2800,
  },
  {
    rate: 0.12,
    base: 0.003,
    depthMin: 0.0002,
    depthMax: 0.001,
    fbMax: 0.15,
    mixMax: 0.3,
    damp: 2200,
  },
  {
    rate: 0.55,
    base: 0.006,
    depthMin: 0.0008,
    depthMax: 0.0028,
    fbMax: 0,
    mixMax: 0.5,
    damp: 6000,
  },
  {
    rate: 0.8,
    base: 0.002,
    depthMin: 0.0002,
    depthMax: 0.0012,
    fbMax: 0.3,
    mixMax: 0.3,
    damp: 3500,
  },
  { rate: 0.9, base: 0.007, depthMin: 0.001, depthMax: 0.0035, fbMax: 0, mixMax: 0.55, damp: 4000 },
  {
    rate: 1.3,
    base: 0.004,
    depthMin: 0.0008,
    depthMax: 0.003,
    fbMax: 0.15,
    mixMax: 0.45,
    damp: 3200,
  },
];

export type CabProfile = {
  lowCut: number;
  bodyHz: number;
  bodyGain: number;
  presHz: number;
  presGain: number;
  topCut: number;
};

export const CABS: CabProfile[] = [
  { lowCut: 90, bodyHz: 110, bodyGain: 1.5, presHz: 2600, presGain: 3.0, topCut: 5500 },
  { lowCut: 80, bodyHz: 120, bodyGain: 3.0, presHz: 1500, presGain: 2.5, topCut: 4800 },
  { lowCut: 95, bodyHz: 100, bodyGain: 0.0, presHz: 3200, presGain: 3.0, topCut: 8500 },
  { lowCut: 115, bodyHz: 130, bodyGain: 2.0, presHz: 3400, presGain: 4.5, topCut: 5200 },
  { lowCut: 100, bodyHz: 110, bodyGain: 2.0, presHz: 1800, presGain: 1.5, topCut: 4600 },
  { lowCut: 100, bodyHz: 150, bodyGain: 2.0, presHz: 2200, presGain: 3.0, topCut: 5000 },
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
  { decay: 2.8, predelay: 0.02, tone: 3000, width: 0.95 },
];

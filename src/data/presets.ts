import type { DriveShape } from "../audio/dsp";

export const PRESETS = [
  { name: "GHOST", drive: 0.52, echo: 0.3, tone: 0.58, reverb: 0.35, mod: 0.18, master: 0.85 },
  { name: "DOOM", drive: 0.62, echo: 0.2, tone: 0.4, reverb: 0.45, mod: 0.05, master: 0.82 },
  { name: "FROST", drive: 0.25, echo: 0.35, tone: 0.8, reverb: 0.4, mod: 0.65, master: 0.95 },
  { name: "HEAVY", drive: 0.88, echo: 0.08, tone: 0.6, reverb: 0.15, mod: 0.0, master: 0.8 },
  { name: "SMOKE", drive: 0.42, echo: 0.2, tone: 0.55, reverb: 0.32, mod: 0.3, master: 0.86 },
  { name: "FEVER", drive: 0.58, echo: 0.42, tone: 0.6, reverb: 0.4, mod: 0.15, master: 0.8 },
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
  { color: "#5468e0", word: "JUKE", chassis: "#06081c" },
  { color: "#f02a96", word: "DELIRIUM", chassis: "#150618" },
] as const;

export const CLEAN_RIG = -1;

export function rigMeta(idx: number): { color: string; name: string } {
  if (idx === CLEAN_RIG) return { color: PALETTE.cream, name: "CLEAN" };
  return { color: PRESET_META[idx].color, name: PRESETS[idx].name };
}

export const PRESET_TAGS = [
  "crunchy",
  "subterranean",
  "glacial",
  "brutal",
  "smoky",
  "soaring",
] as const;

export const PRESET_INFO = [
  {
    blurb:
      "The house voice, and the one to reach for first. A mid-pushed screamer sitting right at the edge of breakup: dig in and it bites, roll the guitar volume back and it goes clean under your hands.",
    circuit: "screamer drive → tape echo → hall reverb",
  },
  {
    blurb:
      "Sludge with a floor under it. A vintage fuzz with the bottom left open where the other rigs cut it, into a cavern. Riffs land like something heavy being dragged.",
    circuit: "vintage fuzz → dark slap → cavern reverb",
  },
  {
    blurb:
      "Glassy clean platform with lush chorus — the funky clean rig. Crystal delay and a bright open verb keep every note articulate.",
    circuit: "clean boost → chorus → crystal delay → plate reverb",
  },
  {
    blurb:
      "Thick Seattle sludge. Midrange forward gain with a dark, woolly top and a fat low mid punch, saturated but still reading your pick attack. Chords ring out heavy instead of collapsing.",
    circuit: "mid-pushed high gain → tight slap → dark room",
  },
  {
    blurb:
      "A small valve amp on the edge of breakup, mic'd up close in a back room. Plays soft and it stays clean, dig in and it growls with a warm second harmonic. Slapback and a slow throb behind it.",
    circuit: "tube drive → slapback → amp tremolo → spring",
  },
  {
    blurb:
      "The lead voice. A hard upper-mid bump so single notes cut through anything and a curve that sings instead of squashing, over repeats long enough to lean on.",
    circuit: "singing drive → mid bump → repeats → open plate",
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
  { shape: "screamer", preHp: 145, midHz: 800, midGain: 3, trim: 1.3 },
  { shape: "fuzz", preHp: 62, midHz: 420, midGain: 2, trim: 0.46 },
  { shape: "clean", preHp: 120, midHz: 2200, midGain: 2.5, trim: 3.8 },
  { shape: "rectifier", preHp: 125, midHz: 700, midGain: 3.5, trim: 0.32 },
  { shape: "tube", preHp: 100, midHz: 620, midGain: 2.5, trim: 0.75 },
  { shape: "smooth", preHp: 130, midHz: 1100, midGain: 5, trim: 0.63 },
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
  { timeMin: 0.25, timeMax: 0.5, fbMin: 0.15, fbMax: 0.5, loopHp: 240, loopLp: 3200, sat: 1.3 },
  { timeMin: 0.08, timeMax: 0.16, fbMin: 0.1, fbMax: 0.45, loopHp: 150, loopLp: 2200, sat: 1.5 },
  { timeMin: 0.12, timeMax: 0.3, fbMin: 0.15, fbMax: 0.5, loopHp: 200, loopLp: 5500, sat: 1.1 },
  { timeMin: 0.1, timeMax: 0.35, fbMin: 0.1, fbMax: 0.4, loopHp: 220, loopLp: 3000, sat: 1.2 },
  { timeMin: 0.075, timeMax: 0.19, fbMin: 0.03, fbMax: 0.28, loopHp: 220, loopLp: 2800, sat: 1.35 },
  { timeMin: 0.28, timeMax: 0.56, fbMin: 0.25, fbMax: 0.62, loopHp: 260, loopLp: 3400, sat: 1.25 },
];

export type ChorusProfile = {
  kind: "chorus";
  rate: number;
  base: number;
  depthMin: number;
  depthMax: number;
  fbMax: number;
  mixMax: number;
  damp: number;
};

export type TremoloProfile = {
  kind: "tremolo";
  rate: number;
  depth: number;
};

export type ModProfile = ChorusProfile | TremoloProfile;

export const MODS: ModProfile[] = [
  {
    kind: "chorus",
    rate: 0.25,
    base: 0.0025,
    depthMin: 0.0003,
    depthMax: 0.0015,
    fbMax: 0.25,
    mixMax: 0.35,
    damp: 2800,
  },
  {
    kind: "chorus",
    rate: 0.12,
    base: 0.003,
    depthMin: 0.0002,
    depthMax: 0.001,
    fbMax: 0.15,
    mixMax: 0.3,
    damp: 2200,
  },
  {
    kind: "chorus",
    rate: 0.55,
    base: 0.006,
    depthMin: 0.0008,
    depthMax: 0.0028,
    fbMax: 0,
    mixMax: 0.5,
    damp: 6000,
  },
  {
    kind: "chorus",
    rate: 0.8,
    base: 0.002,
    depthMin: 0.0002,
    depthMax: 0.0012,
    fbMax: 0.3,
    mixMax: 0.3,
    damp: 3500,
  },
  {
    kind: "tremolo",
    rate: 4.6,
    depth: 0.45,
  },
  {
    kind: "chorus",
    rate: 1.8,
    base: 0.004,
    depthMin: 0.0006,
    depthMax: 0.003,
    fbMax: 0.15,
    mixMax: 0.45,
    damp: 3400,
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
  { lowCut: 88, bodyHz: 125, bodyGain: 2.2, presHz: 2800, presGain: 3.0, topCut: 6000 },
  { lowCut: 68, bodyHz: 92, bodyGain: 4.5, presHz: 1400, presGain: 1.5, topCut: 4200 },
  { lowCut: 95, bodyHz: 100, bodyGain: 0.0, presHz: 3200, presGain: 3.0, topCut: 8500 },
  { lowCut: 85, bodyHz: 170, bodyGain: 4.5, presHz: 2600, presGain: 4.0, topCut: 5400 },
  { lowCut: 78, bodyHz: 145, bodyGain: 3.2, presHz: 2200, presGain: 2.2, topCut: 5200 },
  { lowCut: 110, bodyHz: 210, bodyGain: 1.0, presHz: 2400, presGain: 3.5, topCut: 5400 },
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
  { decay: 1.4, predelay: 0.012, tone: 4000, width: 0.65 },
  { decay: 1.9, predelay: 0.016, tone: 4600, width: 0.55 },
  { decay: 2.8, predelay: 0.022, tone: 5200, width: 1.0 },
];

export type SendProfile = {
  lowCut: number;
};

export const SENDS: SendProfile[] = [
  { lowCut: 170 },
  { lowCut: 90 },
  { lowCut: 120 },
  { lowCut: 120 },
  { lowCut: 200 },
  { lowCut: 300 },
];

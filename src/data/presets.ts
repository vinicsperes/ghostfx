import type { DriveShape } from "../audio/dsp";

export const PALETTE = {
  bg: "#030308",
  pedal: "#1a1a1c",
  ink: "#e0e0ec",
  accent: "#20f040",
  cream: "#a8a8bc",
  metal: "#505060",
};

export const CLEAN_RIG = -1;

export type RigKnobs = {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  mod: number;
  master: number;
};

export type DriveProfile = {
  shape: DriveShape;
  preHp: number;
  midHz: number;
  midGain: number;
  trim: number;
};

export type DelayProfile = {
  timeMin: number;
  timeMax: number;
  fbMin: number;
  fbMax: number;
  loopHp: number;
  loopLp: number;
  sat: number;
};

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

export type CabProfile = {
  lowCut: number;
  bodyHz: number;
  bodyGain: number;
  presHz: number;
  presGain: number;
  topCut: number;
};

export type ReverbProfile = {
  decay: number;
  predelay: number;
  tone: number;
  width: number;
};

export type SendProfile = {
  lowCut: number;
};

export type RigVisual = {
  pickguard: { top: string; mid: string; base: string; screw: string };
  knobTheme: "dark" | "cream";
  silk: string;
  ink: string;
  knobAccent: string;
  showArc: boolean;
};

export type RigBg = "ghost" | "doom" | "frost" | "heavy" | "smoke" | "fever";

export type Rig = {
  name: string;
  tag: string;
  word: string;
  color: string;
  chassis: string;
  blurb: string;
  circuit: string;
  bg: RigBg;
  bgOpacity: number;
  knobs: RigKnobs;
  drive: DriveProfile;
  delay: DelayProfile;
  mod: ModProfile;
  cab: CabProfile;
  reverb: ReverbProfile;
  send: SendProfile;
  visual: RigVisual;
};

export const RIGS: Rig[] = [
  {
    name: "GHOST",
    tag: "crunchy",
    word: "HAUNTED",
    color: "#20f040",
    chassis: "#07120b",
    blurb:
      "The house voice, and the one to reach for first. A mid-pushed screamer sitting right at the edge of breakup: dig in and it bites, roll the guitar volume back and it goes clean under your hands.",
    circuit: "screamer drive → tape echo → hall reverb",
    bg: "ghost",
    bgOpacity: 0.7,
    knobs: { drive: 0.52, echo: 0.3, tone: 0.58, reverb: 0.35, mod: 0.18, master: 0.85 },
    drive: { shape: "screamer", preHp: 145, midHz: 800, midGain: 3, trim: 1.01 },
    delay: {
      timeMin: 0.25,
      timeMax: 0.5,
      fbMin: 0.15,
      fbMax: 0.5,
      loopHp: 240,
      loopLp: 3200,
      sat: 1.3,
    },
    mod: {
      kind: "chorus",
      rate: 0.25,
      base: 0.0025,
      depthMin: 0.0003,
      depthMax: 0.0015,
      fbMax: 0.25,
      mixMax: 0.35,
      damp: 2800,
    },
    cab: { lowCut: 88, bodyHz: 125, bodyGain: 2.2, presHz: 2800, presGain: 3.0, topCut: 6000 },
    reverb: { decay: 3.4, predelay: 0.03, tone: 4200, width: 0.9 },
    send: { lowCut: 170 },
    visual: {
      pickguard: { top: "#0a0a0e", mid: "#1a3520", base: "#06060a", screw: "#3a3a48" },
      knobTheme: "dark",
      silk: "#20f040",
      ink: "#e0e0ec",
      knobAccent: "#16a030",
      showArc: false,
    },
  },
  {
    name: "DOOM",
    tag: "subterranean",
    word: "OCCULT",
    color: "#7d22c4",
    chassis: "#0d0518",
    blurb:
      "Sludge with a floor under it. A vintage fuzz with the bottom left open where the other rigs cut it, into a cavern. Riffs land like something heavy being dragged.",
    circuit: "vintage fuzz → dark slap → cavern reverb",
    bg: "doom",
    bgOpacity: 0.65,
    knobs: { drive: 0.62, echo: 0.2, tone: 0.4, reverb: 0.45, mod: 0.05, master: 0.85 },
    drive: { shape: "fuzz", preHp: 62, midHz: 420, midGain: 2, trim: 0.46 },
    delay: {
      timeMin: 0.08,
      timeMax: 0.16,
      fbMin: 0.1,
      fbMax: 0.45,
      loopHp: 150,
      loopLp: 2200,
      sat: 1.5,
    },
    mod: {
      kind: "chorus",
      rate: 0.12,
      base: 0.003,
      depthMin: 0.0002,
      depthMax: 0.001,
      fbMax: 0.15,
      mixMax: 0.3,
      damp: 2200,
    },
    cab: { lowCut: 68, bodyHz: 92, bodyGain: 4.5, presHz: 1400, presGain: 1.5, topCut: 4200 },
    reverb: { decay: 4.2, predelay: 0.05, tone: 2400, width: 0.85 },
    send: { lowCut: 90 },
    visual: {
      pickguard: { top: "#0a0612", mid: "#170926", base: "#050208", screw: "#2a1640" },
      knobTheme: "dark",
      silk: "#7d22c4",
      ink: "#e0d4f6",
      knobAccent: "#7d22c4",
      showArc: false,
    },
  },
  {
    name: "FROST",
    tag: "glacial",
    word: "GLACIER",
    color: "#a8c4dc",
    chassis: "#0a1018",
    blurb:
      "Glassy clean platform with lush chorus — the funky clean rig. Crystal delay and a bright open verb keep every note articulate.",
    circuit: "clean boost → chorus → crystal delay → plate reverb",
    bg: "frost",
    bgOpacity: 0.74,
    knobs: { drive: 0.25, echo: 0.35, tone: 0.8, reverb: 0.4, mod: 0.65, master: 0.85 },
    drive: { shape: "clean", preHp: 120, midHz: 2200, midGain: 2.5, trim: 2.63 },
    delay: {
      timeMin: 0.12,
      timeMax: 0.3,
      fbMin: 0.15,
      fbMax: 0.5,
      loopHp: 200,
      loopLp: 5500,
      sat: 1.1,
    },
    mod: {
      kind: "chorus",
      rate: 0.55,
      base: 0.006,
      depthMin: 0.0008,
      depthMax: 0.0028,
      fbMax: 0,
      mixMax: 0.5,
      damp: 6000,
    },
    cab: { lowCut: 95, bodyHz: 100, bodyGain: 0.0, presHz: 3200, presGain: 3.0, topCut: 8500 },
    reverb: { decay: 2.4, predelay: 0.012, tone: 8000, width: 1.0 },
    send: { lowCut: 120 },
    visual: {
      pickguard: { top: "#0a0c10", mid: "#141a22", base: "#050608", screw: "#2a3340" },
      knobTheme: "dark",
      silk: "#a8c4dc",
      ink: "#e8eef6",
      knobAccent: "#a8c4dc",
      showArc: false,
    },
  },
  {
    name: "HEAVY",
    tag: "brutal",
    word: "HOLLOW",
    color: "#e02828",
    chassis: "#120404",
    blurb:
      "Thick Seattle sludge. Midrange forward gain with a dark, woolly top and a fat low mid punch, saturated but still reading your pick attack. Chords ring out heavy instead of collapsing.",
    circuit: "mid-pushed high gain → tight slap → dark room",
    bg: "heavy",
    bgOpacity: 0.82,
    knobs: { drive: 0.88, echo: 0.08, tone: 0.6, reverb: 0.15, mod: 0.0, master: 0.85 },
    drive: { shape: "rectifier", preHp: 125, midHz: 700, midGain: 3.5, trim: 0.4 },
    delay: {
      timeMin: 0.1,
      timeMax: 0.35,
      fbMin: 0.1,
      fbMax: 0.4,
      loopHp: 220,
      loopLp: 3000,
      sat: 1.2,
    },
    mod: {
      kind: "chorus",
      rate: 0.8,
      base: 0.002,
      depthMin: 0.0002,
      depthMax: 0.0012,
      fbMax: 0.3,
      mixMax: 0.3,
      damp: 3500,
    },
    cab: { lowCut: 85, bodyHz: 170, bodyGain: 4.5, presHz: 2600, presGain: 4.0, topCut: 5400 },
    reverb: { decay: 1.4, predelay: 0.012, tone: 4000, width: 0.65 },
    send: { lowCut: 120 },
    visual: {
      pickguard: { top: "#0a0a0e", mid: "#180808", base: "#06060a", screw: "#2a1010" },
      knobTheme: "dark",
      silk: "#e02828",
      ink: "#f0b0b0",
      knobAccent: "#cc2020",
      showArc: false,
    },
  },
  {
    name: "SMOKE",
    tag: "smoky",
    word: "JUKE",
    color: "#5468e0",
    chassis: "#06081c",
    blurb:
      "A small valve amp on the edge of breakup, mic'd up close in a back room. Plays soft and it stays clean, dig in and it growls with a warm second harmonic. Slapback and a slow throb behind it.",
    circuit: "tube drive → slapback → amp tremolo → spring",
    bg: "smoke",
    bgOpacity: 0.8,
    knobs: { drive: 0.5, echo: 0.2, tone: 0.6, reverb: 0.32, mod: 0.3, master: 0.85 },
    drive: { shape: "tube", preHp: 100, midHz: 1100, midGain: 4, trim: 0.69 },
    delay: {
      timeMin: 0.075,
      timeMax: 0.19,
      fbMin: 0.03,
      fbMax: 0.28,
      loopHp: 220,
      loopLp: 2800,
      sat: 1.35,
    },
    mod: { kind: "tremolo", rate: 4.6, depth: 0.45 },
    cab: { lowCut: 78, bodyHz: 145, bodyGain: 3.2, presHz: 2600, presGain: 3.5, topCut: 6000 },
    reverb: { decay: 1.9, predelay: 0.016, tone: 4600, width: 0.55 },
    send: { lowCut: 200 },
    visual: {
      pickguard: { top: "#05060f", mid: "#12163a", base: "#020308", screw: "#242a5c" },
      knobTheme: "dark",
      silk: "#5468e0",
      ink: "#d2d8ff",
      knobAccent: "#4050c0",
      showArc: false,
    },
  },
  {
    name: "FEVER",
    tag: "soaring",
    word: "DELIRIUM",
    color: "#f02a96",
    chassis: "#150618",
    blurb:
      "The lead voice. A hard upper-mid bump so single notes cut through anything and a curve that sings instead of squashing, over repeats long enough to lean on.",
    circuit: "singing drive → mid bump → repeats → open plate",
    bg: "fever",
    bgOpacity: 0.82,
    knobs: { drive: 0.58, echo: 0.42, tone: 0.6, reverb: 0.4, mod: 0.15, master: 0.85 },
    drive: { shape: "smooth", preHp: 130, midHz: 1100, midGain: 5, trim: 0.79 },
    delay: {
      timeMin: 0.28,
      timeMax: 0.56,
      fbMin: 0.25,
      fbMax: 0.62,
      loopHp: 260,
      loopLp: 3400,
      sat: 1.25,
    },
    mod: {
      kind: "chorus",
      rate: 1.8,
      base: 0.004,
      depthMin: 0.0006,
      depthMax: 0.003,
      fbMax: 0.15,
      mixMax: 0.45,
      damp: 3400,
    },
    cab: { lowCut: 110, bodyHz: 210, bodyGain: 1.0, presHz: 2400, presGain: 3.5, topCut: 5400 },
    reverb: { decay: 2.8, predelay: 0.022, tone: 5200, width: 1.0 },
    send: { lowCut: 300 },
    visual: {
      pickguard: { top: "#0f0614", mid: "#210a26", base: "#070310", screw: "#3c1648" },
      knobTheme: "dark",
      silk: "#f02a96",
      ink: "#f8c8e6",
      knobAccent: "#d8228a",
      showArc: false,
    },
  },
];

export function rigAt(idx: number | null): Rig {
  return RIGS[idx ?? 0] ?? RIGS[0];
}

export function rigMeta(idx: number): { color: string; name: string } {
  if (idx === CLEAN_RIG) return { color: PALETTE.cream, name: "CLEAN" };
  const rig = rigAt(idx);
  return { color: rig.color, name: rig.name };
}

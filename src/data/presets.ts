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

const INK_DARK = "#06080a";
const INK_LIGHT = "#f4f2ea";

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export function inkOn(hex: string): string {
  const bg = luminance(hex) + 0.05;
  const ratio = (ink: string) => {
    const fg = luminance(ink) + 0.05;
    return fg > bg ? fg / bg : bg / fg;
  };
  return ratio(INK_DARK) >= ratio(INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

export type RigKnobs = {
  drive: number;
  echo: number;
  tone: number;
  reverb: number;
  mod: number;
  master: number;
};

export type Stage2 = {
  shape: DriveShape;
  gain: number;
  amount: number;
  hp: number;
  lp: number;
};

export type DriveProfile = {
  shape: DriveShape;
  preHp: number;
  midHz: number;
  midGain: number;
  trim: number;
  stage2?: Stage2;
};

export type DelayProfile = {
  timeMin: number;
  timeMax: number;
  fbMin: number;
  fbMax: number;
  loopHp: number;
  loopLp: number;
  sat: number;
  spread: number;
  bounce: number;
  wet: number;
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
  wet: number;
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

export type CompProfile = {
  threshold: number;
  ratio: number;
  speed: number;
  makeup: number;
};

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
  comp: CompProfile;
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
    drive: {
      shape: "screamer",
      preHp: 145,
      midHz: 800,
      midGain: 3,
      trim: 0.8,
      stage2: { shape: "screamer", gain: 1.7, amount: 0.34, hp: 180, lp: 6000 },
    },
    comp: { threshold: -23, ratio: 2.2, speed: 11, makeup: 2 },
    delay: {
      timeMin: 0.25,
      timeMax: 0.62,
      fbMin: 0.2,
      fbMax: 0.66,
      loopHp: 180,
      loopLp: 3200,
      sat: 1.3,
      spread: 0.7,
      bounce: 0.5,
      wet: 0.6,
    },
    mod: {
      kind: "chorus",
      rate: 0.32,
      base: 0.006,
      depthMin: 0.0018,
      depthMax: 0.0055,
      fbMax: 0.18,
      mixMax: 0.5,
      damp: 3600,
    },
    cab: { lowCut: 88, bodyHz: 125, bodyGain: 2.2, presHz: 2800, presGain: 3.0, topCut: 6000 },
    reverb: { decay: 3.4, predelay: 0.03, tone: 4200, width: 0.9 },
    send: { lowCut: 170, wet: 0.7 },
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
    drive: {
      shape: "fuzz",
      preHp: 62,
      midHz: 420,
      midGain: 2,
      trim: 0.46,
    },
    comp: { threshold: -25, ratio: 2.6, speed: 7, makeup: 3 },
    delay: {
      timeMin: 0.1,
      timeMax: 0.28,
      fbMin: 0.14,
      fbMax: 0.46,
      loopHp: 150,
      loopLp: 1800,
      sat: 1.5,
      spread: 0.7,
      bounce: 0.5,
      wet: 0.32,
    },
    mod: {
      kind: "chorus",
      rate: 0.18,
      base: 0.007,
      depthMin: 0.0012,
      depthMax: 0.0042,
      fbMax: 0.14,
      mixMax: 0.24,
      damp: 2000,
    },
    cab: { lowCut: 54, bodyHz: 105, bodyGain: 5.5, presHz: 1900, presGain: 2.5, topCut: 4800 },
    reverb: { decay: 3.0, predelay: 0.04, tone: 2200, width: 0.8 },
    send: { lowCut: 90, wet: 0.55 },
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
    comp: { threshold: -28, ratio: 3.5, speed: 14, makeup: 4.5 },
    delay: {
      timeMin: 0.16,
      timeMax: 0.46,
      fbMin: 0.16,
      fbMax: 0.52,
      loopHp: 240,
      loopLp: 5500,
      sat: 1.1,
      spread: 1.0,
      bounce: 0.5,
      wet: 0.5,
    },
    mod: {
      kind: "chorus",
      rate: 0.5,
      base: 0.008,
      depthMin: 0.0025,
      depthMax: 0.0082,
      fbMax: 0.12,
      mixMax: 0.68,
      damp: 5200,
    },
    cab: { lowCut: 95, bodyHz: 100, bodyGain: 0.0, presHz: 3200, presGain: 3.0, topCut: 8500 },
    reverb: { decay: 2.4, predelay: 0.012, tone: 8000, width: 1.0 },
    send: { lowCut: 120, wet: 0.68 },
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
    drive: {
      shape: "rectifier",
      preHp: 125,
      midHz: 700,
      midGain: 3.5,
      trim: 0.409,
      stage2: { shape: "rectifier", gain: 2.7, amount: 0.62, hp: 225, lp: 5400 },
    },
    comp: { threshold: -24, ratio: 3, speed: 16, makeup: 3 },
    delay: {
      timeMin: 0.1,
      timeMax: 0.4,
      fbMin: 0.1,
      fbMax: 0.55,
      loopHp: 200,
      loopLp: 3000,
      sat: 1.2,
      spread: 0.6,
      bounce: 0.75,
      wet: 0.5,
    },
    mod: { kind: "tremolo", rate: 6.2, depth: 0.62 },
    cab: { lowCut: 85, bodyHz: 170, bodyGain: 4.5, presHz: 2600, presGain: 4.0, topCut: 5400 },
    reverb: { decay: 1.4, predelay: 0.012, tone: 4000, width: 0.65 },
    send: { lowCut: 120, wet: 0.45 },
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
    drive: {
      shape: "tube",
      preHp: 100,
      midHz: 1100,
      midGain: 4,
      trim: 0.518,
      stage2: { shape: "tube", gain: 1.35, amount: 0.26, hp: 130, lp: 5800 },
    },
    comp: { threshold: -21, ratio: 2.1, speed: 9, makeup: 2 },
    delay: {
      timeMin: 0.09,
      timeMax: 0.3,
      fbMin: 0.12,
      fbMax: 0.5,
      loopHp: 170,
      loopLp: 2800,
      sat: 1.35,
      spread: 0.55,
      bounce: 0.66,
      wet: 0.38,
    },
    mod: { kind: "tremolo", rate: 4.4, depth: 0.4 },
    cab: { lowCut: 78, bodyHz: 145, bodyGain: 3.2, presHz: 2600, presGain: 3.5, topCut: 6000 },
    reverb: { decay: 1.9, predelay: 0.016, tone: 4600, width: 0.55 },
    send: { lowCut: 200, wet: 0.6 },
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
    tag: "snarling",
    word: "DELIRIUM",
    color: "#f02a96",
    chassis: "#150618",
    blurb:
      "A silicon clipper with the turbo stage engaged. Lows cut away before the diodes so nothing turns to mud, a fat honk parked in the upper mids, and clipping hard enough that the note squares off and hangs there. Chorus on the end, the way that pedal was always used.",
    circuit: "turbo silicon clipper → mid honk → slapback → chorus → tight room",
    bg: "fever",
    bgOpacity: 0.82,
    knobs: { drive: 0.72, echo: 0.16, tone: 0.58, reverb: 0.2, mod: 0.12, master: 0.85 },
    drive: {
      shape: "turbo",
      preHp: 120,
      midHz: 740,
      midGain: 4.5,
      trim: 0.722,
      stage2: { shape: "turbo", gain: 2.1, amount: 0.46, hp: 200, lp: 5000 },
    },
    comp: { threshold: -22, ratio: 2.2, speed: 14, makeup: 2.5 },
    delay: {
      timeMin: 0.14,
      timeMax: 0.42,
      fbMin: 0.14,
      fbMax: 0.58,
      loopHp: 200,
      loopLp: 2800,
      sat: 1.3,
      spread: 0.75,
      bounce: 0.5,
      wet: 0.46,
    },
    mod: {
      kind: "chorus",
      rate: 0.85,
      base: 0.009,
      depthMin: 0.0028,
      depthMax: 0.005,
      fbMax: 0.22,
      mixMax: 0.32,
      damp: 2800,
    },
    cab: { lowCut: 88, bodyHz: 360, bodyGain: 3.5, presHz: 2900, presGain: 3.5, topCut: 5800 },
    reverb: { decay: 1.6, predelay: 0.015, tone: 4200, width: 0.9 },
    send: { lowCut: 320, wet: 0.5 },
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

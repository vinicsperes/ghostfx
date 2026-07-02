export const PRESETS = [
  { name: "GHOST", drive: 0.35, echo: 0.58, tone: 0.55, reverb: 0.78, flanger: 0.3, master: 0.85 },
  { name: "DOOM", drive: 0.72, echo: 0.1, tone: 0.36, reverb: 0.3, flanger: 0.12, master: 0.85 },
  { name: "FROST", drive: 0.0, echo: 0.2, tone: 0.8, reverb: 0.45, flanger: 0.75, master: 0.95 },
  { name: "HEAVY", drive: 0.92, echo: 0.04, tone: 0.48, reverb: 0.06, flanger: 0.0, master: 0.8 },
  { name: "HAZE", drive: 0.3, echo: 0.42, tone: 0.52, reverb: 0.82, flanger: 0.6, master: 0.72 },
] as const;

import { shifted } from "./accent";
import type { DriveShape } from "../audio/dsp";

export const PALETTE = {
  bg: "#030308",
  pedal: "#1a1a1c",
  ink: "#e0e0ec",
  accent: shifted("#20f040"),
  cream: "#a8a8bc",
  metal: "#505060",
};

export const PRESET_META = [
  { color: shifted("#20f040"), word: "HAUNTED", chassis: "#0a0a10" },
  { color: "#7d22c4", word: "OCCULT", chassis: "#0a0412" },
  { color: "#a8c4dc", word: "GLACIER", chassis: "#080a10" },
  { color: "#e02828", word: "HOLLOW", chassis: "#0a0202" },
  { color: "#d46a9f", word: "ETHER", chassis: "#0c0510" },
] as const;

export const PRESET_TAGS = ["haunted", "abyssal", "glacial", "brutal", "dreamy"] as const;

export type DriveProfile = {
  shape: DriveShape;
  preHp: number;
  midHz: number;
  midGain: number;
};

export const DRIVES: DriveProfile[] = [
  { shape: "screamer", preHp: 140, midHz: 700, midGain: 2 },
  { shape: "fuzz", preHp: 80, midHz: 320, midGain: 1.5 },
  { shape: "clean", preHp: 120, midHz: 2200, midGain: 1.5 },
  { shape: "rectifier", preHp: 180, midHz: 950, midGain: 1.5 },
  { shape: "smooth", preHp: 100, midHz: 550, midGain: 2 },
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

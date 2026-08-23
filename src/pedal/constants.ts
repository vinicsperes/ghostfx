export const PEDAL_FONT = "/fonts/saira-800.woff";

export const PCB_BH = 0.05;
export const PCB_CU = "#d8ac46";
export const SILK = "#8c8c80";

export type PresetVisual = {
  pickguard: { top: string; mid: string; base: string; screw: string };
  knobTheme: "dark" | "cream";
  silk: string;
  ink: string;
  knobAccent: string;
  showArc: boolean;
};
export const PRESET_VISUALS: PresetVisual[] = [
  {
    pickguard: { top: "#0a0a0e", mid: "#1a3520", base: "#06060a", screw: "#3a3a48" },
    knobTheme: "dark",
    silk: "#20f040",
    ink: "#e0e0ec",
    knobAccent: "#16a030",
    showArc: false,
  },
  {
    pickguard: { top: "#0a0612", mid: "#170926", base: "#050208", screw: "#2a1640" },
    knobTheme: "dark",
    silk: "#7d22c4",
    ink: "#e0d4f6",
    knobAccent: "#7d22c4",
    showArc: false,
  },
  {
    pickguard: { top: "#0a0c10", mid: "#141a22", base: "#050608", screw: "#2a3340" },
    knobTheme: "dark",
    silk: "#a8c4dc",
    ink: "#e8eef6",
    knobAccent: "#a8c4dc",
    showArc: false,
  },
  {
    pickguard: { top: "#0a0a0e", mid: "#180808", base: "#06060a", screw: "#2a1010" },
    knobTheme: "dark",
    silk: "#e02828",
    ink: "#f0b0b0",
    knobAccent: "#cc2020",
    showArc: false,
  },
  {
    pickguard: { top: "#05060f", mid: "#12163a", base: "#020308", screw: "#242a5c" },
    knobTheme: "dark",
    silk: "#5468e0",
    ink: "#d2d8ff",
    knobAccent: "#4050c0",
    showArc: false,
  },
  {
    pickguard: { top: "#0f0614", mid: "#210a26", base: "#070310", screw: "#3c1648" },
    knobTheme: "dark",
    silk: "#f02a96",
    ink: "#f8c8e6",
    knobAccent: "#d8228a",
    showArc: false,
  },
];

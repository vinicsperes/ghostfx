import { useState } from "react";
import { PRESETS, PRESET_INFO, PRESET_TAGS } from "../data/presets";

export function PresetInfo({ presetIdx, accent }: { presetIdx: number | null; accent: string }) {
  const [open, setOpen] = useState(false);
  const idx = presetIdx ?? 0;
  const info = PRESET_INFO[idx];

  return (
    <div className="flex flex-col pointer-events-auto" style={{ gap: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2"
        style={{ cursor: "pointer" }}
        aria-expanded={open}
      >
        <div style={{ width: 8, height: 1, background: `${accent}99` }} />
        <span
          className="font-[var(--font-mono)] uppercase tracking-[0.35em]"
          style={{ fontSize: 9, color: `${accent}99` }}
        >
          About · {PRESETS[idx].name}
        </span>
        <span
          style={{
            fontSize: 8,
            color: `${accent}99`,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 160ms ease",
          }}
        >
          ▶
        </span>
        <div style={{ flex: 1, height: 1, background: `${accent}30` }} />
      </button>

      {open && (
        <div
          className="flex flex-col"
          style={{
            gap: 10,
            padding: "12px 14px",
            borderRadius: 7,
            border: `1px solid ${accent}25`,
            background: `${accent}08`,
          }}
        >
          <span
            className="font-[var(--font-mono)] uppercase"
            style={{ fontSize: 9, letterSpacing: "0.3em", color: accent }}
          >
            {PRESET_TAGS[idx]}
          </span>
          <p
            className="font-[var(--font-mono)] leading-relaxed"
            style={{ fontSize: 11, color: "#aaaac4", margin: 0 }}
          >
            {info.blurb}
          </p>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span
              className="font-[var(--font-mono)] uppercase tracking-[0.25em]"
              style={{ fontSize: 8, color: "rgba(170,170,196,0.5)" }}
            >
              Circuit
            </span>
            <span
              className="font-[var(--font-mono)] uppercase"
              style={{ fontSize: 9.5, letterSpacing: "0.06em", color: `${accent}cc` }}
            >
              {info.circuit}
            </span>
          </div>
          <span
            className="hidden lg:block font-[var(--font-mono)] uppercase"
            style={{ fontSize: 8.5, letterSpacing: "0.12em", color: "rgba(170,170,196,0.45)" }}
          >
            Tip: keys 1–6 switch presets
          </span>
        </div>
      )}
    </div>
  );
}

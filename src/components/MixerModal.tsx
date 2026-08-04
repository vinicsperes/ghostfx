import { useEffect } from "react";
import { ChannelStrip } from "./ChannelStrip";
import { ToolPanel } from "./ToolPanel";

type KnobId = "drive" | "echo" | "tone" | "reverb" | "mod" | "master";

const STRIPS: { id: KnobId; label: string }[] = [
  { id: "drive", label: "DRV" },
  { id: "echo", label: "ECHO" },
  { id: "tone", label: "TONE" },
  { id: "reverb", label: "RVB" },
  { id: "mod", label: "MOD" },
  { id: "master", label: "VOL" },
];

export function MixerModal({
  levels,
  onKnobChange,
  accent,
  onClose,
}: {
  levels: Record<KnobId, number>;
  onKnobChange: (id: KnobId, value: number) => void;
  accent: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ToolPanel title="Signal" accent={accent} onClose={onClose} width={340}>
      <div className="flex items-end justify-between" style={{ padding: "18px 20px 20px" }}>
        {STRIPS.map((s) => (
          <ChannelStrip
            key={s.id}
            label={s.label}
            value={levels[s.id]}
            accent={accent}
            highlight={s.id === "master"}
            onChange={(v) => onKnobChange(s.id, v)}
            height={150}
          />
        ))}
      </div>
    </ToolPanel>
  );
}

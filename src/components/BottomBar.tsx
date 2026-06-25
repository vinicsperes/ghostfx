import { PRESET_META, PRESETS, PRESET_TAGS } from "../data/presets";
import { PresetCard } from "./PresetCard";

export function BottomBar({
  presets, activePresetIdx, onPresetSelect,
}: {
  presets: typeof PRESETS;
  activePresetIdx: number | null;
  onPresetSelect: (i: number) => void;
}) {
  return (
    <div
      className="hidden lg:flex fixed top-0 left-[360px] right-0 z-[40] pointer-events-auto items-stretch"
      style={{ padding: "16px max(28px,2.2vw) 8px", gap: 12 }}
    >
      {presets.map((p, i) => (
        <PresetCard
          key={i}
          name={p.name}
          tag={PRESET_TAGS[i]}
          color={PRESET_META[i].color}
          isActive={activePresetIdx === i}
          onSelect={() => onPresetSelect(i)}
        />
      ))}
    </div>
  );
}

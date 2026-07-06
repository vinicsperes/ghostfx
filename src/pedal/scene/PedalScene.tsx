import { useState } from "react";
import { PedalBody } from "./PedalBody";

export function PedalScene({
  palette,
  xray = false,
  explode = 0,
  circuitOnly = false,
  split = false,
  spin = null,
  hideTag = false,
  ledColor,
  ledActive,
  onTap,
  onStomp,
  knobDrive,
  knobEcho,
  knobTone,
  knobReverb,
  knobMod,
  knobMaster,
  onKnobChange,
  setControlsEnabled,
  bootTrigger,
  presetIdx = null,
  onChassisEnter,
  onChassisLeave,
}: {
  palette: { pedal: string; ink: string; accent: string; cream: string; metal: string };
  xray?: boolean;
  explode?: number;
  circuitOnly?: boolean;
  split?: boolean;
  spin?: number | null;
  hideTag?: boolean;
  ledColor: string;
  ledActive: boolean;
  onTap: () => void;
  onStomp: () => void;
  knobDrive: number;
  knobEcho: number;
  knobTone: number;
  knobReverb: number;
  knobMod: number;
  knobMaster: number;
  onKnobChange: (
    knob: "drive" | "echo" | "tone" | "reverb" | "mod" | "master",
    value: number,
  ) => void;
  setControlsEnabled: (enabled: boolean) => void;
  bootTrigger: number;
  presetIdx?: number | null;
  onChassisEnter: () => void;
  onChassisLeave: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <PedalBody
      palette={palette}
      xray={xray}
      explode={explode}
      circuitOnly={circuitOnly}
      split={split}
      spin={spin}
      hideTag={hideTag}
      presetIdx={presetIdx}
      ledColor={ledColor}
      ledActive={ledActive}
      knobDrive={knobDrive}
      knobEcho={knobEcho}
      knobTone={knobTone}
      knobReverb={knobReverb}
      knobMod={knobMod}
      knobMaster={knobMaster}
      onKnobChange={onKnobChange}
      setControlsEnabled={setControlsEnabled}
      bootTrigger={bootTrigger}
      onChassisEnter={onChassisEnter}
      onChassisLeave={onChassisLeave}
      pressed={pressed}
      onPress={() => {
        setPressed(true);
        onStomp();
      }}
      onRelease={() => {
        if (pressed) {
          setPressed(false);
          onTap();
        }
      }}
      onCancel={() => setPressed(false)}
    />
  );
}

import { SideHint } from "./SideHint";

export function HintSystem({ accent }: { accent: string }) {
  return (
    <group>
      <SideHint
        label="DRAG KNOBS"
        labelPos={[2.4, 0.9, -0.8]}
        targetPos={[0.72, 0.58, -1.0]}
        accent={accent}
      />
      <SideHint
        label="STOMP"
        labelPos={[1.4, 1.1, 1.3]}
        targetPos={[0.22, 0.82, 1.05]}
        accent={accent}
      />
      <SideHint
        label="ROTATE"
        labelPos={[-1.7, 0.8, 0.4]}
        targetPos={[-1.08, 0.2, 0.3]}
        accent={accent}
        alignRight
      />
    </group>
  );
}

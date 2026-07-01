import { PCB_BH } from "../constants";
import { PCBBoard } from "./PCBBoard";

export function Internals({ width, length }: { width: number; length: number; height: number }) {
  const PCB_Y = -0.06;
  const PCB_W = width - 0.42;
  const PCB_L = length - 0.52;
  const PCB_ZOFF = 0.17;

  return (
    <group>
      <group position={[0, PCB_Y, PCB_ZOFF]}>
        <PCBBoard w={PCB_W} l={PCB_L} />
        {(
          [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ] as const
        ).map(([sx, sz], j) => (
          <mesh
            key={j}
            position={[sx * (PCB_W / 2 - 0.07), PCB_BH / 2 + 0.11, sz * (PCB_L / 2 - 0.07)]}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
            <meshStandardMaterial color="#8a8a78" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

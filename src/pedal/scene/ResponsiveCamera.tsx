import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const STAGE_DESKTOP = { left: 0, top: 68, bottom: 224 };
const STAGE_MOBILE = { left: 0, top: 88, bottom: 150 };

export function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const inset = size.width >= 1024 ? STAGE_DESKTOP : STAGE_MOBILE;
    const stageW = size.width - inset.left;
    const stageH = size.height - inset.top - inset.bottom;
    camera.fov = size.width < 768 ? 48 : 34;
    camera.aspect = stageW / stageH;
    camera.setViewOffset(stageW, stageH, -inset.left, -inset.top, size.width, size.height);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

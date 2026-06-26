import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function ResponsiveCamera() {
  const { camera } = useThree();
  useEffect(() => {
    const update = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = window.innerWidth < 768 ? 48 : 34;
        camera.updateProjectionMatrix();
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [camera]);
  return null;
}

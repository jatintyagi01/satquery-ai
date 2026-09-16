import { useState, useEffect, useCallback } from "react";
import { clamp } from "../utils/mathUtils";

export function useGyroscope(enabled: boolean = true) {
  const [orientation, setOrientation] = useState<{ gamma: number; beta: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  const requestPermission = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      typeof (DeviceOrientationEvent as any)?.requestPermission === "function"
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === "granted") {
          setPermissionGranted(true);
        }
      } catch (err) {
        console.warn("DeviceOrientation permission error:", err);
      }
    } else {
      setPermissionGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // gamma: left-to-right (-90 to 90), beta: front-to-back (-180 to 180)
        const g = clamp(e.gamma, -30, 30);
        const b = clamp(e.beta - 45, -30, 30); // center around 45 deg resting posture
        setOrientation({ gamma: g, beta: b });
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [enabled, permissionGranted]);

  return { orientation, requestPermission };
}

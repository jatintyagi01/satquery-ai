import { useRef, useEffect, useCallback, RefObject } from "react";
import { TiltConfig } from "../types/card.types";
import { clamp, lerp } from "../utils/mathUtils";
import { useReducedMotion } from "./useReducedMotion";
import { useGyroscope } from "./useGyroscope";

const DEFAULT_CONFIG: Required<TiltConfig> = {
  maxTilt: 6,
  perspective: 1400,
  scale: 1.01,
  speed: 0.12,
  glare: true,
  glareOpacity: 0.12,
  gyroscope: true,
  disabled: false,
  parallax: true,
};

export function useTiltEffect(
  cardRef: RefObject<HTMLElement | null>,
  customConfig?: TiltConfig
) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const reducedMotion = useReducedMotion();
  const { orientation } = useGyroscope(config.gyroscope && !config.disabled && !reducedMotion);

  // Target values set by pointer/gyroscope
  const target = useRef({
    rx: 0,
    ry: 0,
    scale: 1,
    mx: 50,
    my: 50,
    isHovered: false,
  });

  // Current values interpolated via requestAnimationFrame
  const current = useRef({
    rx: 0,
    ry: 0,
    scale: 1,
    mx: 50,
    my: 50,
  });

  const rafId = useRef<number | null>(null);
  const boundsRef = useRef<DOMRect | null>(null);

  // The animation loop interpolates current towards target using lerp
  const animate = useCallback(() => {
    const el = cardRef.current;
    if (!el || config.disabled || reducedMotion) return;

    const t = target.current;
    const c = current.current;
    const factor = config.speed;

    c.rx = lerp(c.rx, t.rx, factor);
    c.ry = lerp(c.ry, t.ry, factor);
    c.scale = lerp(c.scale, t.scale, factor);
    c.mx = lerp(c.mx, t.mx, factor);
    c.my = lerp(c.my, t.my, factor);

    // Apply CSS custom properties to card element
    el.style.setProperty("--rx", `${c.rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${c.ry.toFixed(2)}deg`);
    el.style.setProperty("--sc", `${c.scale.toFixed(4)}`);
    el.style.setProperty("--mx", `${c.mx.toFixed(2)}%`);
    el.style.setProperty("--my", `${c.my.toFixed(2)}%`);
    el.style.setProperty("--perspective", `${config.perspective}px`);

    // Parallax depth calculations for nested layers
    if (config.parallax) {
      const pxX = (c.ry / config.maxTilt) * 12;
      const pxY = (c.rx / config.maxTilt) * -12;
      el.style.setProperty("--px-x", `${pxX.toFixed(2)}px`);
      el.style.setProperty("--px-y", `${pxY.toFixed(2)}px`);
    }

    // Dynamic shadow offset calculation
    const shadowX = ((c.ry / config.maxTilt) * -16).toFixed(2);
    const shadowY = ((c.rx / config.maxTilt) * 16 + (t.isHovered ? 20 : 8)).toFixed(2);
    const shadowBlur = (t.isHovered ? 36 : 16).toFixed(2);
    el.style.setProperty("--sh-x", `${shadowX}px`);
    el.style.setProperty("--sh-y", `${shadowY}px`);
    el.style.setProperty("--sh-blur", `${shadowBlur}px`);

    // Continue loop if active or still interpolating back to neutral
    const isSettled =
      Math.abs(c.rx - t.rx) < 0.05 &&
      Math.abs(c.ry - t.ry) < 0.05 &&
      Math.abs(c.scale - t.scale) < 0.002;

    if (t.isHovered || !isSettled) {
      rafId.current = requestAnimationFrame(animate);
    } else {
      rafId.current = null;
      el.style.removeProperty("will-change");
    }
  }, [cardRef, config, reducedMotion]);

  const startLoop = useCallback(() => {
    if (!rafId.current) {
      if (cardRef.current) {
        cardRef.current.style.willChange = "transform, box-shadow";
      }
      rafId.current = requestAnimationFrame(animate);
    }
  }, [animate, cardRef]);

  // Handle pointer enter
  const onPointerEnter = useCallback(() => {
    if (config.disabled || reducedMotion || !cardRef.current) return;
    boundsRef.current = cardRef.current.getBoundingClientRect();
    target.current.isHovered = true;
    target.current.scale = config.scale;
    startLoop();
  }, [config, reducedMotion, cardRef, startLoop]);

  // Handle pointer move
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (config.disabled || reducedMotion || !cardRef.current) return;
      if (!boundsRef.current) {
        boundsRef.current = cardRef.current.getBoundingClientRect();
      }

      const rect = boundsRef.current;
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);

      // Tilt X is driven by Y coordinate (tilts backward when cursor is at top)
      target.current.rx = (y - 0.5) * -2 * config.maxTilt;
      // Tilt Y is driven by X coordinate (tilts right when cursor is at right)
      target.current.ry = (x - 0.5) * 2 * config.maxTilt;
      target.current.mx = x * 100;
      target.current.my = y * 100;

      startLoop();
    },
    [config, reducedMotion, cardRef, startLoop]
  );

  // Handle pointer leave
  const onPointerLeave = useCallback(() => {
    if (config.disabled || reducedMotion) return;
    target.current.isHovered = false;
    target.current.rx = 0;
    target.current.ry = 0;
    target.current.scale = 1;
    target.current.mx = 50;
    target.current.my = 50;
    boundsRef.current = null;
    startLoop();
  }, [config, reducedMotion, startLoop]);

  // Touch drag support
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (config.disabled || reducedMotion || !cardRef.current) return;
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      boundsRef.current = cardRef.current.getBoundingClientRect();
      target.current.isHovered = true;
      target.current.scale = config.scale;
      startLoop();
    },
    [config, reducedMotion, cardRef, startLoop]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (config.disabled || reducedMotion || !cardRef.current || !touchStartPos.current) return;
      const touch = e.touches[0];
      const rect = boundsRef.current || cardRef.current.getBoundingClientRect();
      const deltaX = (touch.clientX - touchStartPos.current.x) / (rect.width / 2);
      const deltaY = (touch.clientY - touchStartPos.current.y) / (rect.height / 2);

      target.current.ry = clamp(deltaX * config.maxTilt, -config.maxTilt, config.maxTilt);
      target.current.rx = clamp(-deltaY * config.maxTilt, -config.maxTilt, config.maxTilt);
      target.current.mx = clamp(50 + deltaX * 40, 0, 100);
      target.current.my = clamp(50 + deltaY * 40, 0, 100);
      startLoop();
    },
    [config, reducedMotion, cardRef, startLoop]
  );

  const onTouchEnd = useCallback(() => {
    touchStartPos.current = null;
    onPointerLeave();
  }, [onPointerLeave]);

  // Gyroscope tilt updates when available and not hovered
  useEffect(() => {
    if (orientation && !target.current.isHovered && !config.disabled && !reducedMotion) {
      target.current.ry = (orientation.gamma / 30) * config.maxTilt;
      target.current.rx = (orientation.beta / 30) * config.maxTilt;
      target.current.mx = 50 + (orientation.gamma / 30) * 35;
      target.current.my = 50 + (orientation.beta / 30) * 35;
      startLoop();
    }
  }, [orientation, config, reducedMotion, startLoop]);

  // Keyboard navigation support
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (config.disabled || reducedMotion) return;
      let handled = false;

      if (e.key === "ArrowUp") {
        target.current.rx = config.maxTilt * 0.5;
        handled = true;
      } else if (e.key === "ArrowDown") {
        target.current.rx = -config.maxTilt * 0.5;
        handled = true;
      } else if (e.key === "ArrowLeft") {
        target.current.ry = -config.maxTilt * 0.5;
        handled = true;
      } else if (e.key === "ArrowRight") {
        target.current.ry = config.maxTilt * 0.5;
        handled = true;
      }

      if (handled) {
        target.current.isHovered = true;
        startLoop();
      }
    },
    [config, reducedMotion, startLoop]
  );

  const onKeyUp = useCallback(() => {
    onPointerLeave();
  }, [onPointerLeave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return {
    handlers: {
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onKeyDown,
      onKeyUp,
    },
    reducedMotion,
  };
}

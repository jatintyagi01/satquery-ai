import { useState, useEffect, useCallback, RefObject } from "react";

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useCardBounds(ref: RefObject<HTMLElement | null>) {
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const updateBounds = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setBounds({
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [ref]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBounds, 150);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateBounds]);

  return { bounds, updateBounds };
}

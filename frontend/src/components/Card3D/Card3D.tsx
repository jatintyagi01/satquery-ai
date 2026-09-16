import React, { forwardRef, useRef } from "react";
import { Card3DProps } from "./types/card.types";
import { useTiltEffect } from "./hooks/useTiltEffect";
import styles from "./styles/card3d.module.css";

export const Card3D = forwardRef<HTMLDivElement, Card3DProps>(
  (
    {
      children,
      config,
      className = "",
      style,
      as: Component = "div",
      role = "region",
      ...rest
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDivElement | null>(null);
    const targetRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    const { handlers, reducedMotion } = useTiltEffect(targetRef, config);

    return (
      <Component
        ref={targetRef}
        role={role}
        tabIndex={0}
        className={`panel rounded-md ${styles.cardRoot} ${className}`}
        style={style}
        {...handlers}
        {...rest}
      >
        {/* Specular Glare Layer */}
        {!reducedMotion && config?.glare !== false && (
          <div className={styles.glareOverlay} aria-hidden="true" />
        )}

        {/* Dynamic Sweeping Border Glow */}
        {!reducedMotion && (
          <div className={styles.borderSweep} aria-hidden="true" />
        )}

        {/* Content Container */}
        <div className="relative z-10 w-full h-full">{children}</div>
      </Component>
    );
  }
);

Card3D.displayName = "Card3D";

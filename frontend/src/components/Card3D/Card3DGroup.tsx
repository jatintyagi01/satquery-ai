import React from "react";
import { Card3DGroupProps } from "./types/card.types";

export const Card3DGroup: React.FC<Card3DGroupProps> = ({
  children,
  perspective = 1000,
  className = "",
  style,
  ...rest
}) => {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{
        perspective: `${perspective}px`,
        transformStyle: "preserve-3d",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

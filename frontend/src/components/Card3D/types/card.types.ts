export interface TiltValues {
  rotateX: number;
  rotateY: number;
  scale: number;
  glareX: number;
  glareY: number;
  shadowX: number;
  shadowY: number;
  isHovered: boolean;
}

export interface TiltConfig {
  maxTilt?: number;            // default 15 deg
  perspective?: number;        // default 1000px
  scale?: number;              // default 1.025
  speed?: number;              // lerp factor (default 0.1)
  glare?: boolean;             // default true
  glareOpacity?: number;       // default 0.15
  gyroscope?: boolean;         // default true
  disabled?: boolean;          // default false
  parallax?: boolean;          // default true
}

export interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  config?: TiltConfig;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  role?: string;
}

export interface Card3DGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  perspective?: number;
  className?: string;
}

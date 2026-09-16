import React from "react";
import { Card3D } from "../Card3D";
import styles from "../styles/card3d.module.css";
import { TiltConfig } from "../types/card.types";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  config?: TiltConfig;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  tag,
  ctaText,
  onCtaClick,
  config,
  className = "",
}) => {
  return (
    <Card3D config={config} className={`p-6 flex flex-col justify-between ${className}`}>
      {/* Background/Midground Content */}
      <div className={styles.layerContent}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FFDBBB]/10 text-[#FFDBBB] border border-[#FFDBBB]/20">
            {icon}
          </div>
          {tag && (
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border bg-[#8FAF8A]/10 text-[#8FAF8A] border-[#8FAF8A]/20">
              {tag}
            </span>
          )}
        </div>

        <h3 className="text-[18px] font-bold text-[#F0E4D8] mb-2">{title}</h3>
        <p className="text-[13px] text-[#CCBEB1] leading-relaxed mb-6">{description}</p>
      </div>

      {/* Foreground Interactive CTA */}
      {ctaText && (
        <div className={`mt-auto ${styles.layerForeground}`}>
          <button
            onClick={onCtaClick}
            className="w-full py-2.5 px-4 rounded font-semibold text-[13px] transition-all bg-[#FFDBBB] text-[#1A1410] hover:bg-[#F5CFA8] flex items-center justify-center gap-2"
          >
            {ctaText}
          </button>
        </div>
      )}
    </Card3D>
  );
};

import React from "react";

interface OkurLabLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

/**
 * Ultra-Clean Minimalist "OkurLab" Logo:
 * A warm terracotta (#B85D3B) squircle emblem featuring two pure, geometric
 * parchment book wings (#F6F1E7) that form a gentle V-cradle with a single
 * serene focal point floating above the spine — symbolizing both deep reading
 * and visual focus with zero visual clutter.
 */
export function OkurLabLogo({
  size = "md",
  showText = true,
  subtitle,
}: OkurLabLogoProps) {
  const boxClass =
    size === "sm"
      ? "w-9 h-9 rounded-xl"
      : size === "lg"
      ? "w-12 h-12 rounded-2xl"
      : "w-10 h-10 rounded-[14px]";

  const svgClass =
    size === "sm" ? "w-5 h-5" : size === "lg" ? "w-7 h-7" : "w-[22px] h-[22px]";

  return (
    <div className="flex items-center gap-3 select-none group">
      <div
        className={`${boxClass} relative bg-[#B85D3B] flex items-center justify-center shadow-sm border border-[#9E4C2E]/40 group-hover:bg-[#A65030] transition-all duration-300 shrink-0 overflow-hidden`}
      >
        {/* Subtle top-left warm highlight for tactile paper/ink depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/10 pointer-events-none" />

        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgClass} relative z-10`}
        >
          {/* Minimalist Open Book Wings (Clean Continuous Geometric Stroke) */}
          <path
            d="M5.5 11.5C9.2 11.5 13.2 13.1 16 16.2C18.8 13.1 22.8 11.5 26.5 11.5V22.2C22.8 22.2 18.8 23.6 16 26.5C13.2 23.6 9.2 22.2 5.5 22.2V11.5Z"
            fill="#F6F1E7"
            fillOpacity="0.16"
            stroke="#F6F1E7"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center Spine Accent */}
          <path
            d="M16 16.2V26.2"
            stroke="#F6F1E7"
            strokeWidth="2.1"
            strokeLinecap="round"
          />

          {/* Serene Floating Focus Point Above the Book Cradle */}
          <circle cx="16" cy="9.2" r="2.6" fill="#F6F1E7" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <div className="font-serif font-bold text-[21px] tracking-[-0.02em] flex items-baseline leading-none">
            <span className="text-foreground">Okur</span>
            <span className="text-[#B85D3B]">Lab</span>
          </div>
          {subtitle && (
            <p className="text-[11px] font-sans font-medium text-muted mt-1 leading-none tracking-tight">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

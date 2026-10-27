import React from "react";

interface OkurLabLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

/**
 * Minimalist "OkurLab" Logo:
 * A serene rounded square in Warm Terracotta (#B85D3B) & Botanical Sage (#4A5D4E)
 * containing an open book page and a soft focus ring in the center.
 * Brand wordmark: "Okur" in #2C2520 (Literata Serif Bold) + "Lab" in #B85D3B (Terracotta).
 */
export function OculaLogo({
  size = "md",
  showText = true,
  subtitle,
}: OkurLabLogoProps) {
  const boxClass =
    size === "sm"
      ? "w-9 h-9 rounded-xl"
      : size === "lg"
      ? "w-13 h-13 rounded-2xl"
      : "w-10 h-10 rounded-xl";

  const svgClass =
    size === "sm" ? "w-6 h-6" : size === "lg" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className="flex items-center gap-3 select-none group">
      <div
        className={`${boxClass} relative bg-[#EFE8DA] flex items-center justify-center shadow-sm border border-[#DFD5C3] group-hover:border-[#B85D3B]/60 transition-all duration-300 shrink-0 overflow-hidden`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgClass} relative z-10`}
        >
          {/* Left & Right Open Book Pages */}
          <path
            d="M18 10.5C15.2 8.9 11.2 8.4 7.5 9.2C6.6 9.4 6 10.2 6 11.1V24.6C6 25.6 6.9 26.4 7.9 26.2C11.4 25.5 15.1 26 18 27.6C20.9 26 24.6 25.5 28.1 26.2C29.1 26.4 30 25.6 30 24.6V11.1C30 10.2 29.4 9.4 28.5 9.2C24.8 8.4 20.8 8.9 18 10.5Z"
            fill="#F6F1E7"
            stroke="#4A5D4E"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Book Spine Center Fold */}
          <path
            d="M18 10.8V27.2"
            stroke="#DFD5C3"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Soft Outer Focus Halo Ring */}
          <circle
            cx="18"
            cy="18.2"
            r="6.2"
            fill="#E6D2B5"
            fillOpacity="0.65"
            stroke="#B85D3B"
            strokeWidth="1.75"
          />

          {/* Inner Calm Focal Dot */}
          <circle cx="18" cy="18.2" r="2.1" fill="#B85D3B" />
        </svg>
      </div>

      {showText && (
        <div>
          <div className="font-serif font-bold text-xl tracking-tight flex items-baseline leading-none">
            <span className="text-foreground">Okur</span>
            <span className="text-[#B85D3B]">Lab</span>
          </div>
          {subtitle && (
            <p className="text-[11px] font-sans text-muted mt-1 leading-none tracking-tight">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export const OkurLabLogo = OculaLogo;

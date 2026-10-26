import React from "react";

interface KitUpLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

/**
 * Minimalist geometric logo for KitUp:
 * Combines open book pages ("Kit") seamlessly morphing into an upward velocity chevron ("Up")
 * with a crimson ORP (Optimal Recognition Point) focal dot at the apex.
 */
export function KitUpLogo({
  size = "md",
  showText = true,
  subtitle,
}: KitUpLogoProps) {
  const dimensions =
    size === "sm"
      ? "w-8 h-8 rounded-xl"
      : size === "lg"
      ? "w-12 h-12 rounded-2xl"
      : "w-10 h-10 rounded-xl";

  const svgSize =
    size === "sm" ? "w-5 h-5" : size === "lg" ? "w-7 h-7" : "w-6 h-6";

  return (
    <div className="flex items-center gap-3 select-none group">
      <div
        className={`${dimensions} bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-white/15 group-hover:scale-105 transition-transform shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={svgSize}
        >
          {/* Open Book Base Pages (Kit) */}
          <path
            d="M6 22.5L16 17.5L26 22.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.65"
          />
          {/* Rising Speed Chevron / Upper Book Wings (Up) */}
          <path
            d="M6 16.5L16 9.5L26 16.5"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Center Spine & Upward Trajectory Line */}
          <path
            d="M16 12V24"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          {/* ORP Red Focal Point at Apex */}
          <circle cx="16" cy="6.2" r="2.2" fill="#FB7185" />
        </svg>
      </div>

      {showText && (
        <div>
          <div className="font-extrabold text-lg tracking-tight flex items-center gap-1.5 leading-none">
            <span>Kit</span>
            <span className="-ml-1.5 text-indigo-400">Up</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              CLOUD
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted mt-1 leading-none">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

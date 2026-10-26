import React from "react";

interface OculaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

/**
 * Ocula Minimalist Optical Logo:
 * Inspired by "Oculus" (Eye / Foveal Lens).
 * Features a geometric outer eye contour, precision saccadic reticle ticks,
 * a concentric iris ring, and a glowing crimson ORP (fovea) center point.
 */
export function OculaLogo({
  size = "md",
  showText = true,
  subtitle,
}: OculaLogoProps) {
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
        className={`${boxClass} relative bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30 group-hover:border-indigo-400/60 group-hover:scale-105 transition-all duration-300 shrink-0 overflow-hidden`}
      >
        {/* Subtle inner ambient radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.35),transparent_70%)]" />

        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgClass} relative z-10`}
        >
          <defs>
            <linearGradient
              id="ocula-eye-stroke"
              x1="3"
              y1="18"
              x2="33"
              y2="18"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="50%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>

          {/* Outer Geometric Eye / Oculus Contour */}
          <path
            d="M3.5 18C6.8 11.2 12.1 7.8 18 7.8C23.9 7.8 29.2 11.2 32.5 18C29.2 24.8 23.9 28.2 18 28.2C12.1 28.2 6.8 24.8 3.5 18Z"
            stroke="url(#ocula-eye-stroke)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Precision Optical Reticle Ticks (Top, Bottom, Left, Right) */}
          <path
            d="M18 4.5V6.5M18 29.5V31.5M2 18H3.5M32.5 18H34"
            stroke="#818CF8"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />

          {/* Concentric Parafoveal Iris Ring */}
          <circle
            cx="18"
            cy="18"
            r="6.2"
            stroke="#A5B4FC"
            strokeWidth="1.6"
            strokeDasharray="28 6"
            className="group-hover:rotate-45 transition-transform duration-500 origin-center"
          />

          {/* Crimson Fovea / ORP Focal Core */}
          <circle cx="18" cy="18" r="2.7" fill="#F43F5E" />

          {/* Specular Lens Highlight */}
          <circle cx="20.2" cy="15.8" r="1" fill="#FFFFFF" fillOpacity="0.9" />
        </svg>
      </div>

      {showText && (
        <div>
          <div className="font-extrabold text-lg tracking-tight flex items-center gap-2 leading-none">
            <span className="bg-gradient-to-r from-foreground via-foreground to-indigo-400 bg-clip-text">
              Ocula
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              VISION
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted mt-1 leading-none tracking-tight">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

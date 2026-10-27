import React from "react";

interface OkurLabLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

/**
 * Botanical & Optical "OkurLab" Emblem Logo:
 * - Warm parchment rounded-square frame (#F2EBD9, border #D5C5AA)
 * - Layered open book pages in Deep Espresso (#382618)
 * - Rising Terracotta focal pin, center sun dot, and segmented concentric focus rings (#B85D3B / #C86D49)
 * - Graceful Botanical Olive/Sage stem with two leaves (#5A6340 / #6A744E) rising from the book spine
 * - Serif wordmark: "Okur" (bold espresso) + "Lab" (terracotta serif)
 */
export function OkurLabLogo({
  size = "md",
  showText = true,
  subtitle,
}: OkurLabLogoProps) {
  const boxClass =
    size === "sm"
      ? "w-10 h-10 rounded-[12px]"
      : size === "lg"
      ? "w-14 h-14 rounded-[16px]"
      : "w-11 h-11 rounded-[14px]";

  return (
    <div className="flex items-center gap-3 select-none group">
      <div
        className={`${boxClass} relative bg-[#F2EBD9] flex items-center justify-center shadow-sm border-[1.5px] border-[#D5C5AA] group-hover:border-[#B85D3B]/60 transition-all duration-300 shrink-0 overflow-hidden`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* ================= 1. TERRACOTTA FOCUS TARGET & STEM ================= */}
          {/* Vertical tapered stem rising from book spine to target */}
          <path
            d="M50 53L48.7 75.5L50 77L51.3 75.5L50 53Z"
            fill="#B85D3B"
          />
          <line
            x1="50"
            y1="52"
            x2="50"
            y2="75"
            stroke="#B85D3B"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Center Solid Terracotta Focal Dot */}
          <circle cx="50" cy="36.5" r="7.6" fill="#B85D3B" />

          {/* Inner Segmented Focus Ring (Left & Right Bottom Arcs) */}
          <path
            d="M38.5 36.5C38.5 42.2 42.6 46.9 48 47.8"
            stroke="#C96E48"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M61.5 36.5C61.5 42.2 57.4 46.9 52 47.8"
            stroke="#C96E48"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Outer Segmented Focus Halo (Left & Right Upper Arch) */}
          <path
            d="M31.8 38.5C31.4 28.8 38.4 20.4 47.8 19.2"
            stroke="#B85D3B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M68.2 38.5C68.6 28.8 61.6 20.4 52.2 19.2"
            stroke="#B85D3B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* ================= 2. BOTANICAL SAGE STEM & LEAVES ================= */}
          {/* Main curved stem rising from book spine up to the right */}
          <path
            d="M51.5 74.5C54.5 62 63.5 55.5 72.5 45.5C78.5 38.8 81.5 31 80.5 22"
            stroke="#5A6340"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Large Top-Left Leaf */}
          <path
            d="M80.2 33.5C82.5 21.5 76.5 11.5 63.5 9.5C67.5 15.5 67.8 23.5 74.2 29.5C76.5 31.6 78.8 32.8 80.2 33.5Z"
            fill="#5A6340"
          />

          {/* Secondary Right Leaf */}
          <path
            d="M76.5 41.2C84.2 37.5 90.2 30.2 91.5 21.8C85.2 24.2 81.2 29.2 79.8 34.8C79.1 37.5 77.9 39.8 76.5 41.2Z"
            fill="#68724B"
          />
          <path
            d="M72.5 45.5C77.5 40.5 82.5 34.5 85.5 28"
            stroke="#5A6340"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* ================= 3. LAYERED ESPRESSO OPEN BOOK ================= */}
          {/* Top Page Curves (Left & Right) */}
          <path
            d="M48.8 74.5C43.5 61.5 31.5 54 18.5 52.2L22.5 47.5"
            stroke="#382618"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M51.2 74.5C57.5 64 69.5 59.5 83.2 58.2L80.2 51.8"
            stroke="#382618"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Middle Page Curves (Left & Right) */}
          <path
            d="M48.5 76C40.5 67.5 27.5 63.5 11.5 63.2L16.2 54.5"
            stroke="#382618"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M51.5 76C59.5 68.5 72.5 65 88.5 65.5L85.2 59.8"
            stroke="#382618"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Solid Book Cover & Spine Cradle */}
          <path
            d="M8.5 71.5C22.5 69.8 37.5 72.5 44.5 79.2C46.2 81.2 48 82.2 50 82.2C52 82.2 53.8 81.2 55.5 79.2C62.5 72.5 77.5 69.8 91.5 71.5"
            stroke="#382618"
            strokeWidth="4.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <div className="font-serif text-[22px] tracking-[-0.02em] flex items-baseline leading-none">
            <span className="font-extrabold text-[#382618] dark:text-[#F2EBD9]">
              Okur
            </span>
            <span className="font-normal text-[#B85D3B]">Lab</span>
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

export const OculaLogo = OkurLabLogo;

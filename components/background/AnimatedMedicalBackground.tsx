"use client";

import React from "react";

/**
 * AnimatedMedicalBackground
 * 
 * Calm, luminous, living healthcare background inspired by the reference aesthetic:
 * - Almost-white base (#FFFFFF -> #F8FCFA -> #F1F8F4) with subtle mint atmosphere in corners.
 * - Maximum 4 translucent glass bubbles on desktop, 2 on mobile.
 * - At most 2 subtle flowing wave/ribbon layers with glowing white crest lines.
 * - 100% compositor-friendly CSS animations (transform/opacity), zero JS runtime loops.
 * - Fully non-interactive (pointer-events: none, z-index: 0) to preserve all UI interactions.
 */
export default function AnimatedMedicalBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{
        background:
          "linear-gradient(145deg, #ffffff 0%, #f9fcfb 38%, #f1f8f4 72%, #eaf4ee 100%)",
      }}
    >
      {/* Soft atmospheric ambient glow - lower left corner */}
      <div
        className="absolute -bottom-24 -left-24 h-[440px] w-[440px] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(185, 230, 210, 0.6) 0%, rgba(215, 242, 230, 0.25) 45%, transparent 70%)",
        }}
      />

      {/* Soft atmospheric ambient glow - top right corner */}
      <div
        className="absolute -top-20 -right-20 h-[380px] w-[380px] rounded-full blur-3xl opacity-35"
        style={{
          background:
            "radial-gradient(circle, rgba(200, 235, 222, 0.5) 0%, rgba(235, 249, 242, 0.2) 50%, transparent 70%)",
        }}
      />

      {/* ─── Wave Layer 1: Lower Sweeping Wave Ribbon ─── */}
      <div className="absolute inset-x-0 bottom-0 h-[260px] sm:h-[360px] lg:h-[440px] w-full overflow-hidden animated-bg-wave-lower">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 450"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lowerWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(190, 232, 212, 0.24)" />
              <stop offset="50%" stopColor="rgba(218, 244, 232, 0.14)" />
              <stop offset="100%" stopColor="rgba(240, 252, 246, 0.03)" />
            </linearGradient>
            <linearGradient id="lowerCrestGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
              <stop offset="25%" stopColor="rgba(255, 255, 255, 0.85)" />
              <stop offset="70%" stopColor="rgba(255, 255, 255, 0.75)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.3)" />
            </linearGradient>
          </defs>

          {/* Translucent Wave Body */}
          <path
            d="M0,190 C320,130 540,290 880,240 C1140,200 1320,130 1440,170 L1440,450 L0,450 Z"
            fill="url(#lowerWaveGrad)"
          />

          {/* Glowing Crest Highlight Line */}
          <path
            d="M0,190 C320,130 540,290 880,240 C1140,200 1320,130 1440,170"
            stroke="url(#lowerCrestGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Secondary delicate parallel contour line */}
          <path
            d="M0,220 C340,160 560,315 900,270 C1160,230 1330,160 1440,195"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ─── Wave Layer 2: Upper Right Delicate Ribbon ─── */}
      <div className="absolute top-0 right-0 h-[180px] sm:h-[260px] lg:h-[320px] w-[60%] max-w-[820px] overflow-hidden animated-bg-wave-upper">
        <svg
          className="w-full h-full"
          viewBox="0 0 800 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="upperWaveGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(205, 238, 222, 0.18)" />
              <stop offset="60%" stopColor="rgba(235, 250, 242, 0.08)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          {/* Translucent upper wave body */}
          <path
            d="M80,0 C280,130 500,60 800,150 L800,0 Z"
            fill="url(#upperWaveGrad)"
          />

          {/* Upper wave crest highlight */}
          <path
            d="M80,0 C280,130 500,60 800,150"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Single subtle gleam accent on the lower ribbon curve */}
      <span className="hidden sm:block absolute bottom-[32%] left-[22%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.85)] opacity-60 animated-soft-gleam" />

      {/* ─── Translucent Glass Bubbles (Strictly max 4 desktop, 2 mobile) ─── */}

      {/* Bubble 1: Large subtle bubble (bottom right, desktop only) */}
      <div className="hidden md:block absolute -bottom-14 -right-10 w-60 h-60 lg:w-72 lg:h-72 medical-glass-bubble bubble-float-1">
        {/* Specular curved reflection */}
        <span
          className="absolute top-[8%] left-[16%] w-[42%] h-[30%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 75%)",
            transform: "rotate(-25deg)",
          }}
        />
        {/* Ambient lower bounce reflection */}
        <span
          className="absolute bottom-[10%] right-[18%] w-[35%] h-[25%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 70%)",
          }}
        />
      </div>

      {/* Bubble 2: Medium bubble (mid left, responsive) */}
      <div className="absolute top-[32%] left-[4%] sm:left-[7%] w-16 h-16 sm:w-20 sm:h-20 medical-glass-bubble bubble-float-2">
        <span
          className="absolute top-[10%] left-[18%] w-[40%] h-[30%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 75%)",
            transform: "rotate(-25deg)",
          }}
        />
      </div>

      {/* Bubble 3: Small-medium bubble (upper right, responsive) */}
      <div className="absolute top-[14%] right-[10%] sm:right-[15%] w-12 h-12 sm:w-16 sm:h-16 medical-glass-bubble bubble-float-3">
        <span
          className="absolute top-[10%] left-[18%] w-[38%] h-[28%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 75%)",
            transform: "rotate(-25deg)",
          }}
        />
      </div>

      {/* Bubble 4: Small accent droplet (lower left, desktop only) */}
      <div className="hidden lg:block absolute bottom-[22%] left-[13%] w-8 h-8 medical-glass-bubble bubble-float-4">
        <span
          className="absolute top-[12%] left-[20%] w-[35%] h-[25%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 75%)",
            transform: "rotate(-25deg)",
          }}
        />
      </div>
    </div>
  );
}

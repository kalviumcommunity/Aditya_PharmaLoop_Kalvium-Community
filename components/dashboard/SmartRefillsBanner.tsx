import React from "react";
import Link from "next/link";

export default function SmartRefillsBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1b5e3b] via-[#1f6b43] to-[#154c30] p-6 sm:p-7 text-white shadow-md border border-emerald-600/30 mt-6 group">
      {/* Background Decorative Rings & Ambient Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl transition-all duration-500 group-hover:scale-110" />
      <div className="pointer-events-none absolute right-24 -bottom-16 h-48 w-48 rounded-full bg-emerald-300/15 blur-xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Text Content */}
        <div className="max-w-md space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md text-emerald-100 border border-white/20 shadow-xs">
            <span className="select-none">🌿</span>
            <span>Care on schedule</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-xs">
            Better Health with Smart Refills
          </h3>
          <p className="text-xs leading-relaxed text-emerald-100/90 font-normal">
            Never run out of your essential medicines. Set up auto-refills and let PharmaLoop take care of the rest.
          </p>
          <div className="pt-2">
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#1b5e3b] shadow-sm hover:bg-emerald-50 hover:shadow-md active:scale-[0.98] transition-all duration-200"
            >
              <span>Set Up Auto-Refills</span>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Decorative Pill/Medicine Graphic */}
        <div className="hidden sm:flex shrink-0 items-center justify-center pr-4">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-lg transition-transform duration-300 group-hover:scale-105">
            <span className="text-4xl select-none filter drop-shadow">💊</span>
            <div className="absolute -bottom-2 -left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-base shadow-md">
              🌿
            </div>
            <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-xs text-white font-bold shadow-md">
              ✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

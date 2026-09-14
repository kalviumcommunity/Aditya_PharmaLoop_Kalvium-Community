"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

export interface SubscriptionCardProps {
  id: string;
  title: string;
  dosage: string;
  category?: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "Active" | "Paused" | "Cancelled";
  frequency: string;
  nextRefillDate: string;
  autoPayStatus?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  pricePerRefill: string;
  imageUrl?: string | null;
  onPause?: () => void;
  onResume?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  loadingAction?: string | null;
}

/**
 * High-fidelity Medicine Packaging Visual matching the reference design.
 */
function MedicinePackagingVisual({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-2 border border-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  const lower = title.toLowerCase();

  // 1. Crocin / Paracetamol / Pain Relief box visual
  if (lower.includes("crocin") || lower.includes("paracetamol") || lower.includes("dolo")) {
    return (
      <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-[#eff8f2] p-2 border border-[#d8eee0]">
        <div className="relative w-16 h-12 sm:w-20 sm:h-14 bg-white rounded-lg border border-slate-200/90 shadow-xs flex flex-col justify-between p-1 overflow-hidden">
          <div className="h-2 bg-[#0284c7] -mx-1 -mt-1 flex items-center px-1">
            <span className="text-[5px] text-white font-bold tracking-tight">GSK</span>
          </div>
          <div className="text-center py-0.5">
            <div className="inline-block bg-[#0284c7] px-1.5 py-0.2 rounded-full">
              <span className="text-[9px] font-black text-white leading-none block">Crocin</span>
            </div>
            <span className="text-[7px] font-bold text-slate-500 block leading-none mt-0.5">650</span>
          </div>
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <span className="text-[5px] text-slate-400">15 Tab</span>
            <div className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-rose-500" />
              <span className="h-1 w-1 rounded-full bg-sky-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Vitamin D3 / Vitamins bottle or box visual
  if (lower.includes("vitamin") || lower.includes("d3") || lower.includes("calcium") || lower.includes("revital")) {
    return (
      <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-[#fefce8] p-2 border border-[#fef08a]/70">
        <div className="relative w-16 h-12 sm:w-20 sm:h-14 bg-white rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between p-1 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-500 -mx-1 -mt-1 flex items-center px-1">
            <span className="text-[5px] text-amber-950 font-bold tracking-tight">WELLNESS</span>
          </div>
          <div className="text-center py-0.5">
            <span className="text-[10px] font-black text-amber-600 leading-none block">D3</span>
            <span className="text-[6px] font-bold text-amber-800 block leading-none mt-0.5">1000 IU</span>
          </div>
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <span className="text-[5px] text-amber-700/80">60 Caps</span>
            <span className="text-[8px] leading-none text-amber-500">☀️</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Amoxicillin / Antibiotic box visual
  if (lower.includes("amoxicillin") || lower.includes("augmentin") || lower.includes("antibiotic")) {
    return (
      <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-[#f0f7ff] p-2 border border-[#d8e8fc]">
        <div className="relative w-16 h-12 sm:w-20 sm:h-14 bg-white rounded-lg border border-blue-200 shadow-xs flex flex-col justify-between p-1 overflow-hidden">
          <div className="h-2 bg-[#2563eb] -mx-1 -mt-1 flex items-center px-1">
            <span className="text-[5px] text-white font-bold tracking-tight">Rx ANTIBIOTIC</span>
          </div>
          <div className="text-center py-0.5">
            <span className="text-[8px] font-black text-[#1e40af] leading-none block">Amoxicillin</span>
            <span className="text-[6px] font-bold text-slate-500 block leading-none mt-0.5">500mg</span>
          </div>
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <span className="text-[5px] text-slate-400">10 Caps</span>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  // 4. Default clean pharmaceutical pack visual
  return (
    <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-[#f8fafc] p-2 border border-slate-200/80">
      <div className="relative w-16 h-12 sm:w-20 sm:h-14 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col items-center justify-center p-1 text-center">
        <span className="text-base">💊</span>
        <span className="text-[7px] font-bold text-slate-700 leading-tight mt-0.5 truncate max-w-full">
          {title.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}

export default function SubscriptionCard({
  id,
  title,
  dosage,
  category,
  status,
  frequency,
  nextRefillDate,
  autoPayStatus,
  paymentMethod = "Not set",
  deliveryAddress = "Not set",
  pricePerRefill,
  imageUrl,
  onPause,
  onResume,
  onSkip,
  onCancel,
  loadingAction,
}: SubscriptionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Normalize status
  const normalizedStatus = status.toUpperCase();
  const isActive = normalizedStatus === "ACTIVE";
  const isPaused = normalizedStatus === "PAUSED";
  const isCancelled = normalizedStatus === "CANCELLED";

  // Derive autoPay text if not explicitly provided
  const derivedAutoPay = autoPayStatus || (isActive ? "Enabled" : isPaused ? "Paused" : "Disabled");

  // Close 3-dots menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-md hover:border-emerald-200/50">
      {/* Top Header: Visual, Details, Price, 3-dots */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left Side: Thumbnail + Info */}
        <div className="flex items-start gap-4">
          <MedicinePackagingVisual title={title} imageUrl={imageUrl} />

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>

              {/* Status Badge */}
              {isActive && (
                <span className="rounded-full bg-[#e6f7ec] px-2.5 py-0.5 text-xs font-bold text-[#1b5e3b] border border-[#c3edd0] shadow-2xs">
                  Active
                </span>
              )}
              {isPaused && (
                <span className="rounded-full bg-[#fef9c3] px-2.5 py-0.5 text-xs font-bold text-[#b45309] border border-[#fef08a] shadow-2xs">
                  Paused
                </span>
              )}
              {isCancelled && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500 border border-slate-200 shadow-2xs">
                  Cancelled
                </span>
              )}

              {/* Frequency Badge */}
              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/50">
                {frequency}
              </span>
            </div>

            {/* Dosage / Pack details */}
            <p className="text-xs font-medium text-slate-500">
              {dosage}
            </p>

            {/* Category tag */}
            {category && (
              <div className="pt-0.5">
                <span className="inline-block rounded-md bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#0369a1]">
                  {category}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Price + 3-Dots Menu */}
        <div className="flex items-center sm:items-start justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-50 sm:border-t-0">
          <div className="text-left sm:text-right">
            <span className="text-base sm:text-lg font-black text-[#1b5e3b] tracking-tight">
              {pricePerRefill}
            </span>
          </div>

          {/* Three-Dot Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Subscription options"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="glass-panel modal-animate-in absolute right-0 top-full mt-1.5 w-48 rounded-2xl p-2 z-30 shadow-xl border border-slate-200/80 text-left">
                <Link
                  href={`/subscriptions/${id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/70 transition-colors"
                >
                  <span>🔍</span>
                  <span>View Details</span>
                </Link>

                <Link
                  href={`/subscriptions/${id}/schedule`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>📅</span>
                  <span>Change Refill Schedule</span>
                </Link>

                {isActive && onSkip && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSkip();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors text-left cursor-pointer"
                  >
                    <span>⏭️</span>
                    <span>Skip Next Refill</span>
                  </button>
                )}

                {isActive && onPause && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onPause();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors text-left cursor-pointer"
                  >
                    <span>⏸️</span>
                    <span>Pause Subscription</span>
                  </button>
                )}

                {isPaused && onResume && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onResume();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                  >
                    <span>▶️</span>
                    <span>Resume Subscription</span>
                  </button>
                )}

                <Link
                  href={`/subscriptions/${id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>✏️</span>
                  <span>Modify</span>
                </Link>

                {!isCancelled && onCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onCancel();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                  >
                    <span>❌</span>
                    <span>Cancel Subscription</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: 4 Metadata Columns matching reference design */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-50 pt-4">
        {/* Col 1: NEXT REFILL */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Next Refill
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{nextRefillDate}</span>
          </div>
        </div>

        {/* Col 2: AUTO-PAY */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Auto-Pay
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className={isActive ? "text-emerald-700 font-extrabold" : "text-slate-700"}>
              {isActive ? `✓ ${derivedAutoPay}` : derivedAutoPay}
            </span>
          </div>
        </div>

        {/* Col 3: PAYMENT */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Payment
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <svg className="h-3.5 w-3.5 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="truncate">{paymentMethod}</span>
          </div>
        </div>

        {/* Col 4: DELIVERY */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Delivery
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <svg className="h-3.5 w-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{deliveryAddress}</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/70 pt-4">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/subscriptions/${id}`}
            className="rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-sm active:scale-[0.98] transition-all inline-flex items-center justify-center"
          >
            View Details
          </Link>

          <Link
            href={`/subscriptions/${id}/schedule`}
            className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all inline-flex items-center justify-center"
          >
            Change Refill Schedule
          </Link>

          {isActive && onSkip && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onSkip}
              className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "skip" ? "Skipping..." : "Skip Refill"}
            </button>
          )}

          {isActive && onPause && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onPause}
              className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "pause" ? "Pausing..." : "Pause"}
            </button>
          )}

          {isPaused && onResume && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onResume}
              className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "resume" ? "Resuming..." : "Resume"}
            </button>
          )}

          <Link
            href={`/subscriptions/${id}`}
            className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all inline-flex items-center justify-center"
          >
            Modify
          </Link>
        </div>

        {/* Right Cancel Button */}
        {!isCancelled && onCancel && (
          <div>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onCancel}
              className="rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

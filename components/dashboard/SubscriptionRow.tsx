"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

export interface SubscriptionRowProps {
  id: string;
  title: string;
  details: string;
  frequency: string;
  nextRefill: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  iconType?: "pill" | "bottle" | "syringe";
  iconBg?: string;
  onActionSuccess?: () => void;
}

export default function SubscriptionRow({
  id,
  title,
  details,
  frequency,
  nextRefill,
  status,
  iconType = "pill",
  iconBg = "bg-[#ecf9f0]",
  onActionSuccess,
}: SubscriptionRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleAction = async (action: "pause" | "resume" | "cancel" | "skip") => {
    setLoadingAction(action);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setMenuOpen(false);
        onActionSuccess?.();
      } else {
        alert(data.error || "Failed to perform action");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
      {/* Left: Product Icon & Info */}
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} shrink-0`}>
          {iconType === "bottle" ? (
            <svg className="h-6 w-5" viewBox="0 0 48 56" fill="none">
              <rect x="19" y="8" width="10" height="5" rx="2" fill="#fbcfe8" />
              <rect x="21" y="13" width="6" height="3" fill="#f472b6" />
              <rect x="17" y="16" width="14" height="4" rx="1.5" fill="#fbcfe8" />
              <rect x="11" y="20" width="26" height="28" rx="6" fill="#f472b6" fillOpacity="0.8" />
              <path d="M24 28c-1.5 2-3 3.5-3 5a3 3 0 006 0c0-1.5-1.5-3-3-5z" fill="#ffffff" />
            </svg>
          ) : iconType === "syringe" ? (
            <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
              <g transform="rotate(-40 32 32)">
                <line x1="32" y1="8" x2="32" y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="29" y="16" width="6" height="3" fill="#60a5fa" />
                <rect x="27" y="19" width="10" height="24" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2" />
                <rect x="28.5" y="24" width="7" height="17" fill="#60a5fa" />
                <rect x="27" y="43" width="10" height="3" fill="#1e40af" />
                <rect x="30.5" y="46" width="3" height="8" fill="#3b82f6" />
                <rect x="24" y="54" width="16" height="3" rx="1.5" fill="#2563eb" />
              </g>
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
              <g transform="rotate(-35 32 32)">
                <rect x="22" y="12" width="20" height="20" rx="10" fill="#f43f5e" />
                <rect x="22" y="32" width="20" height="20" rx="10" fill="#ffffff" />
                <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth="1" />
              </g>
            </svg>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800">{title}</h4>
            {status === "PAUSED" && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-600 border border-amber-200">
                Paused
              </span>
            )}
            {status === "CANCELLED" && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                Cancelled
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">{details}</p>
          <span className="inline-block bg-[#ecf9f0] text-[#1b5e3b] text-[9px] font-bold px-2 py-0.5 rounded-full mt-1">
            {frequency}
          </span>
        </div>
      </div>

      {/* Right: Next Refill & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-4 pl-14 sm:pl-0">
        <div className="text-left sm:text-right">
          <span className="text-[9px] font-medium text-slate-400 block uppercase tracking-wider">
            Next Refill
          </span>
          <span className="text-[11px] font-bold text-slate-800 block">
            {nextRefill}
          </span>
        </div>

        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <Link
            href={`/subscriptions/${id}`}
            className="rounded-xl border border-emerald-600/30 bg-emerald-50/50 px-3.5 py-1.5 text-xs font-bold text-[#1b5e3b] hover:bg-emerald-100/60 active:scale-[0.98] transition-all duration-200 shadow-2xs"
          >
            Manage
          </Link>
          
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More options"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-colors cursor-pointer"
          >
            <span className="text-sm font-bold tracking-tight">•••</span>
          </button>

          {/* 3-Dots Dropdown with Verified Actions */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl glass-panel p-2 shadow-xl border border-slate-200/80 z-30 modal-animate-in text-left">
              <Link
                href={`/subscriptions/${id}`}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50/60 hover:text-[#1b5e3b] transition-colors"
              >
                <span>🔍</span>
                <span>View Details</span>
              </Link>

              {status === "ACTIVE" && (
                <>
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => handleAction("skip")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors text-left cursor-pointer"
                  >
                    <span>⏭️</span>
                    <span>{loadingAction === "skip" ? "Skipping..." : "Skip Next Refill"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => handleAction("pause")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors text-left cursor-pointer"
                  >
                    <span>⏸️</span>
                    <span>{loadingAction === "pause" ? "Pausing..." : "Pause Subscription"}</span>
                  </button>
                </>
              )}

              {status === "PAUSED" && (
                <button
                  type="button"
                  disabled={loadingAction !== null}
                  onClick={() => handleAction("resume")}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                >
                  <span>▶️</span>
                  <span>{loadingAction === "resume" ? "Resuming..." : "Resume Subscription"}</span>
                </button>
              )}

              {status !== "CANCELLED" && (
                <button
                  type="button"
                  disabled={loadingAction !== null}
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this subscription?")) {
                      handleAction("cancel");
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer border-t border-slate-100 mt-1 pt-2"
                >
                  <span>❌</span>
                  <span>{loadingAction === "cancel" ? "Cancelling..." : "Cancel Subscription"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


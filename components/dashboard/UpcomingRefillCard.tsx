import React from "react";
import Link from "next/link";

export interface UpcomingRefillData {
  subscriptionId: string;
  medicineName: string;
  details: string;
  dateString: string;
  timeString: string;
  daysRemaining: number;
}

interface UpcomingRefillCardProps {
  refill?: UpcomingRefillData | null;
  isLoading?: boolean;
}

export default function UpcomingRefillCard({
  refill,
  isLoading = false,
}: UpcomingRefillCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-xs mb-5 animate-pulse">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-50">
          <div className="h-3 w-24 bg-slate-100 rounded-sm" />
          <div className="h-3 w-20 bg-slate-100 rounded-sm" />
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-slate-200 rounded-sm" />
              <div className="h-2.5 w-14 bg-slate-100 rounded-sm" />
            </div>
          </div>
          <div className="h-4 w-14 bg-slate-100 rounded-full" />
        </div>
        <div className="mt-4 h-9 w-full bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!refill) {
    return (
      <div className="rounded-2xl glass-card p-5 mb-5 text-center">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/70 text-left">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">Upcoming Refill</h3>
          <Link
            href="/subscriptions"
            className="text-[11px] font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors"
          >
            View Calendar &rarr;
          </Link>
        </div>

        <div className="py-5 flex flex-col items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-base mb-2.5 shadow-2xs border border-emerald-100">
            ✨
          </div>
          <h4 className="text-xs font-bold text-slate-800">You&apos;re all caught up</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            No upcoming refills scheduled.
          </p>
          <Link
            href="/dashboard/medicines"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md hover:shadow-emerald-900/15 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            Browse Medicines &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const badgeText =
    refill.daysRemaining <= 0
      ? "Today"
      : refill.daysRemaining === 1
      ? "Tomorrow"
      : `In ${refill.daysRemaining} Days`;

  return (
    <div className="rounded-2xl glass-card p-5 mb-5 border border-emerald-500/15 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/70">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight">Upcoming Refill</h3>
        <Link
          href="/subscriptions"
          className="text-[11px] font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors"
        >
          View Calendar &rarr;
        </Link>
      </div>

      {/* Product Details */}
      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ecf9f0] border border-emerald-100 shrink-0 shadow-2xs">
            <svg className="h-6 w-6 drop-shadow-2xs" viewBox="0 0 64 64" fill="none">
              <g transform="rotate(-35 32 32)">
                <rect x="22" y="12" width="20" height="20" rx="10" fill="#f43f5e" />
                <rect x="22" y="32" width="20" height="20" rx="10" fill="#ffffff" />
                <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth="1" />
              </g>
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{refill.medicineName}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">{refill.details}</p>
          </div>
        </div>

        <span className="rounded-full bg-[#ecf9f0] px-2.5 py-0.5 text-[10px] font-bold text-[#1b5e3b] border border-emerald-200/60 shadow-2xs">
          {badgeText}
        </span>
      </div>

      {/* Schedule Info */}
      <div className="mt-3.5 flex items-center gap-4 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span>📅</span>
          <span>{refill.dateString}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>⏰</span>
          <span>{refill.timeString}</span>
        </div>
      </div>

      {/* Action Button */}
      <Link
        href={`/subscriptions/${refill.subscriptionId}`}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1b5e3b] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md hover:shadow-emerald-900/15 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
      >
        <span>View Details</span>
        <span>&rarr;</span>
      </Link>
    </div>
  );
}


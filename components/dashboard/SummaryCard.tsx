import React from "react";
import Link from "next/link";

interface SummaryCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtext?: string;
  dateText?: string;
  linkText?: string;
  linkHref?: string;
  isLoading?: boolean;
}

export default function SummaryCard({
  icon,
  iconBg,
  label,
  value,
  subtext,
  dateText,
  linkText,
  linkHref,
  isLoading = false,
}: SummaryCardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col justify-between rounded-2xl glass-card p-4.5 animate-pulse min-h-[114px]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-slate-100 rounded-md" />
              <div className="h-5 w-24 bg-slate-200 rounded-md" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-3 w-28 bg-slate-100 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl glass-card glass-card-interactive p-4.5 min-h-[114px]">
      <div>
        {/* Top: Icon & Label */}
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} shrink-0 shadow-2xs`}>
            {icon}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">
              {label}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 block leading-tight mt-0.5 tracking-tight">
              {value}
            </span>
          </div>
        </div>

        {/* Optional Subtext Details */}
        {subtext && (
          <div className="mt-3.5">
            <p className="text-xs font-semibold text-slate-700">{subtext}</p>
            {dateText && (
              <p className="text-[11px] text-slate-400 mt-0.5">{dateText}</p>
            )}
          </div>
        )}
      </div>

      {/* Optional Action Link */}
      {linkText && linkHref && (
        <div className="mt-3.5 pt-1 border-t border-slate-100/60">
          <Link
            href={linkHref}
            className="text-[11px] font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors inline-flex items-center gap-1 group"
          >
            <span>{linkText}</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}

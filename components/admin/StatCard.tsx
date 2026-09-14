import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeType?: "neutral" | "brand" | "amber" | "rose" | "emerald";
  color?: "amber" | "blue" | "emerald" | "rose" | "neutral" | string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtitle,
  icon,
  badge,
  badgeType = "neutral",
  color,
  className = "",
}: StatCardProps) {
  const badgeStyles: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
    brand: "bg-emerald-50 text-[#1b5e3b] dark:bg-emerald-950/60 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  };

  const iconBgStyles: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    emerald: "bg-emerald-50 text-[#1b5e3b] dark:bg-emerald-950/50 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    neutral: "bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300",
  };

  const iconContainerClass = color && iconBgStyles[color]
    ? iconBgStyles[color]
    : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300";

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs hover:shadow-xs transition-shadow duration-150 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl shrink-0 ${iconContainerClass}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
          {badge && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyles[badgeType]}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 font-medium truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

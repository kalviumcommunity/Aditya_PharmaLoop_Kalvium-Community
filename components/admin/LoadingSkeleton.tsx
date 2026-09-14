import React from "react";

interface LoadingSkeletonProps {
  rows?: number;
  variant?: "table" | "cards" | "detail";
  className?: string;
}

export default function LoadingSkeleton({
  rows = 6,
  variant = "table",
  className = "",
}: LoadingSkeletonProps) {
  if (variant === "cards") {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 motion-safe:animate-pulse ${className}`}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3"
          >
            <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-1/2" />
            <div className="h-8 bg-slate-100 dark:bg-zinc-800/60 rounded w-3/4" />
            <div className="h-2.5 bg-slate-100 dark:bg-zinc-800/40 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={`space-y-6 motion-safe:animate-pulse ${className}`}>
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="h-16 bg-slate-100 dark:bg-zinc-800/60 rounded-xl" />
            <div className="h-16 bg-slate-100 dark:bg-zinc-800/60 rounded-xl" />
            <div className="h-16 bg-slate-100 dark:bg-zinc-800/60 rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-32 bg-slate-100 dark:bg-zinc-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-5 sm:p-6 space-y-3 motion-safe:animate-pulse ${className}`}
      role="status"
      aria-label="Loading data..."
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
        <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded w-1/4" />
        <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded w-16" />
      </div>
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-11 bg-slate-50 dark:bg-zinc-800/50 rounded-xl w-full border border-slate-100/80 dark:border-zinc-800/40"
          />
        ))}
      </div>
    </div>
  );
}

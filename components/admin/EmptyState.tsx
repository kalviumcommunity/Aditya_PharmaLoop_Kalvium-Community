import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon = "📋",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 p-8 text-center bg-white/50 dark:bg-zinc-900/50">
      <div className="mx-auto mb-3 text-3xl">{icon}</div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

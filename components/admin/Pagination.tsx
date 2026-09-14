import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  totalItems?: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const count = totalCount ?? totalItems ?? 0;
  if (count === 0 || totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, count);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
      <div className="text-slate-500 dark:text-zinc-400">
        Showing <span className="font-semibold text-slate-900 dark:text-white">{start}</span> to{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{end}</span> of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{count}</span> results
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || disabled}
          className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="px-2 font-semibold text-slate-700 dark:text-zinc-300">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || disabled}
          className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

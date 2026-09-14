import Link from "next/link";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: string;
  statusCode?: number;
  onRetry?: () => void;
  className?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ErrorState({
  title = "Failed to load data",
  message,
  error,
  statusCode,
  onRetry,
  className = "",
  backHref,
  backLabel = "Return",
}: ErrorStateProps) {
  const isForbidden = statusCode === 403 || error?.includes("403");
  const isNotFound = statusCode === 404 || error?.includes("404");

  const displayTitle = isForbidden
    ? "Access Forbidden"
    : isNotFound
    ? "Resource Not Found"
    : title;

  const displayMessage = isForbidden
    ? "You do not have staff administrator permissions to view this resource."
    : isNotFound
    ? "The requested record could not be found in the database."
    : error || message || "An error occurred while fetching information. Please try again.";

  return (
    <div
      className={`rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
        {isForbidden ? "🔒" : isNotFound ? "🔍" : "⚠️"}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
        {displayTitle}
      </h3>
      <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
        {displayMessage}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onRetry && !isForbidden && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
          >
            <svg
              className="w-3.5 h-3.5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry Request
          </button>
        )}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1b5e3b] text-white text-xs font-semibold hover:bg-[#154a2e] transition-colors shadow-2xs"
          >
            &larr; {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

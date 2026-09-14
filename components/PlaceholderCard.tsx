import React from "react";
import Link from "next/link";

interface RelatedLink {
  label: string;
  href: string;
  description?: string;
}

interface PlaceholderCardProps {
  pageName: string;
  route: string;
  description?: string;
  relatedLinks?: RelatedLink[];
}

export default function PlaceholderCard({
  pageName,
  route,
  description,
  relatedLinks = [],
}: PlaceholderCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {pageName}
            </h2>
            <code className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {route}
            </code>
          </div>
        </div>

        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/30">
          Phase 1 Placeholder
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Functionality will be implemented later.
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description ||
              "This route is part of the PharmaLoop frontend shell. Dynamic data, interactive state, and API integration will be added in upcoming phases."}
          </p>
        </div>

        {relatedLinks.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Related Navigation
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col rounded-lg border border-zinc-200 p-3 text-sm transition-all hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-zinc-800 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/20"
                >
                  <span className="font-medium text-zinc-900 group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400">
                    {link.label} &rarr;
                  </span>
                  {link.description && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {link.description}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

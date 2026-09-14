import React from "react";
import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export default function AdminHeader({
  title,
  subtitle,
  badge = "Operations",
  breadcrumbs,
  actions,
}: AdminHeaderProps) {
  return (
    <header className="pb-5 border-b border-slate-200/80 dark:border-zinc-800 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb navigation"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400"
        >
          <Link
            href="/admin"
            className="hover:text-[#1b5e3b] dark:hover:text-emerald-400 transition-colors font-medium"
          >
            Admin
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-slate-300 dark:text-zinc-600 select-none">/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-[#1b5e3b] dark:hover:text-emerald-400 transition-colors font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="font-semibold text-slate-900 dark:text-white"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {badge && (
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-[#1b5e3b] dark:text-emerald-300 uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CustomerSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function CustomerSidebar({
  mobileOpen = false,
  onClose,
}: CustomerSidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (
          json.success &&
          json.data &&
          typeof json.data.unreadCount === "number"
        ) {
          setUnreadCount(json.data.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      label: "Medicines",
      href: "/dashboard/medicines",
      icon: <span className="text-rose-500 text-xs">💊</span>,
    },
    {
      label: "My Subscriptions",
      href: "/subscriptions",
      icon: (
        <div className="flex h-4 w-4 items-center justify-center rounded-xs bg-blue-500 text-white">
          <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.02l.478.477a7 7 0 0011.96-3.212.75.75 0 00-1.626-.632zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.48a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.02l-.478-.477a7 7 0 00-11.96 3.212.75.75 0 001.626.632z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      ),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: <span className="text-amber-700 text-xs">📦</span>,
    },
    {
      label: "Cart",
      href: "/cart",
      icon: (
        <svg
          className="h-4 w-4 text-emerald-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Payments",
      href: "/payments",
      icon: <span className="text-sky-500 text-xs">💳</span>,
    },
    {
      label: "Notifications",
      href: "/notifications",
      badge:
        unreadCount !== null && unreadCount > 0
          ? String(unreadCount)
          : undefined,
      icon: <span className="text-amber-500 text-xs">🔔</span>,
    },
    {
      label: "Address Book",
      href: "/address-book",
      icon: <span className="text-rose-400 text-xs">📍</span>,
    },
    {
      label: "Help & Support",
      href: "/dashboard/help-support",
      icon: <span className="text-red-500 font-bold text-xs">?</span>,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-3.5">
      <div>
        {/* Brand Logo */}
        <div className="mb-6 flex items-center gap-2 px-2 pt-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b5e3b] text-white shadow-xs">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C7.03 2 3 6.03 3 11c0 3.58 2.12 6.67 5.19 8.07.41-.65.95-1.42 1.63-2.31 1.62-2.12 3.8-4.97 3.8-7.76 0-1.28-.43-2.45-1.15-3.37C12.82 5.23 13.43 5 14.1 5c2.76 0 5 2.24 5 5 0 2.51-1.02 4.41-2.47 5.76.15.52.37 1.02.66 1.49C19.34 15.68 21 13.53 21 11c0-4.97-4.03-9-9-9z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-[#1b5e3b]">
            PharmaLoop
          </span>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#e8f7ec] text-[#1b5e3b] font-bold shadow-2xs border border-emerald-600/15"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1b5e3b] text-[10px] font-bold text-white shrink-0 shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo Card */}
      <div className="mt-8 rounded-2xl bg-gradient-to-b from-[#f0f8f3] to-white border border-[#d6eedd] p-3 text-left shadow-2xs">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#dcfce7] text-[#1b5e3b] shadow-2xs">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
        </div>
        <h4 className="text-xs font-bold text-slate-800">Stay on track.</h4>
        <p className="mt-1 text-[10px] leading-tight text-slate-500">
          We&apos;ll handle your refills, so you can focus on your health.
        </p>
        <Link
          href="/subscriptions"
          onClick={onClose}
          className="mt-3 block w-full rounded-xl bg-[#1b5e3b] py-2 text-center text-[11px] font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md hover:shadow-emerald-900/15 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150"
        >
          Learn More &rarr;
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-[185px] shrink-0 flex-col border-r border-slate-200/70 bg-white/95 backdrop-blur-md min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            onClick={onClose}
          />
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-white shadow-xl">
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sidebar"
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

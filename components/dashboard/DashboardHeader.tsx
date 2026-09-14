"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [cartCount, setCartCount] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;
      try {
        const stored = localStorage.getItem("pharmaloop_user");
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch {}
    });

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && json.data) {
          setUser(json.data);
          try {
            localStorage.setItem("pharmaloop_user", JSON.stringify(json.data));
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Real cart total quantity
    const fetchCartCount = () => {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((json) => {
          if (!isCancelled && json.success && json.data && Array.isArray(json.data.items)) {
            const totalQty = json.data.items.reduce(
              (sum: number, item: { quantity?: number }) => sum + (item.quantity || 1),
              0
            );
            setCartCount(totalQty);
          }
        })
        .catch(() => {});
    };

    fetchCartCount();

    const handleCartUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === "number") {
        setCartCount(customEvent.detail.count);
      } else {
        fetchCartCount();
      }
    };

    window.addEventListener("pharmaloop_cart_updated", handleCartUpdated);

    // 3. Real unread notifications count
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && json.data && typeof json.data.unreadCount === "number") {
          setUnreadCount(json.data.unreadCount);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      window.removeEventListener("pharmaloop_cart_updated", handleCartUpdated);
    };
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/dashboard/medicines?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[Logout Error]", err);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("pharmaloop_user");
    }
    setUser(null);
    setProfileOpen(false);
    router.push("/login");
  };

  const isPayment = pathname.includes("/payment");
  const isSchedule = pathname.includes("/schedule") && !isPayment;
  const isProductDetail = pathname.startsWith("/products/") && !isSchedule && !isPayment;
  const isOrderDetail = pathname.startsWith("/orders/") && pathname !== "/orders";
  const isSubscriptionDetail =
    pathname.startsWith("/subscriptions/") &&
    pathname !== "/subscriptions" &&
    !pathname.includes("/schedule") &&
    !pathname.includes("/payment") &&
    !pathname.includes("/success");

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/70 glass-nav px-4 sm:px-6 lg:px-8 transition-all">
      {/* Left: Mobile hamburger & Search Field OR Back Links */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open sidebar"
          className="p-1.5 text-slate-500 hover:text-slate-800 md:hidden transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {isSubscriptionDetail ? (
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>&mdash;</span>
            <span>Back to Subscriptions</span>
          </Link>
        ) : isOrderDetail ? (
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>&mdash;</span>
            <span>Back to Orders</span>
          </Link>
        ) : isPayment ? (
          <Link
            href="/subscriptions/1/schedule"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>&mdash;</span>
            <span>Back to Schedule</span>
          </Link>
        ) : isSchedule ? (
          <Link
            href="/products/1"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>&mdash;</span>
            <span>Back to Medicine Details</span>
          </Link>
        ) : isProductDetail ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>&mdash;</span>
            <span>Back to Dashboard</span>
          </Link>
        ) : (
          /* Search Field */
          <div className="relative flex items-center w-full max-w-sm sm:max-w-md">
            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search medicines, health products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-xl bg-slate-100/80 py-1.5 pl-8 pr-4 text-xs text-slate-700 placeholder-slate-400 border border-slate-200/60 focus:bg-white focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-500/15 transition-all"
            />
          </div>
        )}
      </div>

      {/* Right: Notifications, Cart, Avatar, User Name */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications Icon */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount !== null && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1b5e3b] text-[9px] font-bold text-white shadow-2xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Shopping Cart Icon */}
        <Link
          href="/cart"
          aria-label="Shopping Cart"
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {cartCount !== null && cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1b5e3b] text-[9px] font-bold text-white shadow-2xs">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </Link>

        {/* User Profile Trigger & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="User menu"
            aria-expanded={profileOpen}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b5e3b] text-white font-bold text-xs shadow-xs ring-2 ring-emerald-600/20">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Hi, User"}
            </span>
            <svg
              className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                profileOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel p-3 shadow-xl border border-slate-200/80 z-50 modal-animate-in">
              <div className="px-2 py-1.5 border-b border-slate-100 mb-2">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {user?.name || "Account User"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || "user@pharmaloop.com"}
                </p>
                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#1b5e3b] uppercase tracking-wider">
                  {user?.role || "CUSTOMER"}
                </span>
              </div>

              <Link
                href="/dashboard"
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span>📊</span>
                <span>My Dashboard</span>
              </Link>

              <Link
                href="/subscriptions"
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span>🔄</span>
                <span>Active Refills</span>
              </Link>

              <Link
                href="/dashboard/help-support"
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span>💬</span>
                <span>Help &amp; Support</span>
              </Link>

              <div className="border-t border-slate-100 mt-2 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

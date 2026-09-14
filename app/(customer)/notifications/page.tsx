"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  userId: string;
  type: "ORDER" | "PAYMENT" | "SUBSCRIPTION" | "REFILL" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const filters = ["All", "Refills", "Orders", "Payments", "System"];
  const [activeFilter, setActiveFilter] = useState("All");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } catch (err: unknown) {
      console.error("[Notifications] Fetch error:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && json.data) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("[Notifications] Fetch error:", err);
          setError("Unable to load notifications. Please try again.");
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[Notifications] Error marking all read:", err);
    }
  };

  const handleMarkItemRead = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    if (!item || item.isRead) return;

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("[Notifications] Error marking read:", err);
    }
  };

  // Filter items
  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Refills") return item.type === "REFILL" || item.type === "SUBSCRIPTION";
    if (activeFilter === "Orders") return item.type === "ORDER";
    if (activeFilter === "Payments") return item.type === "PAYMENT";
    if (activeFilter === "System") return item.type === "SYSTEM";
    return true;
  });

  // Pure date formatting helper
  const formatTimeAgo = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  const getNotificationVisuals = (type: NotificationItem["type"]) => {
    switch (type) {
      case "REFILL":
      case "SUBSCRIPTION":
        return {
          icon: "⏰",
          iconBg: "bg-emerald-50 text-[#1b5e3b]",
          categoryLabel: "Refills",
          linkText: "View Subscriptions",
          linkHref: "/subscriptions",
        };
      case "ORDER":
        return {
          icon: "🚚",
          iconBg: "bg-amber-50 text-amber-600",
          categoryLabel: "Orders",
          linkText: "View Orders",
          linkHref: "/orders",
        };
      case "PAYMENT":
        return {
          icon: "💳",
          iconBg: "bg-blue-50 text-blue-600",
          categoryLabel: "Payments",
          linkText: "View Orders",
          linkHref: "/orders",
        };
      case "SYSTEM":
      default:
        return {
          icon: "🛡️",
          iconBg: "bg-purple-50 text-purple-600",
          categoryLabel: "System",
          linkText: undefined,
          linkHref: undefined,
        };
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 page-entrance">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Notifications &amp; Alerts
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Stay updated with prescription refills, shipment tracking, and account alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-[#1b5e3b] hover:underline self-start sm:self-auto inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Mark all as read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {filters.map((filter) => {
          const isSelected = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-xl px-4 py-2 font-medium whitespace-nowrap transition-all cursor-pointer active:scale-[0.98] ${
                isSelected
                  ? "bg-[#1b5e3b] text-white shadow-xs font-semibold"
                  : "glass-card text-slate-700 hover:bg-white"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-5 animate-pulse flex items-start gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-48 bg-slate-200 rounded-sm" />
                <div className="h-3 w-72 bg-slate-100 rounded-sm" />
                <div className="h-2.5 w-20 bg-slate-100 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-xs font-medium text-rose-500">{error}</p>
          <button
            type="button"
            onClick={fetchNotifications}
            className="mt-3 text-xs font-bold text-[#1b5e3b] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-100/60 text-xl mb-3 shadow-2xs">
            🔔
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {activeFilter === "All"
              ? "No notifications yet"
              : `No ${activeFilter.toLowerCase()} notifications`}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            We&apos;ll notify you when your prescription refills are scheduled, orders ship, or payments process.
          </p>
        </div>
      ) : (
        /* Notifications Feed */
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const visuals = getNotificationVisuals(item.type);
            const timeAgo = formatTimeAgo(item.createdAt);

            return (
              <div
                key={item.id}
                onClick={() => handleMarkItemRead(item.id)}
                className={`glass-card glass-card-interactive rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer active:scale-[0.99] transition-all ${
                  !item.isRead
                    ? "bg-emerald-50/30 border-emerald-300/60 shadow-xs"
                    : "opacity-90"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-base ${visuals.iconBg} shrink-0 mt-0.5 shadow-2xs`}
                  >
                    {visuals.icon}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        {item.title}
                      </h3>
                      <span className="rounded-full glass-card px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                        {visuals.categoryLabel}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-[#1b5e3b] ring-2 ring-emerald-500/20" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="pt-1 flex items-center gap-4 text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {timeAgo}
                      </span>
                      {visuals.linkText && visuals.linkHref && (
                        <Link
                          href={visuals.linkHref}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-[#1b5e3b] hover:underline inline-flex items-center gap-1"
                        >
                          <span>{visuals.linkText}</span>
                          <span>&rarr;</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

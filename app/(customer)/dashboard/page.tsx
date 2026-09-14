"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SummaryCard from "@/components/dashboard/SummaryCard";
import SubscriptionRow from "@/components/dashboard/SubscriptionRow";
import UpcomingRefillCard, { UpcomingRefillData } from "@/components/dashboard/UpcomingRefillCard";
import QuickActions from "@/components/dashboard/QuickActions";
import SmartRefillsBanner from "@/components/dashboard/SmartRefillsBanner";
import NeedHelpCard from "@/components/dashboard/NeedHelpCard";

interface Product {
  id: string;
  name: string;
  dosage?: string;
  form?: string;
  price?: number | string;
}

interface SubscriptionItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface Subscription {
  id: string;
  userId: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  nextRefillDate: string;
  refillTime: string;
  items: SubscriptionItem[];
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number | string;
  product?: {
    id: string;
    name: string;
    description?: string | null;
  };
}

interface Order {
  id: string;
  userId: string;
  addressId: string;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number | string;
  createdAt: string;
  items: OrderItem[];
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function DashboardPage() {
  const router = useRouter();

  // Hydration-safe client mount detection with referentially stable callbacks
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const [userName, setUserName] = useState<string>("");

  // Hydration-safe greeting computed only on client
  const greeting = useMemo(() => {
    if (!isMounted) return "Good Day";
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, [isMounted]);

  // Loading & data states
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // Re-fetch helper when an action is executed
  const handleReload = () => {
    setLoadingSubs(true);
    fetch("/api/subscriptions")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSubscriptions(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSubs(false));

    setLoadingOrders(true);
    fetch("/api/orders")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && typeof json.data.unreadCount === "number") {
          setUnreadNotifications(json.data.unreadCount);
        }
      })
      .catch(() => {});
  };

  // Initial load: Auth verification + Subscriptions + Notifications + Orders
  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;
      try {
        const stored = localStorage.getItem("pharmaloop_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name) {
            setUserName(parsed.name.split(" ")[0]);
          }
        }
      } catch {}
    });

    // 1. Auth check - strictly only redirect to login if session fails
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("UNAUTHORIZED");
        return res.json();
      })
      .then((json) => {
        if (!isCancelled && json.success && json.data) {
          if (json.data.name) {
            setUserName(json.data.name.split(" ")[0]);
          }
          try {
            localStorage.setItem("pharmaloop_user", JSON.stringify(json.data));
          } catch {}
        } else if (!isCancelled) {
          router.push("/login");
        }
      })
      .catch((err) => {
        if (!isCancelled && err.message === "UNAUTHORIZED") {
          router.push("/login");
        }
      });

    // 2. Subscriptions fetch
    fetch("/api/subscriptions")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          if (json.success && Array.isArray(json.data)) {
            setSubscriptions(json.data);
          } else {
            setSubscriptions([]);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("[Dashboard Subscriptions Error]", err);
          setSubsError("Unable to load subscriptions. Please try again.");
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingSubs(false);
      });

    // 3. Orders fetch
    fetch("/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          if (json.success && Array.isArray(json.data)) {
            setOrders(json.data);
          } else {
            setOrders([]);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("[Dashboard Orders Error]", err);
          setOrdersError("Unable to load orders. Please try again.");
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingOrders(false);
      });

    // 4. Notifications fetch
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && json.data && typeof json.data.unreadCount === "number") {
          setUnreadNotifications(json.data.unreadCount);
        }
      })
      .catch((err) => {
        console.error("[Dashboard Notifications Error]", err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingNotifs(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [router]);

  // Derived values
  const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE");
  const activeCount = activeSubscriptions.length;

  // Find nearest upcoming active refill
  let earliestRefill: UpcomingRefillData | null = null;
  if (isMounted && activeSubscriptions.length > 0) {
    const sorted = [...activeSubscriptions].sort((a, b) => {
      return new Date(a.nextRefillDate).getTime() - new Date(b.nextRefillDate).getTime();
    });

    const nearest = sorted[0];
    if (nearest) {
      const refillDate = new Date(nearest.nextRefillDate);
      const today = new Date();
      const utcRefill = Date.UTC(refillDate.getFullYear(), refillDate.getMonth(), refillDate.getDate());
      const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const daysRemaining = Math.round((utcRefill - utcToday) / (1000 * 60 * 60 * 24));

      const primaryItem = nearest.items?.[0];
      const medicineName = primaryItem?.product?.name || "Refill Medication";
      const quantityText = primaryItem
        ? `${primaryItem.quantity} ${primaryItem.product?.dosage || primaryItem.product?.form || "Pack"}`
        : "Standard Pack";

      const formattedDate = refillDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      earliestRefill = {
        subscriptionId: nearest.id,
        medicineName,
        details: quantityText,
        dateString: formattedDate,
        timeString: nearest.refillTime || "9:00 AM",
        daysRemaining: Math.max(0, daysRemaining),
      };
    }
  }

  // Format frequency label
  const formatFrequency = (freq: string) => {
    switch (freq) {
      case "WEEKLY":
        return "Every Week";
      case "BIWEEKLY":
        return "Every 2 Weeks";
      case "MONTHLY":
        return "Every Month";
      default:
        return freq;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 page-entrance">
      {/* Top Greeting Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <span>
            {greeting}, {userName || "there"}
          </span>
          <span className="select-none">👋</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
          Here&apos;s what&apos;s happening with your health today.
        </p>
      </div>

      {/* Row of 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Upcoming Refill */}
        <SummaryCard
          isLoading={!isMounted || loadingSubs}
          iconBg="bg-[#ecf9f0]"
          icon={<span className="text-sm select-none">🗓️</span>}
          label="Upcoming Refill"
          value={
            earliestRefill
              ? earliestRefill.daysRemaining <= 0
                ? "Today"
                : earliestRefill.daysRemaining === 1
                ? "1 Day Left"
                : `${earliestRefill.daysRemaining} Days Left`
              : "No upcoming refills"
          }
          subtext={earliestRefill ? earliestRefill.medicineName : "No active refills scheduled"}
          dateText={
            earliestRefill
              ? `${earliestRefill.dateString} · ${earliestRefill.timeString}`
              : undefined
          }
          linkText={earliestRefill ? "View Refill Details →" : "Browse Medicines →"}
          linkHref={earliestRefill ? `/subscriptions/${earliestRefill.subscriptionId}` : "/products"}
        />

        {/* Card 2: Active Subscriptions */}
        <SummaryCard
          isLoading={loadingSubs}
          iconBg="bg-[#eff6ff]"
          icon={
            <div className="flex h-5 w-5 items-center justify-center rounded-xs bg-blue-500 text-white">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.02l.478.477a7 7 0 0011.96-3.212.75.75 0 00-1.626-.632zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.48a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.02l-.478-.477a7 7 0 0011.96 3.212.75.75 0 001.626.632z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          }
          label="Active Subscriptions"
          value={String(activeCount)}
          linkText="View all subscriptions →"
          linkHref="/subscriptions"
        />

        {/* Card 3: Total Orders */}
        <SummaryCard
          isLoading={loadingOrders}
          iconBg="bg-[#f5f3ff]"
          icon={<span className="text-purple-600 text-sm select-none">📦</span>}
          label="Total Orders"
          value={String(orders.length)}
          subtext={
            orders.length > 0
              ? `${orders.filter((o) => o.status === "DELIVERED").length} delivered`
              : "No orders placed yet"
          }
          linkText="View order history →"
          linkHref="/orders"
        />

        {/* Card 4: Notifications */}
        <SummaryCard
          isLoading={loadingNotifs}
          iconBg="bg-[#fef9c3]/70"
          icon={<span className="text-amber-500 text-sm select-none">🔔</span>}
          label="Notifications"
          value={`${unreadNotifications} New`}
          linkText="View all notifications →"
          linkHref="/notifications"
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Your Active Subscriptions + Banner */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="glass-card p-5 sm:p-6 rounded-2xl flex-1">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100/80">
              <h2 className="text-sm font-bold text-slate-900">
                Your Active Subscriptions
              </h2>
              <Link
                href="/subscriptions"
                className="text-xs font-bold text-[#1b5e3b] hover:underline"
              >
                View All &rarr;
              </Link>
            </div>

            {/* Content States */}
            {loadingSubs ? (
              <div className="divide-y divide-slate-100 animate-pulse py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-slate-100" />
                      <div className="space-y-2">
                        <div className="h-3 w-28 bg-slate-200 rounded-sm" />
                        <div className="h-2.5 w-16 bg-slate-100 rounded-sm" />
                      </div>
                    </div>
                    <div className="h-7 w-20 bg-slate-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : subsError ? (
              <div className="py-8 text-center">
                <p className="text-xs text-rose-500 font-medium">{subsError}</p>
                <button
                  type="button"
                  onClick={handleReload}
                  className="mt-2 text-xs font-bold text-[#1b5e3b] hover:underline cursor-pointer"
                >
                  Retry loading subscriptions
                </button>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl mb-3">
                  💊
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  No active subscriptions yet
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Subscribe to your essential medications for timely, automatic delivery directly to your door.
                </p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
                >
                  Explore Medicines &rarr;
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {subscriptions.map((sub, idx) => {
                  const primary = sub.items?.[0];
                  const title = primary?.product?.name || "Refill Item";
                  const details = primary
                    ? `${primary.quantity} ${primary.product?.dosage || primary.product?.form || "Pack"}`
                    : "Standard Refill";

                  const refillDateObj = new Date(sub.nextRefillDate);
                  const nextRefillText = isMounted
                    ? `${refillDateObj.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })} · ${sub.refillTime || "9:00 AM"}`
                    : `${sub.refillTime || "9:00 AM"}`;

                  const iconType = idx % 3 === 0 ? "pill" : idx % 3 === 1 ? "bottle" : "syringe";
                  const iconBg =
                    idx % 3 === 0
                      ? "bg-[#ecf9f0]"
                      : idx % 3 === 1
                      ? "bg-[#fef9c3]/70"
                      : "bg-[#fef3c7]/60";

                  return (
                    <SubscriptionRow
                      key={sub.id}
                      id={sub.id}
                      title={title}
                      details={details}
                      frequency={formatFrequency(sub.frequency)}
                      nextRefill={nextRefillText}
                      status={sub.status}
                      iconType={iconType}
                      iconBg={iconBg}
                      onActionSuccess={handleReload}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Orders Overview */}
          <div className="mt-6 glass-card p-5 sm:p-6 rounded-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100/80">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">📦</span>
                <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
              </div>
              <Link
                href="/orders"
                className="text-xs font-bold text-[#1b5e3b] hover:underline"
              >
                View All &rarr;
              </Link>
            </div>

            {/* Content States */}
            {loadingOrders ? (
              <div className="divide-y divide-slate-100/80 animate-pulse py-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3.5">
                    <div className="space-y-2">
                      <div className="h-3.5 w-24 bg-slate-200/60 rounded-md" />
                      <div className="h-2.5 w-48 bg-slate-100/70 rounded-md" />
                    </div>
                    <div className="h-6 w-16 bg-slate-100/70 rounded-md" />
                  </div>
                ))}
              </div>
            ) : ordersError ? (
              <div className="py-6 text-center">
                <p className="text-xs text-rose-500 font-medium">{ordersError}</p>
                <button
                  type="button"
                  onClick={handleReload}
                  className="mt-2 text-xs font-bold text-[#1b5e3b] hover:underline cursor-pointer"
                >
                  Retry loading orders
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-base mb-2 border border-emerald-100/50">
                  📦
                </div>
                <h3 className="text-xs font-bold text-slate-800">No orders yet</h3>
                <p className="mt-0.5 max-w-xs text-[11px] text-slate-500">
                  Your medicine purchases and scheduled refills will appear here.
                </p>
                <Link
                  href="/products"
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
                >
                  Explore Medicines &rarr;
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/80">
                {orders.slice(0, 3).map((order) => {
                  const isRefill = order.id.startsWith("refill_");
                  const displayId = isRefill
                    ? "Refill · " + order.id.slice(7, 17) + "..."
                    : order.id.length > 10
                    ? `ORD-${order.id.slice(-4).toUpperCase()}`
                    : `#${order.id}`;

                  const dateStr = isMounted
                    ? new Date(order.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "";

                  const itemsCount = order.items?.length || 0;
                  const firstItem = order.items?.[0];
                  const itemsSummary = firstItem
                    ? itemsCount > 1
                       ? `${firstItem.product?.name || "Medicine"} + ${itemsCount - 1} more`
                      : `${firstItem.product?.name || "Medicine"} (${firstItem.quantity})`
                    : "Prescription items";

                  const badgeStyle =
                    order.status === "DELIVERED"
                      ? "bg-emerald-50 text-[#166534] border border-emerald-200/80 shadow-2xs"
                      : order.status === "SHIPPED"
                      ? "bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs"
                      : order.status === "PROCESSING"
                      ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                      : order.status === "CONFIRMED"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                      : order.status === "CANCELLED"
                      ? "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                      : "bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs";

                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="py-3.5 flex items-center justify-between gap-4 group hover:bg-emerald-50/50 -mx-2 px-3 rounded-xl transition-all duration-200"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-[#1b5e3b] transition-colors truncate">
                            {displayId}
                          </span>
                          <span className="text-[10px] text-slate-400">· {dateStr}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {itemsSummary} &ndash; ₹{Number(order.total || 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badgeStyle}`}>
                          {order.status}
                        </span>
                        <span className="text-xs text-slate-400 group-hover:text-[#1b5e3b] group-hover:translate-x-0.5 transition-all">
                          &rarr;
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart Refills Banner */}
          <SmartRefillsBanner />
        </div>

        {/* Right Column (4 cols): Upcoming Refill + Quick Actions + Help */}
        <div className="lg:col-span-4 flex flex-col">
          <UpcomingRefillCard
            refill={earliestRefill}
            isLoading={!isMounted || loadingSubs}
          />
          <QuickActions />
          <NeedHelpCard />
        </div>
      </div>
    </div>
  );
}

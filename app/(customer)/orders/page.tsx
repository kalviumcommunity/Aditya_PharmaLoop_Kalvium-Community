"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  stock?: number;
  isActive?: boolean;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number | string;
  product: Product;
}

interface Address {
  id: string;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface PaymentAttempt {
  id: string;
  paymentId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  failureReason?: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number | string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  attempts?: PaymentAttempt[];
}

interface Order {
  id: string;
  userId: string;
  addressId: string;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number | string;
  createdAt: string;
  updatedAt: string;
  address?: Address | null;
  items: OrderItem[];
  payment?: Payment | null;
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * High-fidelity Medicine Thumbnail Visual matching the reference design.
 */
function OrderMedicineThumbnail({ title, imageUrl }: { title: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 p-1 border border-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
      </div>
    );
  }

  const lower = title.toLowerCase();

  // Crocin / Paracetamol visual
  if (lower.includes("crocin") || lower.includes("paracetamol") || lower.includes("dolo")) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eff8f2] p-1 border border-[#d8eee0]">
        <div className="relative w-10 h-7 bg-white rounded-md border border-slate-200/90 shadow-2xs flex flex-col justify-between p-0.5 overflow-hidden">
          <div className="h-1 bg-[#0284c7] -mx-0.5 -mt-0.5" />
          <div className="text-center">
            <span className="text-[6px] font-black text-[#0284c7] leading-none block">Crocin</span>
          </div>
          <div className="flex justify-end gap-0.5">
            <span className="h-0.5 w-0.5 rounded-full bg-rose-500" />
            <span className="h-0.5 w-0.5 rounded-full bg-sky-500" />
          </div>
        </div>
      </div>
    );
  }

  // Vitamin D3 / Vitamins visual
  if (lower.includes("vitamin") || lower.includes("d3") || lower.includes("revital")) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fefce8] p-1 border border-[#fef08a]/70">
        <div className="relative w-10 h-7 bg-white rounded-md border border-amber-200 shadow-2xs flex flex-col justify-between p-0.5 overflow-hidden">
          <div className="h-1 bg-amber-400 -mx-0.5 -mt-0.5" />
          <div className="text-center">
            <span className="text-[7px] font-black text-amber-600 leading-none block">D3</span>
          </div>
          <span className="text-[5px] text-amber-700/80 leading-none">☀️</span>
        </div>
      </div>
    );
  }

  // Amoxicillin / Antibiotic visual
  if (lower.includes("amoxicillin") || lower.includes("augmentin") || lower.includes("antibiotic")) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f0f7ff] p-1 border border-[#d8e8fc]">
        <div className="relative w-10 h-7 bg-white rounded-md border border-blue-200 shadow-2xs flex flex-col justify-between p-0.5 overflow-hidden">
          <div className="h-1 bg-[#2563eb] -mx-0.5 -mt-0.5" />
          <div className="text-center">
            <span className="text-[6px] font-black text-[#1e40af] leading-none block">Amox</span>
          </div>
          <span className="h-1 w-1 rounded-full bg-blue-500 self-end" />
        </div>
      </div>
    );
  }

  // Generic fallback visual
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8fafc] border border-slate-200/80 text-sm">
      💊
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();

  // Hydration safety mount check
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active filter tab: "all" | "in_transit" | "delivered" | "cancelled"
  const [filterTab, setFilterTab] = useState<"all" | "in_transit" | "delivered" | "cancelled">("all");

  // Sort by state
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  // Reorder status state
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    message: string;
    linkHref?: string;
    linkText?: string;
  } | null>(null);

  // Tracking modal state
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  // Expanded items state for orders with >3 products
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Reload orders helper
  const handleReload = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        console.error("[Orders Load Error]", err);
        setError("Unable to load your orders. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Initial auth check and data fetch
  useEffect(() => {
    let isCancelled = false;

    // Check auth session
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
        }
        return res.json();
      })
      .catch(() => {});

    // Initial load
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
          console.error("[Orders Initial Load Error]", err);
          setError("Unable to load your orders. Please try again.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [router]);

  // Format order ID helper
  const formatOrderId = (id: string) => {
    if (id.toUpperCase().startsWith("ORD-")) return id.toUpperCase();
    return `ORD-${id.slice(-4).toUpperCase()}`;
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Not available";
    if (!isMounted) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Summary counts
  const totalOrdersCount = orders.length;

  const inTransitCount = useMemo(
    () => orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length,
    [orders]
  );

  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === "DELIVERED").length,
    [orders]
  );

  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === "CANCELLED").length,
    [orders]
  );

  const subscriptionsFulfilledCount = useMemo(
    () => orders.filter((o) => o.id.startsWith("refill_") && o.status !== "CANCELLED").length,
    [orders]
  );

  // Total spent calculation across non-cancelled orders
  const totalSpent = useMemo(() => {
    return orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [orders]);

  // Filter and sort orders
  const processedOrders = useMemo(() => {
    let list = [...orders];

    // 1. Filter
    if (filterTab === "in_transit") {
      list = list.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
    } else if (filterTab === "delivered") {
      list = list.filter((o) => o.status === "DELIVERED");
    } else if (filterTab === "cancelled") {
      list = list.filter((o) => o.status === "CANCELLED");
    }

    // 2. Sort
    list.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "highest") {
        return Number(b.total) - Number(a.total);
      }
      if (sortBy === "lowest") {
        return Number(a.total) - Number(b.total);
      }
      // default newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [orders, filterTab, sortBy]);

  // Handle Reorder action
  const handleReorder = async (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setReorderingOrderId(order.id);
    setToast(null);

    const results: { success: boolean; name: string; error?: string }[] = [];

    for (const item of order.items) {
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity || 1,
          }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          results.push({ success: true, name: item.product?.name || "Item" });
        } else {
          results.push({
            success: false,
            name: item.product?.name || "Item",
            error: data.error || "Unavailable",
          });
        }
      } catch {
        results.push({
          success: false,
          name: item.product?.name || "Item",
          error: "Network error",
        });
      }
    }

    setReorderingOrderId(null);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      // Sync DashboardHeader cart badge
      window.dispatchEvent(new CustomEvent("pharmaloop_cart_updated"));
    }

    if (failed.length === 0) {
      setToast({
        type: "success",
        message: `All items from #${formatOrderId(order.id)} added to your cart.`,
        linkHref: "/cart",
        linkText: "View Cart →",
      });
    } else if (successful.length > 0) {
      setToast({
        type: "warning",
        message: `Some items were added. ${failed.length} item(s) could not be reordered (${failed.map((f) => f.name).join(", ")}).`,
        linkHref: "/cart",
        linkText: "View Cart →",
      });
    } else {
      setToast({
        type: "error",
        message: `Could not reorder items: ${failed.map((f) => f.name).join(", ")}. Products may be unavailable.`,
      });
    }
  };

  // Toggle expanded items for an order
  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 page-entrance">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className="text-slate-800">My Orders</span>
      </nav>

      {/* ─── Page Header & Premium Delivery Banner ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            My Orders
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Track past and ongoing prescription shipments, invoices, and delivery statuses.
          </p>
        </div>

        {/* Center/Right: Delivery Banner + Browse CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Promotional Delivery Banner */}
          <div className="rounded-2xl bg-[#eef8f1] border border-[#d2ebd8] px-4 py-2.5 flex items-center justify-between gap-4 shadow-xs">
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-[#0f3822] tracking-tight">
                Good Health On Its Way
              </p>
              <p className="text-[11px] font-semibold text-[#1b5e3b] mt-0.5">
                From our pharmacy to your doorstep. 💚
              </p>
            </div>

            {/* Delivery Truck Graphic Illustration */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-emerald-100 shadow-2xs">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2" />
              </svg>
            </div>
          </div>

          {/* Primary Action Button: Browse Medicines */}
          <Link
            href="/dashboard/medicines"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors shrink-0"
          >
            <span>Browse Medicines</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* ─── Feedback Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl text-xs font-medium border shadow-xs animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-[#ecfdf5] border-emerald-200 text-emerald-800"
              : toast.type === "warning"
              ? "bg-[#fffbeb] border-amber-200 text-amber-800"
              : "bg-[#fff1f2] border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "❌"}</span>
            <span>{toast.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {toast.linkHref && toast.linkText && (
              <Link href={toast.linkHref} className="font-bold underline hover:no-underline">
                {toast.linkText}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── Summary Cards (4 Cards) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Orders */}
        <div className="glass-card glass-card-interactive flex items-center gap-3.5 rounded-2xl p-4.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 border border-blue-100/60 text-blue-600 text-lg shadow-2xs">
            📦
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">Total Orders</p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 leading-tight">
              {loading ? "..." : totalOrdersCount}
            </p>
          </div>
        </div>

        {/* Card 2: Active Deliveries */}
        <div className="glass-card glass-card-interactive flex items-center gap-3.5 rounded-2xl p-4.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50/80 border border-amber-100/60 text-amber-600 text-lg shadow-2xs">
            🚚
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">Active Deliveries</p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 leading-tight">
              {loading ? "..." : inTransitCount}
            </p>
          </div>
        </div>

        {/* Card 3: Subscriptions Fulfilled */}
        <div className="glass-card glass-card-interactive flex items-center gap-3.5 rounded-2xl p-4.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] text-lg shadow-2xs">
            🔄
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">Subscriptions Fulfilled</p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 leading-tight">
              {loading ? "..." : subscriptionsFulfilledCount}
            </p>
          </div>
        </div>

        {/* Card 4: Total Spent */}
        <div className="glass-card glass-card-interactive flex items-center gap-3.5 rounded-2xl p-4.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50/80 border border-purple-100/60 text-purple-600 text-lg shadow-2xs">
            💳
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">Total Spent</p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 leading-tight">
              {loading ? "..." : `₹${Math.round(totalSpent).toLocaleString("en-IN")}`}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Filter Tabs & Sorting Row ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              filterTab === "all"
                ? "bg-[#1b5e3b] text-white shadow-xs"
                : "glass-card text-slate-700 hover:bg-white"
            }`}
          >
            All Orders ({totalOrdersCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("in_transit")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              filterTab === "in_transit"
                ? "bg-[#1b5e3b] text-white shadow-xs"
                : "glass-card text-slate-700 hover:bg-white"
            }`}
          >
            In Transit ({inTransitCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("delivered")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              filterTab === "delivered"
                ? "bg-[#1b5e3b] text-white shadow-xs"
                : "glass-card text-slate-700 hover:bg-white"
            }`}
          >
            Delivered ({deliveredCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("cancelled")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
              filterTab === "cancelled"
                ? "bg-[#1b5e3b] text-white shadow-xs"
                : "glass-card text-slate-700 hover:bg-white"
            }`}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <label htmlFor="order-sort" className="text-xs font-medium text-slate-500">
            Sort by
          </label>
          <select
            id="order-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "highest" | "lowest")}
            className="rounded-xl glass-card px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b5e3b] cursor-pointer shadow-2xs"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* ─── Main Content List ────────────────────────────────────────────── */}
      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                <div className="h-4 w-44 bg-slate-200 rounded-md" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  <div className="h-5 w-24 bg-slate-100 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded-sm" />
                    <div className="h-2.5 w-24 bg-slate-100 rounded-sm" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded-md" />
              </div>
              <div className="grid grid-cols-4 gap-4 border-t border-slate-50 pt-4">
                {[1, 2, 3, 4].map((c) => (
                  <div key={c} className="space-y-1">
                    <div className="h-2.5 w-16 bg-slate-100 rounded-sm" />
                    <div className="h-3 w-20 bg-slate-200 rounded-sm" />
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-slate-50 pt-4">
                <div className="flex gap-2">
                  <div className="h-8 w-28 bg-slate-100 rounded-xl" />
                  <div className="h-8 w-24 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-8 w-24 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="rounded-2xl bg-white p-8 border border-rose-100 shadow-xs text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mx-auto text-xl">
            ⚠️
          </div>
          <h2 className="text-sm font-bold text-slate-900">Unable to load your orders</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={handleReload}
            className="rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : processedOrders.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl bg-white p-12 border border-slate-100 shadow-xs text-center space-y-4 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl shadow-2xs">
            📦
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {totalOrdersCount === 0 ? "No orders yet" : `No ${filterTab.replace("_", " ")} orders`}
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              {totalOrdersCount === 0
                ? "Your medicine orders will appear here once you place your first order."
                : `You do not have any orders currently categorized under ${filterTab.replace("_", " ")}.`}
            </p>
          </div>

          <div className="pt-2">
            {totalOrdersCount === 0 ? (
              <Link
                href="/dashboard/medicines"
                className="rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors inline-flex items-center gap-1.5"
              >
                <span>Browse Medicines</span>
                <span>&rarr;</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                View All Orders
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Real Orders List */
        <div className="space-y-4">
          {processedOrders.map((order) => {
            const formattedId = formatOrderId(order.id);
            const placedDate = formatDate(order.createdAt);
            const isReordering = reorderingOrderId === order.id;

            // Delivery badge derivation
            const isDelivered = order.status === "DELIVERED";
            const isCancelled = order.status === "CANCELLED";
            const isShipped = order.status === "SHIPPED";

            const deliveryLabel = isDelivered
              ? "Delivered"
              : isShipped
              ? "Out for Delivery"
              : order.status === "PROCESSING"
              ? "Processing"
              : order.status === "CONFIRMED"
              ? "Confirmed"
              : isCancelled
              ? "Cancelled"
              : "Pending";

            // Payment badge derivation
            const paymentStatus = order.payment?.status;
            const paymentLabel =
              paymentStatus === "SUCCESS"
                ? "Payment: Paid"
                : paymentStatus === "FAILED"
                ? "Payment: Failed"
                : paymentStatus === "REFUNDED"
                ? "Payment: Refunded"
                : "Payment: Pending";

            // Metadata: Address
            const deliveryAddress = order.address
              ? `${order.address.label || "Home"} · ${order.address.city || order.address.state || "India"}`
              : "Not available";

            // Metadata: Payment Method
            const paymentMethod = order.payment ? "Online Payment" : "Not available";

            // Metadata: Expected Delivery
            const expectedDelivery = isDelivered ? "Delivered" : "Not available";

            // Products to show (top 3 or all if expanded)
            const items = order.items || [];
            const isExpanded = !!expandedOrders[order.id];
            const visibleItems = isExpanded ? items : items.slice(0, 3);
            const hasMoreItems = items.length > 3;

            return (
              <div
                key={order.id}
                className="glass-card glass-card-interactive rounded-2xl p-5 sm:p-6 space-y-4"
              >
                {/* ─── Order Header ──────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100/80 gap-2.5">
                  {/* Left: ID and Date */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                      #{formattedId}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Placed on {placedDate}
                    </span>
                  </div>

                  {/* Right: Badges */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Delivery Status Badge */}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur-xs ${
                        isDelivered
                          ? "bg-emerald-50/90 text-[#1b5e3b] border border-emerald-200/80 shadow-2xs"
                          : isShipped || order.status === "PROCESSING"
                          ? "bg-amber-50/90 text-amber-800 border border-amber-200/80 shadow-2xs"
                          : isCancelled
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-blue-50/90 text-blue-700 border border-blue-200/80 shadow-2xs"
                      }`}
                    >
                      {deliveryLabel}
                    </span>

                    {/* Auto-Refill Canonical Badge */}
                    {order.id.startsWith("refill_") && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/80 shadow-2xs flex items-center gap-1">
                        <span>🔄</span>
                        <span>Auto-Refill</span>
                      </span>
                    )}

                    {/* Payment Status Badge */}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur-xs ${
                        paymentStatus === "SUCCESS"
                          ? "bg-emerald-50/90 text-[#1b5e3b] border border-emerald-200/80 shadow-2xs"
                          : paymentStatus === "FAILED"
                          ? "bg-rose-50/90 text-rose-600 border border-rose-200/80 shadow-2xs"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {paymentLabel}
                    </span>
                  </div>
                </div>

                {/* ─── Product Items Strip & Authoritative Total ───────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1">
                  {/* Items list */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-1">
                    {visibleItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <OrderMedicineThumbnail
                          title={item.product?.name || "Medicine"}
                          imageUrl={item.product?.imageUrl}
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                            {item.product?.name || "Medicine"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.product?.description || "Pack"} &times; {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* +X More Items Badge */}
                    {hasMoreItems && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(order.id)}
                        className="rounded-xl bg-blue-50/90 hover:bg-blue-100/90 px-3 py-2 text-xs font-bold text-blue-600 border border-blue-100/80 transition-all cursor-pointer active:scale-[0.98]"
                      >
                        {isExpanded ? "Show less" : `+${items.length - 3} more items`}
                      </button>
                    )}
                  </div>

                  {/* Total Amount */}
                  <div className="text-left lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100/80 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Amount
                    </span>
                    <span className="text-base sm:text-lg font-black text-[#1b5e3b] tracking-tight block mt-0.5">
                      ₹{Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ─── 4-Column Metadata Strip matching reference design ──── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100/80 pt-4">
                  {/* Col 1: Order Placed */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Order Placed
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{placedDate}</span>
                    </div>
                  </div>

                  {/* Col 2: Expected Delivery */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Expected Delivery
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2" />
                      </svg>
                      <span className="truncate">{expectedDelivery}</span>
                    </div>
                  </div>

                  {/* Col 3: Delivery Address */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Delivery Address
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <svg className="h-3.5 w-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Col 4: Payment Method */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Payment Method
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <svg className="h-3.5 w-3.5 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="truncate">{paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* ─── Actions Bar ────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80 pt-3.5">
                  {/* Left: Track Shipment & Reorder */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Track Shipment Button */}
                    <button
                      type="button"
                      onClick={() => setTrackingOrder(order)}
                      className="rounded-xl bg-[#1b5e3b] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2" />
                      </svg>
                      <span>Track Shipment</span>
                    </button>

                    {/* Reorder Button */}
                    <button
                      type="button"
                      disabled={isReordering}
                      onClick={() => handleReorder(order)}
                      className="rounded-xl glass-card px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <svg
                        className={`h-3.5 w-3.5 text-slate-500 ${isReordering ? "animate-spin" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{isReordering ? "Reordering..." : "Reorder"}</span>
                    </button>
                  </div>

                  {/* Right: View Details → */}
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1b5e3b] hover:underline"
                  >
                    <span>View Details</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Bottom Benefits Strip matching reference design ─────────────── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Benefit 1: Fast Delivery */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Fast Delivery</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Get your medicines delivered at your doorstep
              </p>
            </div>
          </div>

          {/* Benefit 2: Genuine Products */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Genuine Products</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                100% authentic &amp; quality assured
              </p>
            </div>
          </div>

          {/* Benefit 3: Best Prices */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50/80 border border-amber-100/60 text-amber-700 shadow-2xs">
              <span className="text-xs font-extrabold">%</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Best Prices</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Great discounts and offers
              </p>
            </div>
          </div>

          {/* Benefit 4: Need Help? */}
          <Link
            href="/dashboard/help-support"
            className="flex items-center gap-3 group transition-all active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 border border-blue-100/60 text-blue-600 group-hover:scale-105 transition-transform shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#1b5e3b] transition-colors leading-tight">
                Need Help?
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Our support team is here for you
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── Real Track Shipment Modal Dialog ──────────────────────────────── */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setTrackingOrder(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl modal-animate-in z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef8f1] text-[#1b5e3b] text-base">
                  🚚
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Shipment Progress
                  </h3>
                  <p className="text-xs text-slate-400">
                    #{formatOrderId(trackingOrder.id)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tracking Stages Timeline based on REAL Order Status */}
            <div className="py-5 space-y-4">
              {trackingOrder.status === "CANCELLED" ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
                  <p className="font-bold">This order was cancelled</p>
                  <p className="mt-0.5 text-[11px]">No shipments or deliveries will occur for this order.</p>
                </div>
              ) : (
                (() => {
                  const status = trackingOrder.status;
                  const stages = [
                    { title: "Order Placed", key: "PENDING", isPast: true },
                    {
                      title: "Order Confirmed",
                      key: "CONFIRMED",
                      isPast: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(status),
                    },
                    {
                      title: "Processing in Pharmacy",
                      key: "PROCESSING",
                      isPast: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(status),
                    },
                    {
                      title: "Out for Delivery",
                      key: "SHIPPED",
                      isPast: ["SHIPPED", "DELIVERED"].includes(status),
                    },
                    {
                      title: "Delivered",
                      key: "DELIVERED",
                      isPast: status === "DELIVERED",
                    },
                  ];

                  return (
                    <div className="space-y-3.5 pl-2">
                      {stages.map((stage, idx) => {
                        const isLast = idx === stages.length - 1;
                        const isCurrent =
                          (status === "PENDING" && idx === 0) ||
                          (status === "CONFIRMED" && idx === 1) ||
                          (status === "PROCESSING" && idx === 2) ||
                          (status === "SHIPPED" && idx === 3) ||
                          (status === "DELIVERED" && idx === 4);

                        return (
                          <div key={stage.title} className="relative flex items-start gap-3">
                            {!isLast && (
                              <div
                                className={`absolute left-[7px] top-3.5 bottom-0 w-[2px] ${
                                  stage.isPast && !isCurrent ? "bg-[#1b5e3b]" : "bg-slate-200"
                                }`}
                              />
                            )}
                            <div className="z-10 mt-0.5 shrink-0">
                              {isCurrent ? (
                                <div className="h-4 w-4 rounded-full bg-[#1b5e3b] ring-4 ring-emerald-100 flex items-center justify-center text-white text-[9px] font-bold">
                                  ✓
                                </div>
                              ) : stage.isPast ? (
                                <div className="h-4 w-4 rounded-full bg-[#1b5e3b] flex items-center justify-center text-white text-[9px] font-bold">
                                  ✓
                                </div>
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-slate-300 bg-white" />
                              )}
                            </div>
                            <div>
                              <p
                                className={`text-xs font-bold leading-tight ${
                                  isCurrent
                                    ? "text-[#1b5e3b]"
                                    : stage.isPast
                                    ? "text-slate-900"
                                    : "text-slate-400"
                                }`}
                              >
                                {stage.title}
                              </p>
                              {isCurrent && (
                                <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-md">
                                  Current Status
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Verified via PharmaLoop Pharmacy Fulfillment
              </span>
              <Link
                href={`/orders/${trackingOrder.id}`}
                onClick={() => setTrackingOrder(null)}
                className="rounded-xl bg-[#1b5e3b] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
              >
                View Full Order &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

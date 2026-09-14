"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import ErrorState from "@/components/admin/ErrorState";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";

interface MetricData {
  activeSubscriptions: number;
  pendingRefillsDue: number;
  totalOrders: number;
  lowStockCount: number;
  fulfillmentBacklog?: number;
  totalCustomers?: number;
  failedPaymentsCount?: number;
}

interface RefillItem {
  id: string;
  cycleOrderId: string;
  customer: string;
  customerEmail: string;
  medicines: string;
  frequency: string;
  scheduledDate: string;
  refillTime: string;
  autoPayStatus: string;
  observationalStatus: string;
  badgeColor: string;
  isDue: boolean;
  subscriptionStatus: string;
}

interface OrderItemProduct {
  id: string;
  name: string;
  price: string | number;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: string | number;
  product: OrderItemProduct;
}

interface OrderData {
  id: string;
  userId: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  total: string | number;
  createdAt: string;
  isRefill: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  items: OrderItem[];
  payment?: {
    status: string;
    amount: string | number;
  } | null;
}

const VALID_TRANSITIONS: Record<
  OrderData["status"],
  readonly OrderData["status"][]
> = {
  PENDING: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  PROCESSING: ["PROCESSING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "DELIVERED"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [refillQueue, setRefillQueue] = useState<RefillItem[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>();

  // Status updating state: orderId -> boolean
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>(
    {},
  );
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        setStatusCode(res.status);
        if (res.status === 403)
          throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load admin overview");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data.metrics);
        setRefillQueue(json.data.refillQueue);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading overview data",
      );
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders?page=1&limit=8", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        setStatusCode(res.status);
        if (res.status === 403)
          throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load orders");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.items);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading orders");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchOverview(), fetchOrders()]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchOverview, fetchOrders]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchOverview(), fetchOrders()]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: OrderData["status"],
  ) => {
    setUpdatingOrders((prev) => ({ ...prev, [orderId]: true }));
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Failed to update order status");

      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId ? { ...ord, status: newStatus } : ord,
        ),
      );

      setFeedbackMessage({
        type: "success",
        text: `Order #${orderId.slice(-8)} status updated to ${newStatus}. Customer notified.`,
      });

      fetchOverview();
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error updating order",
      });
    } finally {
      setUpdatingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const moduleShortcuts = [
    {
      title: "Orders",
      href: "/admin/orders",
      icon: "📦",
      desc: "Fulfillment & dispatches",
    },
    {
      title: "Products",
      href: "/admin/products",
      icon: "💊",
      desc: "Inventory & catalog",
    },
    {
      title: "Subscriptions",
      href: "/admin/subscriptions",
      icon: "🔄",
      desc: "Regimens & frequency",
    },
    {
      title: "Refills",
      href: "/admin/refills",
      icon: "⚙️",
      desc: "Telemetry & forecast",
    },
    {
      title: "Payments",
      href: "/admin/payments",
      icon: "💳",
      desc: "Financial ledger",
    },
    {
      title: "Customers",
      href: "/admin/customers",
      icon: "👥",
      desc: "Profiles & addresses",
    },
    {
      title: "Alerts",
      href: "/admin/notifications",
      icon: "🔔",
      desc: "Operational telemetry",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <AdminHeader
        title="Operations Portal Overview"
        subtitle="Live platform telemetry, recurring subscription queue, and fulfillment lifecycle management."
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
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
            <span>Refresh</span>
          </button>
        }
      />

      {feedbackMessage && (
        <div
          className={`rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between transition-all ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-[#1b5e3b] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span>{feedbackMessage.type === "success" ? "✓" : "⚠️"}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 ml-3 cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {error ? (
        <ErrorState
          statusCode={statusCode}
          message={error}
          onRetry={handleRefresh}
        />
      ) : (
        <>
          {/* Module Shortcuts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {moduleShortcuts.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="group rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-2xs hover:border-[#1b5e3b] dark:hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col items-center text-center"
              >
                <span
                  className="text-xl mb-1 group-hover:scale-110 transition-transform"
                  aria-hidden="true"
                >
                  {m.icon}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#1b5e3b] dark:group-hover:text-emerald-400">
                  {m.title}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-full">
                  {m.desc}
                </span>
              </Link>
            ))}
          </div>

          {/* Observational Notice Banner */}
          <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 p-4 sm:p-4.5 flex items-start gap-3.5">
            <div
              className="rounded-xl bg-emerald-100/80 dark:bg-emerald-900/60 p-2 text-[#1b5e3b] dark:text-emerald-300 shrink-0 text-base"
              aria-hidden="true"
            >
              ⚙️
            </div>
            <div className="text-xs sm:text-sm">
              <h2 className="font-bold text-emerald-950 dark:text-emerald-200">
                Automated System Refill Engine
              </h2>
              <p className="mt-0.5 text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed text-xs">
                PharmaLoop subscription refills are handled automatically by the
                background system worker according to each patient&apos;s cycle
                schedule. Zero manual approval or execution is required.
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          {loading && !metrics ? (
            <LoadingSkeleton variant="cards" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Active Subscriptions"
                value={metrics?.activeSubscriptions ?? 0}
                subtitle="Recurring patient prescriptions"
                icon="🔄"
                badge="Cadence"
                badgeType="brand"
              />
              <StatCard
                label="Due for Refill Now"
                value={metrics?.pendingRefillsDue ?? 0}
                subtitle="Awaiting automated worker cycle"
                icon="⏰"
                badge={metrics?.pendingRefillsDue ? "Action Queue" : "Clear"}
                badgeType={metrics?.pendingRefillsDue ? "amber" : "emerald"}
              />
              <StatCard
                label="Fulfillment Backlog"
                value={metrics?.fulfillmentBacklog ?? 0}
                subtitle="Pending warehouse dispatch"
                icon="📦"
                badge="Operations"
                badgeType="neutral"
              />
              <StatCard
                label="Low Stock Warnings"
                value={metrics?.lowStockCount ?? 0}
                subtitle="Stock count &le; 20 units"
                icon="⚠️"
                badge={metrics?.lowStockCount ? "Inventory" : "Adequate"}
                badgeType={metrics?.lowStockCount ? "rose" : "emerald"}
              />
              <StatCard
                label="Total Orders"
                value={metrics?.totalOrders ?? 0}
                subtitle="Storefront &amp; refill cycles"
                icon="📋"
                badge="All Time"
                badgeType="neutral"
              />
              <StatCard
                label="Total Registered Users"
                value={metrics?.totalCustomers ?? 0}
                subtitle="Active patient accounts"
                icon="👥"
                badge="Directory"
                badgeType="neutral"
              />
              <StatCard
                label="Payment Issues"
                value={metrics?.failedPaymentsCount ?? 0}
                subtitle="Transactions requiring review"
                icon="💳"
                badge={metrics?.failedPaymentsCount ? "Action Needed" : "Clean"}
                badgeType={metrics?.failedPaymentsCount ? "rose" : "emerald"}
              />
            </div>
          )}

          {/* Refill Observability Queue Table */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Refill Telemetry Queue
                  </h2>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/20">
                    Observational
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Scheduled patient subscription cycles handled automatically by
                  the system worker.
                </p>
              </div>

              <Link
                href="/admin/refills"
                className="text-xs font-semibold text-[#1b5e3b] hover:underline dark:text-emerald-400 self-start sm:self-auto"
              >
                View Full Refills Monitor &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Prescription Items</th>
                    <th className="py-3 px-4">Cadence</th>
                    <th className="py-3 px-4">Scheduled Refill</th>
                    <th className="py-3 px-4">Auto-Charge</th>
                    <th className="py-3 px-4 text-right">Worker State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {loading && refillQueue.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs"
                      >
                        Loading subscription queue...
                      </td>
                    </tr>
                  ) : refillQueue.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs"
                      >
                        No active subscriptions found in the database.
                      </td>
                    </tr>
                  ) : (
                    refillQueue.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {row.customer}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                            {row.customerEmail}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300">
                          {row.medicines}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                            {row.frequency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                          {formatDate(row.scheduledDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              row.autoPayStatus.includes("Paid")
                                ? "bg-emerald-50 text-[#1b5e3b] dark:bg-emerald-950/40 dark:text-emerald-300"
                                : row.autoPayStatus.includes("Failed")
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            {row.autoPayStatus.includes("Paid") && "✓ "}
                            {row.autoPayStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              row.observationalStatus.includes("Paid")
                                ? "bg-emerald-100 text-[#1b5e3b] dark:bg-emerald-900/60 dark:text-emerald-200"
                                : row.observationalStatus.includes("Due")
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                                  : row.observationalStatus.includes("Failed")
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                                    : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {row.observationalStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Storefront & Refill Orders Fulfillment Table */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Recent Orders &amp; Fulfillment
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Recent purchases placed across storefront and recurring
                  subscription refills.
                </p>
              </div>

              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-[#1b5e3b] hover:underline dark:text-emerald-400"
              >
                View Full Orders Directory &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Order ID &amp; Type</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Medicines Summary</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4 text-right">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {loading && orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs"
                      >
                        Loading platform orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400 dark:text-zinc-500 text-xs"
                      >
                        No orders found in the database.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => {
                      const isFinal =
                        ord.status === "DELIVERED" ||
                        ord.status === "CANCELLED";
                      const isUpdating = !!updatingOrders[ord.id];

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/orders/${ord.id}`}
                                className="hover:text-[#1b5e3b]"
                              >
                                #{ord.id.slice(-8)}
                              </Link>
                              {ord.isRefill ? (
                                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-bold text-[#1b5e3b] dark:text-emerald-300 ring-1 ring-emerald-600/20">
                                  🔄 Refill
                                </span>
                              ) : (
                                <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/20">
                                  📦 Store
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {ord.user?.name ?? "Customer"}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                              {ord.user?.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300 max-w-xs">
                            <div className="truncate">
                              {ord.items && ord.items.length > 0
                                ? ord.items
                                    .map(
                                      (it) =>
                                        `${it.product?.name ?? "Medicine"} (×${it.quantity})`,
                                    )
                                    .join(", ")
                                : "No items"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {formatCurrency(ord.total)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                            {formatDate(ord.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {isUpdating ? (
                                <span className="text-[10px] text-slate-500 animate-pulse">
                                  Updating...
                                </span>
                              ) : (
                                <select
                                  value={ord.status}
                                  disabled={isFinal || isUpdating}
                                  onChange={(e) =>
                                    handleUpdateStatus(
                                      ord.id,
                                      e.target.value as OrderData["status"],
                                    )
                                  }
                                  aria-label={`Update fulfillment status for order ${ord.id}`}
                                  className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {(
                                    VALID_TRANSITIONS[ord.status] || [
                                      ord.status,
                                    ]
                                  ).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

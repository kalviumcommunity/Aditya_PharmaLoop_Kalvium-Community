"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import StatCard from "@/components/admin/StatCard";
import ErrorState from "@/components/admin/ErrorState";

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  price: string | number;
}

interface FailedPayment {
  id: string;
  orderId: string;
  amount: string | number;
  createdAt: string;
  order?: {
    user: {
      name: string;
      email: string;
    };
  };
  attempts?: Array<{ failureReason?: string | null }>;
}

interface DueSubscription {
  id: string;
  nextRefillDate: string;
  refillTime: string;
  frequency: string;
  user: {
    name: string;
    email: string;
  };
  items: Array<{
    quantity: number;
    product: { name: string };
  }>;
}

interface SystemNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface AlertsData {
  summary: {
    lowStockCount: number;
    failedPaymentsCount: number;
    dueRefillsCount: number;
    totalAlerts: number;
  };
  lowStockProducts: LowStockProduct[];
  failedPayments: FailedPayment[];
  dueSubscriptions: DueSubscription[];
  systemNotifications: SystemNotification[];
}

export default function AdminNotificationsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load operational alerts");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching alerts");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        await fetchAlerts();
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchAlerts]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="System Alerts &amp; Operational Events"
        subtitle="Real-time operational alerts derived from platform inventory, payment transactions, and automated refill cycles."
        breadcrumbs={[{ label: "Alerts" }]}
        actions={
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
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
            <span>Refresh Alerts</span>
          </button>
        }
      />

      {error && !data ? (
        <ErrorState error={error} onRetry={fetchAlerts} />
      ) : (
        <>
          {error && data && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchAlerts}
                className="underline hover:no-underline font-bold text-rose-900 dark:text-rose-200 ml-3"
              >
                Retry
              </button>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Low Stock Warnings"
              value={loading && !data ? "..." : data?.summary.lowStockCount ?? 0}
              subtitle="Inventory ≤ 20 units"
              icon="⚠️"
              color="amber"
            />
            <StatCard
              label="Failed Payment Charges"
              value={loading && !data ? "..." : data?.summary.failedPaymentsCount ?? 0}
              subtitle="Requiring intervention"
              icon="💳"
              color="rose"
            />
            <StatCard
              label="Due Refill Queue"
              value={loading && !data ? "..." : data?.summary.dueRefillsCount ?? 0}
              subtitle="Awaiting worker cycle"
              icon="🔄"
              color="blue"
            />
          </div>
        </>
      )}

      {loading && !data ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          {/* Low Stock Alerts Section */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Low Stock Inventory Warnings
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Medicines approaching stock depletion (&le; 20 units remaining).
                </p>
              </div>
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Manage Inventory &rarr;
              </Link>
            </div>

            {data?.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                All medicines have healthy inventory levels (&gt; 20 units).
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {data?.lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 font-bold">
                        ⚠️
                      </span>
                      <div>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-emerald-700"
                        >
                          {p.name}
                        </Link>
                        <p className="text-[11px] text-slate-500">Unit Price: {formatCurrency(p.price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="rounded-md bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-600/20">
                        {p.stock === 0 ? "Out of Stock (0)" : `${p.stock} Units Left`}
                      </span>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        Restock &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Failed Payments Section */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Payment Failure Alerts
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Transactions that encountered gateway errors or payment declines.
                </p>
              </div>
              <Link
                href="/admin/payments"
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                View Payments Ledger &rarr;
              </Link>
            </div>

            {data?.failedPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Zero failed payment transactions recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {data?.failedPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 font-bold shrink-0">
                        ✕
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          Order #{pay.orderId.slice(-8)} — {formatCurrency(pay.amount)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Customer: {pay.order?.user.name} ({pay.order?.user.email})
                        </div>
                        {pay.attempts?.[0]?.failureReason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                            Reason: {pay.attempts[0].failureReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-slate-400 text-[11px]">{formatDate(pay.createdAt)}</span>
                      <Link
                        href={`/admin/orders/${pay.orderId}`}
                        className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        Inspect Order &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Platform Notifications from DB */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Platform Activity Dispatches
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Audit trail of notifications dispatched to patients and staff across the system.
              </p>
            </div>

            {data?.systemNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notification activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {data?.systemNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:text-zinc-300">
                          {notif.type}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {notif.title}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-zinc-300">{notif.message}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Recipient: {notif.user?.name} ({notif.user?.email})
                      </p>
                    </div>
                    <span className="text-slate-400 text-[11px] shrink-0">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

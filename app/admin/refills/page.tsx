"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import ErrorState from "@/components/admin/ErrorState";

interface DueSubscription {
  id: string;
  cycleOrderId: string;
  customer: string;
  customerEmail: string;
  medicines: string;
  frequency: string;
  scheduledDate: string;
  refillTime: string;
  cycleOrderStatus: string;
  paymentStatus: string;
}

interface UpcomingSubscription {
  id: string;
  customer: string;
  customerEmail: string;
  medicines: string;
  frequency: string;
  scheduledDate: string;
  refillTime: string;
}

interface RecentRefillOrder {
  id: string;
  total: string | number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  payment?: {
    status: string;
    amount: string | number;
  } | null;
}

interface RefillDashboardData {
  metrics: {
    activeSubscriptionsCount: number;
    dueNowCount: number;
    upcoming7DaysCount: number;
    failedCyclesCount: number;
  };
  dueSubscriptions: DueSubscription[];
  upcomingSubscriptions: UpcomingSubscription[];
  recentRefillOrders: RecentRefillOrder[];
}

export default function AdminRefillsPage() {
  const [data, setData] = useState<RefillDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"DUE" | "UPCOMING" | "ORDERS">("DUE");

  const fetchRefills = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/refills", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load refill observability data");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading refills");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        await fetchRefills();
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchRefills]);

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

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="Refills Observability"
        subtitle="Live telemetry for patient auto-refill cycles, background worker execution status, and fulfillment queues."
        breadcrumbs={[{ label: "Refills" }]}
        actions={
          <button
            type="button"
            onClick={fetchRefills}
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
            <span>Refresh Telemetry</span>
          </button>
        }
      />

      {/* Prominent Observability Notice Banner */}
      <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
        <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2 text-emerald-800 dark:text-emerald-300 shrink-0 text-xl">
          ⚙️
        </div>
        <div className="text-xs sm:text-sm">
          <h2 className="font-bold text-emerald-950 dark:text-emerald-200">
            Automated System Worker Source of Truth
          </h2>
          <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed text-xs">
            Refill cycles are executed autonomously by the PharmaLoop background refill worker. Exactly-once order generation, auto-payment verification, schedule advancement, and customer notifications require zero manual pharmacist intervention. This console provides pure operational observability.
          </p>
        </div>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={fetchRefills} />
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
                onClick={fetchRefills}
                className="underline hover:no-underline font-bold text-rose-900 dark:text-rose-200 ml-3"
              >
                Retry
              </button>
            </div>
          )}

          {/* 4 Metric Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Due Now for Worker"
              value={loading && !data ? "..." : data?.metrics.dueNowCount ?? 0}
              subtitle="Pending next run"
              icon="⏰"
              color="amber"
            />
            <StatCard
              label="Upcoming in 7 Days"
              value={loading && !data ? "..." : data?.metrics.upcoming7DaysCount ?? 0}
              subtitle="Scheduled pipeline"
              icon="📅"
              color="blue"
            />
            <StatCard
              label="Active Subscriptions"
              value={loading && !data ? "..." : data?.metrics.activeSubscriptionsCount ?? 0}
              subtitle="Live database count"
              icon="🔄"
              color="emerald"
            />
            <StatCard
              label="Failed Cycle Payments"
              value={loading && !data ? "..." : data?.metrics.failedCyclesCount ?? 0}
              subtitle="Requiring retry"
              icon="⚠️"
              color="rose"
            />
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("DUE")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors ${
            activeTab === "DUE"
              ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400"
          }`}
        >
          Due Subscriptions ({data?.dueSubscriptions.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("UPCOMING")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors ${
            activeTab === "UPCOMING"
              ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400"
          }`}
        >
          Next 7 Days Pipeline ({data?.upcomingSubscriptions.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ORDERS")}
          className={`pb-3 px-3 font-bold border-b-2 transition-colors ${
            activeTab === "ORDERS"
              ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400"
          }`}
        >
          Recent Generated Refill Orders ({data?.recentRefillOrders.length ?? 0})
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading && !data ? (
          <LoadingSkeleton rows={6} />
        ) : activeTab === "DUE" ? (
          data?.dueSubscriptions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="✓"
                title="All Refills Up to Date"
                description="Zero patient subscriptions are currently overdue for automatic worker processing."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Medicines</th>
                    <th className="py-3 px-4">Cadence</th>
                    <th className="py-3 px-4">Scheduled Due Date</th>
                    <th className="py-3 px-4">Worker Status</th>
                    <th className="py-3 px-4 text-right">Subscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {data?.dueSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{sub.customer}</div>
                        <div className="text-[11px] text-slate-400">{sub.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300">
                        {sub.medicines}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                          {sub.frequency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-amber-800 dark:text-amber-300">
                        {formatDate(sub.scheduledDate)} at {sub.refillTime}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-600/20">
                          ⏰ {sub.cycleOrderStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          View Plan &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "UPCOMING" ? (
          data?.upcomingSubscriptions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="📅"
                title="No Upcoming Refills in Next 7 Days"
                description="No patient cycles fall into the 7-day schedule window."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Medicines</th>
                    <th className="py-3 px-4">Cadence</th>
                    <th className="py-3 px-4">Next Scheduled Refill</th>
                    <th className="py-3 px-4 text-right">Subscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {data?.upcomingSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{sub.customer}</div>
                        <div className="text-[11px] text-slate-400">{sub.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300">
                        {sub.medicines}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                          {sub.frequency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                        {formatDate(sub.scheduledDate)} at {sub.refillTime}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          View Plan &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          data?.recentRefillOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="📦"
                title="No Refill Orders Generated"
                description="The worker has not generated any cycle orders yet."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Refill Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Date Generated</th>
                    <th className="py-3 px-4">Fulfillment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {data?.recentRefillOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        #{ord.id.slice(-10)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{ord.user?.name ?? "Patient"}</div>
                        <div className="text-[11px] text-slate-400">{ord.user?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ord.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.payment?.status ?? "PENDING"} type="PAYMENT" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                        {formatDate(ord.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.status} type="ORDER" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          View Order &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

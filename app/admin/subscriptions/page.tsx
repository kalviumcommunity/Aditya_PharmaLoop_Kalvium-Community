"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";
import SearchFilterBar from "@/components/admin/SearchFilterBar";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import ErrorState from "@/components/admin/ErrorState";

interface SubscriptionItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: string | number;
    stock: number;
  };
}

interface SubscriptionData {
  id: string;
  userId: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  nextRefillDate: string;
  refillTime: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  address: {
    id: string;
    city: string;
    state: string;
  };
  items: SubscriptionItem[];
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [freqFilter, setFreqFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (freqFilter !== "ALL") params.set("frequency", freqFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load subscriptions");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setSubscriptions(json.data.items);
        setTotalCount(json.data.pagination.totalCount);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching subscriptions");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, freqFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchSubscriptions]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="Subscriptions Management"
        subtitle="Active patient refill regimens, recurrence frequencies, and scheduled fulfillment dates."
        breadcrumbs={[{ label: "Subscriptions" }]}
        actions={
          <button
            type="button"
            onClick={fetchSubscriptions}
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
            <span>Refresh</span>
          </button>
        }
      />

      {error && subscriptions.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchSubscriptions}
            className="underline hover:no-underline font-bold text-rose-900 dark:text-rose-200 ml-3"
          >
            Retry
          </button>
        </div>
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Search customer name, email, or subscription ID..."
        filters={[
          {
            key: "status",
            label: "Filter by status",
            value: statusFilter,
            options: [
              { value: "ALL", label: "All Statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "PAUSED", label: "Paused" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
            onChange: (st) => {
              setStatusFilter(st);
              setPage(1);
            },
          },
          {
            key: "frequency",
            label: "Filter by frequency",
            value: freqFilter,
            options: [
              { value: "ALL", label: "All Cadences" },
              { value: "WEEKLY", label: "Weekly (Every 7 days)" },
              { value: "BIWEEKLY", label: "Bi-Weekly (Every 14 days)" },
              { value: "MONTHLY", label: "Monthly (Every 30 days)" },
            ],
            onChange: (f) => {
              setFreqFilter(f);
              setPage(1);
            },
          },
        ]}
        onClear={() => {
          setSearchQuery("");
          setStatusFilter("ALL");
          setFreqFilter("ALL");
          setPage(1);
        }}
      />

      {error && subscriptions.length === 0 ? (
        <ErrorState error={error} onRetry={fetchSubscriptions} />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          {loading && subscriptions.length === 0 ? (
            <LoadingSkeleton rows={8} />
          ) : subscriptions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="🔄"
              title="No Subscriptions Found"
              description="No patient subscriptions match your current filter selection."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Subscription ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Prescription Medicines</th>
                  <th className="py-3 px-4">Recurrence</th>
                  <th className="py-3 px-4">Next Refill Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                      >
                        #{sub.id.slice(-8)}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {sub.user?.name ?? "Customer"}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {sub.user?.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300 max-w-xs truncate">
                      {sub.items && sub.items.length > 0
                        ? sub.items.map((it) => `${it.product?.name ?? "Medicine"} (×${it.quantity})`).join(", ")
                        : "No items"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                        {sub.frequency}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                      <div>{formatDate(sub.nextRefillDate)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">at {sub.refillTime}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} type="SUBSCRIPTION" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
          disabled={loading}
        />
      </div>
      )}
    </div>
  );
}

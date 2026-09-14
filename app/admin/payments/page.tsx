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

interface PaymentAttempt {
  id: string;
  status: string;
  failureReason?: string | null;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  orderId: string;
  amount: string | number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  paymentMethod: "ONLINE" | "COD";
  provider?: string | null;
  currency?: string | null;
  providerOrderId?: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    status: string;
    total: string | number;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  attempts?: PaymentAttempt[];
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (methodFilter !== "ALL") params.set("method", methodFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load payment transactions");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setPayments(json.data.items);
        setTotalCount(json.data.pagination.totalCount);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching payments");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="Payments &amp; Transactions"
        subtitle="Operational audit log of customer charges, gateway settlements, COD records, and auto-refill payment attempts."
        breadcrumbs={[{ label: "Payments" }]}
        actions={
          <button
            type="button"
            onClick={fetchPayments}
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

      {error && payments.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchPayments}
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
        searchPlaceholder="Search order ID, customer name, email, or gateway ref..."
        filters={[
          {
            key: "status",
            label: "Filter by status",
            value: statusFilter,
            options: [
              { value: "ALL", label: "All Payment Statuses" },
              { value: "SUCCESS", label: "Success / Paid" },
              { value: "PENDING", label: "Pending" },
              { value: "FAILED", label: "Failed" },
              { value: "REFUNDED", label: "Refunded" },
            ],
            onChange: (st) => {
              setStatusFilter(st);
              setPage(1);
            },
          },
          {
            key: "method",
            label: "Filter by method",
            value: methodFilter,
            options: [
              { value: "ALL", label: "All Methods" },
              { value: "ONLINE", label: "Online (Razorpay)" },
              { value: "COD", label: "Cash on Delivery (COD)" },
            ],
            onChange: (m) => {
              setMethodFilter(m);
              setPage(1);
            },
          },
        ]}
        onClear={() => {
          setSearchQuery("");
          setStatusFilter("ALL");
          setMethodFilter("ALL");
          setPage(1);
        }}
      />

      {error && payments.length === 0 ? (
        <ErrorState error={error} onRetry={fetchPayments} />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          {loading && payments.length === 0 ? (
            <LoadingSkeleton rows={8} />
          ) : payments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="💳"
              title="No Payment Records Found"
              description="No transaction records match the current filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Order &amp; Payment Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method &amp; Provider</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Transaction Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {payments.map((p) => {
                  const lastAttempt = p.attempts?.[0];

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <Link
                          href={`/admin/orders/${p.orderId}`}
                          className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors font-mono"
                        >
                          #{p.orderId.slice(-10)}
                        </Link>
                        {p.providerOrderId && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                            {p.providerOrderId}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.order?.user?.name ?? "Customer"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.order?.user?.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.amount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-zinc-200">
                          {p.paymentMethod}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.paymentMethod === "ONLINE" ? (p.provider || "Razorpay Gateway") : "Pay on Arrival"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} type="PAYMENT" />
                        {p.status === "FAILED" && lastAttempt?.failureReason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate max-w-xs mt-0.5">
                            Reason: {lastAttempt.failureReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                        {formatDate(p.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/orders/${p.orderId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
                        >
                          View Order &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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

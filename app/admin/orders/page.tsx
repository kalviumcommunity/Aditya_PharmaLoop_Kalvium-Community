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

interface OrderItemProduct {
  id: string;
  name: string;
  price: string | number;
  stock?: number;
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
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
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
    paymentMethod?: string;
  } | null;
}

const ORDER_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ORDER_TYPE_OPTIONS = [
  { value: "ALL", label: "All Order Types" },
  { value: "STOREFRONT", label: "Storefront Orders" },
  { value: "REFILL", label: "Auto-Refill Cycles" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest First" },
  { value: "createdAt_asc", label: "Oldest First" },
  { value: "total_desc", label: "Highest Amount" },
  { value: "total_asc", label: "Lowest Amount" },
];

const VALID_TRANSITIONS: Record<OrderData["status"], readonly OrderData["status"][]> = {
  PENDING: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  PROCESSING: ["PROCESSING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "DELIVERED"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>();

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState("createdAt_desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sortBy, sortOrder] = sortOption.split("_");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        setStatusCode(res.status);
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load orders");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.items);
        setTotalCount(json.data.pagination.totalCount);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading orders");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, sortOption, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderData["status"]) => {
    setUpdatingOrders((prev) => ({ ...prev, [orderId]: true }));
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update order status");

      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      );

      setFeedback({
        type: "success",
        text: `Order #${orderId.slice(-8)} updated to ${newStatus}. Customer notified.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error updating order status",
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="Orders &amp; Fulfillment"
        subtitle="Live platform orders directory, recurring refill cycles, and fulfillment status progressions."
        breadcrumbs={[{ label: "Orders" }]}
        actions={
          <button
            type="button"
            onClick={fetchOrders}
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

      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-[#1b5e3b] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
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
          onRetry={fetchOrders}
        />
      ) : (
        <>
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            searchPlaceholder="Search order ID, customer name or email..."
            filters={[
              {
                key: "status",
                label: "Filter by status",
                value: statusFilter,
                options: ORDER_STATUS_OPTIONS,
                onChange: (st) => {
                  setStatusFilter(st);
                  setPage(1);
                },
              },
              {
                key: "type",
                label: "Filter by order type",
                value: typeFilter,
                options: ORDER_TYPE_OPTIONS,
                onChange: (t) => {
                  setTypeFilter(t);
                  setPage(1);
                },
              },
              {
                key: "sort",
                label: "Sort orders",
                value: sortOption,
                options: SORT_OPTIONS,
                onChange: (s) => setSortOption(s),
              },
            ]}
            onClear={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setTypeFilter("ALL");
              setSortOption("createdAt_desc");
              setPage(1);
            }}
          />

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
            {loading && orders.length === 0 ? (
              <LoadingSkeleton variant="table" rows={8} />
            ) : orders.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="📦"
                  title="No Orders Found"
                  description="No orders match your current filters. Try changing your search query or status filter."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Order ID &amp; Type</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Medicines</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Order Date</th>
                      <th className="py-3 px-4">Fulfillment Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {orders.map((ord) => {
                      const isFinal = ord.status === "DELIVERED" || ord.status === "CANCELLED";
                      const isUpdating = !!updatingOrders[ord.id];

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/orders/${ord.id}`}
                                className="font-bold text-slate-900 dark:text-white hover:text-[#1b5e3b] dark:hover:text-emerald-400 transition-colors"
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

                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300 max-w-xs truncate">
                            {ord.items && ord.items.length > 0
                              ? ord.items.map((it) => `${it.product?.name ?? "Medicine"} (×${it.quantity})`).join(", ")
                              : "No items"}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {formatCurrency(ord.total)}
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge
                              status={ord.payment?.status ?? "PENDING"}
                              type="PAYMENT"
                            />
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                            {formatDate(ord.createdAt)}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
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
                                      e.target.value as OrderData["status"]
                                    )
                                  }
                                  aria-label={`Update fulfillment status for order ${ord.id}`}
                                  className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {(VALID_TRANSITIONS[ord.status] || [ord.status]).map(
                                    (opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    )
                                  )}
                                </select>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/admin/orders/${ord.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b5e3b] hover:underline dark:text-emerald-400 transition-colors"
                            >
                              <span>View Details</span>
                              <span>&rarr;</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalCount > pageSize && (
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

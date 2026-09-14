"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import ErrorState from "@/components/admin/ErrorState";

interface ProductInfo {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  stock: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: string | number;
  product: ProductInfo;
}

interface PaymentAttempt {
  id: string;
  status: string;
  failureReason?: string | null;
  createdAt: string;
}

interface PaymentInfo {
  id: string;
  amount: string | number;
  status: string;
  paymentMethod: string;
  provider?: string | null;
  currency?: string | null;
  providerOrderId?: string | null;
  createdAt: string;
  attempts?: PaymentAttempt[];
}

interface OrderDetail {
  id: string;
  userId: string;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: string | number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string | null;
  isRefill: boolean;
  feedback?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    createdAt: string;
  };
  address: {
    id: string;
    label?: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  payment?: PaymentInfo | null;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  PROCESSING: ["PROCESSING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "DELIVERED"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
};

const LIFECYCLE_STAGES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>();
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        setStatusCode(res.status);
        if (res.status === 404) throw new Error("Order not found");
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load order details");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setOrder(json.data);
      } else {
        throw new Error(json.error || "Order data unavailable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching order");
    }
  }, [orderId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        await fetchOrder();
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchOrder]);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchOrder();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderDetail["status"]) => {
    if (!order) return;
    setUpdating(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update order status");
      }

      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setFeedback({
        type: "success",
        text: `Order status successfully transitioned to ${newStatus}. Customer notified.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update status",
      });
    } finally {
      setUpdating(false);
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

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <ErrorState
          statusCode={statusCode}
          message={error || "The requested order could not be found."}
          onRetry={handleManualRefresh}
        />
        <div className="text-center pt-2">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b5e3b] hover:underline dark:text-emerald-400"
          >
            &larr; Return to Orders Directory
          </Link>
        </div>
      </div>
    );
  }

  const isFinal = order.status === "DELIVERED" || order.status === "CANCELLED";
  const allowedTransitions = (VALID_TRANSITIONS[order.status] || [order.status]).filter(
    (st) => st !== order.status
  );

  const currentStageIndex = LIFECYCLE_STAGES.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title={`Order #${order.id.slice(-8)}`}
        subtitle={`Placed on ${formatDate(order.createdAt)} • Full operational audit trail and lifecycle transition manager.`}
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: `#${order.id.slice(-8)}` },
        ]}
        actions={
          <Link
            href="/admin/orders"
            className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            &larr; Back to Orders
          </Link>
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
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="opacity-70 hover:opacity-100 ml-3 cursor-pointer"
            aria-label="Dismiss feedback"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner with Badges & Transition Actions */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
            Order Type:
          </span>
          {order.isRefill ? (
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-bold text-[#1b5e3b] dark:text-emerald-300 ring-1 ring-emerald-600/20">
              🔄 Scheduled Refill Cycle
            </span>
          ) : (
            <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/20">
              📦 Storefront Purchase
            </span>
          )}
          <StatusBadge status={order.status} type="ORDER" />
          <StatusBadge status={order.payment?.status ?? "PENDING"} type="PAYMENT" />
        </div>

        {/* Transition Selector */}
        <div className="flex items-center gap-2">
          {isFinal ? (
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Terminal State: {order.status}
            </span>
          ) : (
            <>
              <label htmlFor="status-select" className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                Advance Stage:
              </label>
              <select
                id="status-select"
                value={order.status}
                disabled={updating}
                onChange={(e) => handleUpdateStatus(e.target.value as OrderDetail["status"])}
                className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 disabled:opacity-50 cursor-pointer"
              >
                <option value={order.status} disabled>
                  Current: {order.status}
                </option>
                {allowedTransitions.map((st) => (
                  <option key={st} value={st}>
                    Transition to &rarr; {st}
                  </option>
                ))}
              </select>
              {updating && (
                <span className="text-[10px] text-slate-400 animate-pulse">
                  Saving...
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Visual Status Progression Stepper */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-4">
          Fulfillment Lifecycle Progression
        </h3>
        {isCancelled ? (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3">
            <span className="text-xl">🛑</span>
            <div className="text-xs">
              <p className="font-bold text-rose-900 dark:text-rose-200">
                Order Cancelled
              </p>
              <p className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5">
                This order was terminated on {formatDate(order.updatedAt)}. No further fulfillment will take place.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPast = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <div
                  key={stage}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-[#1b5e3b] text-[#1b5e3b] dark:text-emerald-300 font-bold shadow-2xs"
                      : isPast
                      ? "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
                      : "bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 text-slate-400 dark:text-zinc-600"
                  }`}
                >
                  <div className="text-xs font-bold">
                    {isPast ? "✓ " : isCurrent ? "● " : ""}
                    {stage}
                  </div>
                  <div className="text-[10px] mt-1 text-slate-500 dark:text-zinc-400">
                    {isCurrent
                      ? `Active (${formatDate(order.updatedAt)})`
                      : isPast && idx === 0
                      ? `Placed (${formatDate(order.createdAt)})`
                      : isPast
                      ? "Completed"
                      : "Pending"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 Column Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Customer Profile
            </h3>
            <Link
              href={`/admin/customers/${order.userId}`}
              className="text-[11px] font-semibold text-[#1b5e3b] hover:underline dark:text-emerald-400"
            >
              View Profile &rarr;
            </Link>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-slate-900 dark:text-white text-sm">{order.user.name}</p>
            <p className="text-slate-500 dark:text-zinc-400">
              <span className="font-semibold text-slate-700 dark:text-zinc-300">Email:</span> {order.user.email}
            </p>
            {order.user.phone && (
              <p className="text-slate-500 dark:text-zinc-400">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Phone:</span> {order.user.phone}
              </p>
            )}
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 pt-1 font-mono">
              User ID: {order.userId}
            </p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-3">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Shipping Destination
            </h3>
          </div>
          <div className="space-y-1 text-xs text-slate-600 dark:text-zinc-300">
            {order.address.label && (
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-bold text-[10px] text-slate-700 dark:text-zinc-300 mb-1">
                {order.address.label}
              </span>
            )}
            <p className="font-semibold text-slate-900 dark:text-white">{order.address.address}</p>
            <p>
              {order.address.city}, {order.address.state} — {order.address.postalCode}
            </p>
            <p className="text-slate-400 dark:text-zinc-500">{order.address.country}</p>
          </div>
        </div>

        {/* Safe Payment Information */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-3">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Payment Record
            </h3>
          </div>
          {order.payment ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Status:</span>
                <StatusBadge status={order.payment.status} type="PAYMENT" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Method:</span>
                <span className="font-bold text-slate-900 dark:text-white">{order.payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Amount Charged:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(order.payment.amount)}
                </span>
              </div>
              {order.payment.providerOrderId && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Gateway Ref:</span>
                  <span className="font-mono text-slate-600 dark:text-zinc-400 truncate max-w-[140px]">
                    {order.payment.providerOrderId}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No payment record attached to this order.</p>
          )}
        </div>
      </div>

      {/* Customer Feedback Card (if submitted) */}
      {order.feedback && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>⭐</span>
              <span>Customer Feedback &amp; Review</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Submitted on {formatDate(order.feedback.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex text-amber-400 text-base">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>
                  {star <= order.feedback!.rating ? "★" : "☆"}
                </span>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {order.feedback.rating} / 5 Stars
            </span>
            <span className="text-xs text-slate-500 font-medium">
              (
              {order.feedback.rating === 5
                ? "Excellent"
                : order.feedback.rating === 4
                  ? "Very Good"
                  : order.feedback.rating === 3
                    ? "Good"
                    : order.feedback.rating === 2
                      ? "Fair"
                      : "Poor"}
              )
            </span>
          </div>
          {order.feedback.comment && (
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 p-3 text-xs text-slate-700 dark:text-slate-300 italic">
              &ldquo;{order.feedback.comment}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Ordered Items Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Prescription &amp; Medicine Items
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {order.items.map((it) => {
                const price = typeof it.price === "string" ? parseFloat(it.price) : Number(it.price);
                const subtotal = price * it.quantity;

                return (
                  <tr key={it.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{it.product?.name ?? "Medicine Product"}</div>
                      {it.product?.description && (
                        <div className="text-[11px] font-normal text-slate-400 truncate max-w-md mt-0.5">
                          {it.product.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300">
                      {formatCurrency(it.price)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                      ×{it.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50">
              <tr>
                <td colSpan={3} className="py-3.5 px-4 text-right font-bold text-slate-700 dark:text-zinc-300">
                  Total Order Amount:
                </td>
                <td className="py-3.5 px-4 text-right font-black text-sm text-slate-900 dark:text-white">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

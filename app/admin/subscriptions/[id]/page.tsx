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

interface SubscriptionItem {
  id: string;
  quantity: number;
  product: ProductInfo;
}

interface CycleOrder {
  id: string;
  total: string | number;
  status: string;
  createdAt: string;
  payment?: {
    id: string;
    amount: string | number;
    status: string;
    paymentMethod: string;
  } | null;
}

interface SubscriptionDetail {
  id: string;
  userId: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  nextRefillDate: string;
  refillTime: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  pausedAt?: string | null;
  cancelledAt?: string | null;
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
    label?: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: SubscriptionItem[];
  cycleOrders: CycleOrder[];
}

export default function AdminSubscriptionDetailPage() {
  const params = useParams();
  const subscriptionId = params?.id as string;

  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!subscriptionId) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Subscription not found");
        if (res.status === 403) throw new Error("Admin authorization required");
        throw new Error("Failed to load subscription details");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setSubscription(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching subscription");
    }
  }, [subscriptionId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        await fetchSubscription();
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchSubscription]);

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

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <LoadingSkeleton variant="detail" rows={6} />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <ErrorState
          error={error || "Subscription not found."}
          onRetry={fetchSubscription}
          backHref="/admin/subscriptions"
          backLabel="Return to Subscriptions"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title={`Subscription #${subscription.id.slice(-8)}`}
        subtitle="Patient auto-refill regimen profile, recurrence cadence, and cycle order history."
        breadcrumbs={[
          { label: "Subscriptions", href: "/admin/subscriptions" },
          { label: `#${subscription.id.slice(-8)}` },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/subscriptions"
              className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              &larr; Back to Subscriptions
            </Link>
          </div>
        }
      />

      {/* Overview Stat Badges */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Status:</span>
          <StatusBadge status={subscription.status} type="SUBSCRIPTION" />
          <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300">
            Cadence: {subscription.frequency}
          </span>
          <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-[#1b5e3b] dark:text-emerald-300">
            Next Refill: {formatDate(subscription.nextRefillDate)} at {subscription.refillTime}
          </span>
        </div>

        <div className="text-xs text-slate-400">
          Created: {formatDate(subscription.createdAt)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Patient Account
            </h3>
            <Link
              href={`/admin/customers/${subscription.userId}`}
              className="text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View Profile &rarr;
            </Link>
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-slate-900 dark:text-white text-sm">{subscription.user.name}</p>
            <p className="text-slate-500 dark:text-zinc-400">
              <span className="font-semibold text-slate-700 dark:text-zinc-300">Email:</span> {subscription.user.email}
            </p>
            {subscription.user.phone && (
              <p className="text-slate-500 dark:text-zinc-400">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Phone:</span> {subscription.user.phone}
              </p>
            )}
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 pt-1">User ID: {subscription.userId}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Delivery Destination
            </h3>
          </div>
          <div className="space-y-1 text-xs text-slate-600 dark:text-zinc-300">
            {subscription.address.label && (
              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-bold text-[10px] text-slate-700 dark:text-zinc-300 mb-1">
                {subscription.address.label}
              </span>
            )}
            <p className="font-semibold text-slate-900 dark:text-white">{subscription.address.address}</p>
            <p>
              {subscription.address.city}, {subscription.address.state} — {subscription.address.postalCode}
            </p>
            <p className="text-slate-400 dark:text-zinc-500">{subscription.address.country}</p>
          </div>
        </div>
      </div>

      {/* Subscription Items */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Subscribed Prescription Medicines</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Quantity per Refill</th>
                <th className="py-3 px-4 text-right">Cycle Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {subscription.items.map((it) => {
                const price = typeof it.product.price === "string" ? parseFloat(it.product.price) : Number(it.product.price);
                const subtotal = price * it.quantity;

                return (
                  <tr key={it.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{it.product.name}</div>
                      {it.product.description && (
                        <div className="text-[11px] font-normal text-slate-400 truncate max-w-md">
                          {it.product.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300">
                      {formatCurrency(it.product.price)}
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
          </table>
        </div>
      </div>

      {/* Refill Cycle Orders */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Refill Cycle Fulfillment History</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Orders generated automatically by the platform worker for this subscription.
          </p>
        </div>

        {subscription.cycleOrders.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No cycle orders have been generated yet. Next scheduled run is {formatDate(subscription.nextRefillDate)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Cycle Order ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Date Generated</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {subscription.cycleOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono">
                      #{ord.id.slice(-10)}
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
        )}
      </div>
    </div>
  );
}

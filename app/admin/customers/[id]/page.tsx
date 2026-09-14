"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import ErrorState from "@/components/admin/ErrorState";

interface Address {
  id: string;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface OrderRecord {
  id: string;
  total: string | number;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    product: { name: string };
  }>;
  payment?: {
    status: string;
    paymentMethod: string;
  } | null;
}

interface SubscriptionRecord {
  id: string;
  frequency: string;
  status: string;
  nextRefillDate: string;
  refillTime: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    product: { name: string };
  }>;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  emailVerifiedAt?: string | null;
  createdAt: string;
  addresses: Address[];
  orders: OrderRecord[];
  subscriptions: SubscriptionRecord[];
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Customer profile not found");
        if (res.status === 403) throw new Error("Admin authorization required");
        throw new Error("Failed to load customer profile");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setCustomer(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading customer");
    }
  }, [customerId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        await fetchCustomer();
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchCustomer]);

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

  if (error || !customer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <ErrorState
          error={error || "Customer profile could not be found."}
          onRetry={fetchCustomer}
          backHref="/admin/customers"
          backLabel="Return to Customer Directory"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title={customer.name}
        subtitle={`Patient member since ${formatDate(customer.createdAt)} • Account activity, shipping addresses, and orders.`}
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              &larr; Back to Directory
            </Link>
          </div>
        }
      />

      {/* Profile Overview Card */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div>
            <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Email Address</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{customer.email}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {customer.emailVerifiedAt ? "✓ Email Verified" : "⚠️ Unverified"}
            </p>
          </div>

          <div>
            <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Phone Number</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {customer.phone || "Not provided"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Primary contact</p>
          </div>

          <div>
            <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Role &amp; Permissions</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{customer.role}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {customer.role === "ADMIN" ? "Staff Administrator" : "Standard Patient"}
            </p>
          </div>

          <div>
            <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">User Identifier</p>
            <p className="font-mono text-xs text-slate-600 dark:text-zinc-300 mt-0.5 truncate">{customer.id}</p>
            <p className="text-[11px] text-slate-500 mt-1">Created: {formatDate(customer.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Saved Addresses */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
          Registered Delivery Addresses ({customer.addresses.length})
        </h2>

        {customer.addresses.length === 0 ? (
          <p className="text-xs text-slate-400">No saved addresses on file.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customer.addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 text-xs space-y-1"
              >
                {addr.label && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-bold text-[10px] text-slate-800 dark:text-zinc-200 mb-1">
                    {addr.label}
                  </span>
                )}
                <p className="font-semibold text-slate-900 dark:text-white">{addr.address}</p>
                <p className="text-slate-600 dark:text-zinc-400">
                  {addr.city}, {addr.state} — {addr.postalCode}
                </p>
                <p className="text-slate-400 text-[11px]">{addr.country}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Subscriptions */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Active Subscriptions ({customer.subscriptions.length})
          </h2>
        </div>

        {customer.subscriptions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            This customer has no active auto-refill subscriptions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Medicines</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4">Next Refill Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {customer.subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono">
                      #{sub.id.slice(-8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300">
                      {sub.items.map((i) => `${i.product.name} (×${i.quantity})`).join(", ")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                        {sub.frequency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                      {formatDate(sub.nextRefillDate)} at {sub.refillTime}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sub.status} type="SUBSCRIPTION" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
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
      </div>

      {/* Customer Orders */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Order History ({customer.orders.length})
          </h2>
        </div>

        {customer.orders.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No orders placed by this customer yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {customer.orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      #{ord.id.slice(-8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-zinc-300 max-w-xs truncate">
                      {ord.items.map((i) => `${i.product.name} (×${i.quantity})`).join(", ")}
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
                        View &rarr;
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

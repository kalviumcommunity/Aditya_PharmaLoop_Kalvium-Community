"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PaymentHistoryItem {
  id: string;
  amount: string | number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  paymentMethod: "ONLINE" | "COD";
  provider?: string | null;
  currency?: string | null;
  createdAt: string;
  order: {
    id: string;
    createdAt: string;
    status: string;
  };
}

const statusStyles: Record<PaymentHistoryItem["status"], string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.success)
          throw new Error(json.error || "Unable to load payment history");
        if (!cancelled) setPayments(Array.isArray(json.data) ? json.data : []);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load payment history",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 page-entrance">
      <div>
        <p className="text-xs font-semibold text-slate-400">Account</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
          Payments
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Your payment history
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl shadow-xs">
        {loading ? (
          <div className="space-y-4 p-6 animate-pulse">
            <div className="h-5 w-48 rounded bg-slate-200" />
            <div className="h-14 rounded-xl bg-slate-100" />
            <div className="h-14 rounded-xl bg-slate-100" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-700">{error}</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl">💳</div>
            <h2 className="mt-3 text-base font-bold text-slate-900">
              No payments yet
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Completed and pending order payments will appear here.
            </p>
            <Link
              href="/dashboard/medicines"
              className="mt-4 inline-flex rounded-xl bg-[#166534] px-4 py-2.5 text-xs font-bold text-white"
            >
              Browse medicines
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Payment</span>
                <span>Order</span>
                <span>Date</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr] items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {payment.paymentMethod === "COD"
                        ? "Cash on Delivery"
                        : "Online Payment"}
                    </p>
                    {payment.provider && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {payment.provider}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/orders/${payment.order.id}`}
                    className="text-xs font-semibold text-[#166534] hover:underline"
                  >
                    #{payment.order.id}
                  </Link>
                  <span className="text-xs text-slate-600">
                    {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {payment.currency === "INR" || !payment.currency
                      ? "₹"
                      : `${payment.currency} `}
                    {Number(payment.amount).toFixed(2)}
                  </span>
                  <span
                    className={`w-fit rounded-md border px-2 py-1 text-[10px] font-bold ${statusStyles[payment.status]}`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

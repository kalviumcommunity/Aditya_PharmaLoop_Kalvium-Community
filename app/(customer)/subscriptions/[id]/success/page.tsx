"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import SubscriptionSuccessCard from "@/components/dashboard/success/SubscriptionSuccessCard";

interface SubscriptionItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: string | number;
  };
}

interface SubscriptionData {
  id: string;
  frequency: string;
  nextRefillDate: string;
  refillTime: string;
  address?: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  items: SubscriptionItem[];
}

interface SubscriptionSuccessPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SubscriptionSuccessPage({ params }: SubscriptionSuccessPageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;

  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    fetch(`/api/subscriptions/${rawId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && json.data) {
          setSub(json.data);
        }
      })
      .catch((err) => {
        console.error("[SubscriptionSuccessPage] Fetch error:", err);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [rawId]);

  const primaryItem = sub?.items?.[0];
  const itemQty = primaryItem?.quantity || 1;
  const unitPrice = primaryItem?.product?.price ? Number(primaryItem.product.price) : 35.0;
  const totalPrice = unitPrice * itemQty;

  const startDateFormatted = sub?.nextRefillDate
    ? new Date(sub.nextRefillDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  const addressString = sub?.address
    ? `${sub.address.address}, ${sub.address.city}, ${sub.address.state} - ${sub.address.postalCode}`
    : undefined;

  const formatFrequency = (freq?: string) => {
    if (!freq) return "Monthly";
    switch (freq) {
      case "WEEKLY":
        return "Every Week";
      case "BIWEEKLY":
        return "Every 2 Weeks";
      case "MONTHLY":
        return "Every Month";
      default:
        return freq;
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6 text-center space-y-6 pb-16">
      {/* Success Hero Area */}
      <div className="flex flex-col items-center">
        {/* Large Green Success Icon */}
        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#1b5e3b] text-white shadow-lg shadow-emerald-900/10 ring-8 ring-emerald-100/80">
          <svg
            className="h-8 w-8 sm:h-10 sm:w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Subscription Created Successfully!
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500 max-w-md">
          Your medicine refill has been scheduled and auto-pay is configured.
        </p>
      </div>

      {loading ? (
        <div className="w-full max-w-xl mx-auto rounded-3xl bg-white border border-slate-100 p-8 shadow-xs animate-pulse space-y-4">
          <div className="h-14 bg-slate-100 rounded-2xl" />
          <div className="h-48 bg-slate-50 rounded-2xl" />
        </div>
      ) : (
        /* Subscription Details & Next Steps Card */
        <div className="space-y-6">
          <SubscriptionSuccessCard
            subscriptionId={rawId}
            medicineName={primaryItem?.product?.name}
            description={primaryItem?.product?.description || undefined}
            frequency={formatFrequency(sub?.frequency)}
            startDate={startDateFormatted}
            price={totalPrice}
            deliveryAddress={addressString}
            deliverySlot={sub?.refillTime ? `${sub.refillTime} slot` : undefined}
          />

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/subscriptions"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-sm active:scale-[0.98] transition-all gap-2"
            >
              <span>View All Subscriptions</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-6 py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

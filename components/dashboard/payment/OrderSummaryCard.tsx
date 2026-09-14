"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrderSummaryCardProps {
  subscriptionId?: string;
  productId?: string;
  addressId?: string;
  quantity?: number;
  medicineName?: string;
  description?: string;
  frequency?: string;
  startDate?: string;
  startDateISO?: string;
  deliveryTime?: string;
  price?: number | string;
  onSuccess?: (newSubId: string) => void;
}

export default function OrderSummaryCard({
  subscriptionId,
  productId,
  addressId,
  quantity = 1,
  medicineName = "Crocin 650",
  description = "Standard Refill Pack",
  frequency = "Weekly",
  startDate,
  startDateISO,
  deliveryTime = "09:00",
  price = 35.0,
  onSuccess,
}: OrderSummaryCardProps) {
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numPrice =
    typeof price === "number" ? price : parseFloat(price || "0") || 35.0;
  const numQuantity = Math.max(1, quantity || 1);
  const subtotal = numPrice * numQuantity;

  const formattedStart =
    startDate ||
    (startDateISO
      ? new Date(startDateISO).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }));

  const handleConfirm = async () => {
    if (isSubscribing) return;
    setErrorMessage(null);

    // If subscription already exists (e.g. reviewing existing), navigate to success
    if (subscriptionId && !productId) {
      router.push(`/subscriptions/${subscriptionId}/success`);
      return;
    }

    if (!productId) {
      setErrorMessage("Please select a valid product to schedule.");
      return;
    }

    if (!addressId) {
      setErrorMessage(
        "Please select or add a delivery address above before continuing.",
      );
      return;
    }

    try {
      setIsSubscribing(true);

      // Normalize frequency to Supported enum: "WEEKLY" | "BIWEEKLY" | "MONTHLY"
      let apiFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" = "WEEKLY";
      const upperFreq = (frequency || "").toUpperCase();
      if (upperFreq.includes("BI")) apiFrequency = "BIWEEKLY";
      else if (upperFreq.includes("MONTH")) apiFrequency = "MONTHLY";

      // Normalize time to HH:MM format
      let apiTime = "09:00";
      if (deliveryTime && /^\d{2}:\d{2}$/.test(deliveryTime)) {
        apiTime = deliveryTime;
      } else if (deliveryTime) {
        const match = deliveryTime.match(/\b\d{2}:\d{2}\b/);
        if (match) apiTime = match[0];
      }

      // Normalize nextRefillDate to ISO string
      let apiDate: string;
      if (startDateISO) {
        try {
          const d = new Date(startDateISO);
          if (isNaN(d.getTime())) throw new Error();
          apiDate = d.toISOString();
        } catch {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(9, 0, 0, 0);
          apiDate = d.toISOString();
        }
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        apiDate = d.toISOString();
      }

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addressId,
          frequency: apiFrequency,
          nextRefillDate: apiDate,
          refillTime: apiTime,
          items: [
            {
              productId,
              quantity: numQuantity,
            },
          ],
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ||
            json.message ||
            "Failed to create subscription",
        );
      }

      const newId = json.data?.id;
      if (onSuccess && newId) {
        onSuccess(newId);
      } else if (newId) {
        router.push(`/subscriptions/${newId}/success`);
      }
    } catch (err: unknown) {
      console.error("[OrderSummaryCard] Subscription creation failed:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "An unexpected error occurred while setting up your subscription.",
        );
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Order Summary Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-4">
          Order Summary
        </h2>

        {/* Medicine item */}
        <div className="flex items-center gap-3.5 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef8dd]/80 shrink-0">
            <svg
              className="h-8 w-8 drop-shadow-xs"
              viewBox="0 0 64 64"
              fill="none"
            >
              <g transform="rotate(-35 32 32)">
                <rect
                  x="22"
                  y="10"
                  width="20"
                  height="22"
                  rx="10"
                  fill="#f43f5e"
                />
                <rect
                  x="22"
                  y="32"
                  width="20"
                  height="22"
                  rx="10"
                  fill="#ffffff"
                />
                <line
                  x1="22"
                  y1="32"
                  x2="42"
                  y2="32"
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <rect
                  x="25"
                  y="14"
                  width="4"
                  height="12"
                  rx="2"
                  fill="#ffffff"
                  fillOpacity="0.4"
                />
              </g>
            </svg>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              {medicineName}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {description}
            </p>
          </div>
        </div>

        {/* Schedule details */}
        <div className="border-t border-slate-100 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Refill Frequency</span>
            <span className="font-semibold text-slate-900">{frequency}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Start Date</span>
            <span className="font-semibold text-slate-900">
              {formattedStart}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Delivery Slot</span>
            <span className="font-semibold text-slate-900">
              {deliveryTime ? `${deliveryTime} slot` : "09:00 slot"}
            </span>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="border-t border-slate-100 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Medicine Price</span>
            <span className="font-semibold text-slate-900">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>
          {numQuantity > 1 && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Quantity</span>
              <span>x{numQuantity}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Delivery Fee</span>
            <span className="font-semibold text-emerald-600">Free</span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">
            Total per Refill
          </span>
          <span className="text-lg font-black text-[#1b5e3b]">
            ₹{subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Security notice */}
      <div className="rounded-xl bg-[#fafaf9] border border-slate-200/60 p-3.5 flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 text-amber-500">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4zm-2 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Razorpay Checkout handles any payment details securely. PharmaLoop
          does not store card numbers, CVV, or UPI PINs. Scheduled refill
          charging requires an interactive customer payment.
        </p>
      </div>

      {/* Confirm & Subscribe Button */}
      <div>
        {errorMessage && (
          <div className="mb-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <span className="font-semibold">Unable to subscribe:</span>{" "}
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubscribing}
          className="w-full py-3 px-4 rounded-xl bg-[#1b5e3b] hover:bg-[#154a2e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          {isSubscribing ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Confirming Subscription...</span>
            </>
          ) : (
            <>
              <span>Create Auto-Refill Schedule</span>
              <span>&rarr;</span>
            </>
          )}
        </button>

        {/* Terms notice */}
        <p className="mt-3 text-center text-[11px] text-slate-500">
          By subscribing, you agree to our{" "}
          <Link
            href="/dashboard/help-support"
            className="font-semibold text-[#1b5e3b] hover:underline"
          >
            Terms &amp; Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}

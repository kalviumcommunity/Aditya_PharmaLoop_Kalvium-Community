import React from "react";

export type BadgeType =
  | "ORDER"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "STOCK"
  | "CUSTOM";

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  className?: string;
  showDot?: boolean;
}

export default function StatusBadge({
  status,
  type = "CUSTOM",
  className = "",
  showDot = true,
}: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  let colorClasses =
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  let dotColor = "bg-slate-400";
  let isPulsing = false;

  if (type === "ORDER") {
    switch (norm) {
      case "DELIVERED":
        colorClasses =
          "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
        dotColor = "bg-emerald-500";
        break;
      case "SHIPPED":
        colorClasses =
          "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800";
        dotColor = "bg-blue-500";
        break;
      case "PROCESSING":
        colorClasses =
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
        dotColor = "bg-amber-500";
        isPulsing = true; // Actively processing fulfillment
        break;
      case "CONFIRMED":
        colorClasses =
          "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800";
        dotColor = "bg-teal-500";
        break;
      case "PENDING":
        colorClasses =
          "bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
        dotColor = "bg-slate-400";
        break;
      case "CANCELLED":
        colorClasses =
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
        dotColor = "bg-rose-500";
        break;
    }
  } else if (type === "SUBSCRIPTION") {
    switch (norm) {
      case "ACTIVE":
        colorClasses =
          "bg-emerald-50 text-[#1b5e3b] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
        dotColor = "bg-[#1b5e3b]";
        break;
      case "PAUSED":
        colorClasses =
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
        dotColor = "bg-amber-500";
        break;
      case "CANCELLED":
        colorClasses =
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
        dotColor = "bg-rose-500";
        break;
    }
  } else if (type === "PAYMENT") {
    switch (norm) {
      case "SUCCESS":
      case "PAID":
        colorClasses =
          "bg-emerald-50 text-[#1b5e3b] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
        dotColor = "bg-[#1b5e3b]";
        break;
      case "PENDING":
        colorClasses =
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
        dotColor = "bg-amber-500";
        break;
      case "FAILED":
        colorClasses =
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
        dotColor = "bg-rose-500";
        break;
      case "REFUNDED":
        colorClasses =
          "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800";
        dotColor = "bg-purple-500";
        break;
    }
  } else if (type === "STOCK") {
    switch (norm) {
      case "IN_STOCK":
      case "IN STOCK":
        colorClasses =
          "bg-emerald-50 text-[#1b5e3b] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
        dotColor = "bg-[#1b5e3b]";
        break;
      case "LOW_STOCK":
      case "LOW STOCK":
        colorClasses =
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
        dotColor = "bg-amber-500";
        break;
      case "OUT_OF_STOCK":
      case "OUT OF STOCK":
        colorClasses =
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
        dotColor = "bg-rose-500";
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colorClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dotColor} ${
            isPulsing ? "motion-safe:animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
      )}
      <span>{status}</span>
    </span>
  );
}

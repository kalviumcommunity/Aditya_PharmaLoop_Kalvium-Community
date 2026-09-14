"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface RefillStatusCardProps {
  productId?: string;
}

export default function RefillStatusCard({ productId }: RefillStatusCardProps) {
  const [activeSub, setActiveSub] = useState<{
    id: string;
    frequency: string;
    nextRefillDate: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (!productId) return;
    fetch("/api/subscriptions")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const match = json.data.find(
            (s: {
              id: string;
              status: string;
              items?: Array<{ productId: string }>;
              frequency: string;
              nextRefillDate: string;
            }) =>
              s.items?.some((i) => i.productId === productId) &&
              s.status === "ACTIVE"
          );
          if (match) setActiveSub(match);
        }
      })
      .catch(() => {});
  }, [productId]);

  const formattedDate = activeSub?.nextRefillDate
    ? new Date(activeSub.nextRefillDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  const formatFreq = (freq?: string) => {
    if (freq === "WEEKLY") return "Every Week";
    if (freq === "BIWEEKLY") return "Every 2 Weeks";
    if (freq === "MONTHLY") return "Every Month";
    return "Scheduled";
  };

  return (
    <div className="glass-card glass-card-interactive rounded-2xl p-5 mb-4">
      <h3 className="text-xs font-bold text-slate-900 mb-3.5">Refill Status</h3>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Current Status</span>
          <span className="font-bold text-[#1b5e3b]">
            {activeSub ? "Active Subscription" : "Refill Available"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Frequency</span>
          <span className="font-bold text-slate-800">
            {activeSub ? formatFreq(activeSub.frequency) : "Weekly / Monthly"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Next Refill</span>
          <span className="font-bold text-slate-800">
            {activeSub ? formattedDate : "Choose Date"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Auto-Pay</span>
          <span className="font-bold text-[#1b5e3b]">Enabled</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full bg-[#1b5e3b] transition-all ${
              activeSub ? "w-[75%]" : "w-[30%]"
            }`}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-400">
            {activeSub
              ? "Automated recurring refill active"
              : "Never run out of regular medications"}
          </span>
          {productId && !activeSub && (
            <Link
              href={`/subscriptions/${productId}/schedule`}
              className="text-[10px] font-bold text-[#1b5e3b] hover:underline"
            >
              Setup &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

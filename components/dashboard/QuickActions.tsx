"use client";

import React from "react";
import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="rounded-2xl glass-card p-5 mb-5">
      <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-2">
        {/* Action 1: Browse Medicines */}
        <Link
          href="/dashboard/medicines"
          className="flex flex-col items-center text-center group transition-transform hover:-translate-y-1 duration-200"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff6ff] text-sky-500 transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-sky-500/15 border border-sky-100 shadow-2xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 mt-2 leading-tight group-hover:text-slate-900 transition-colors">
            Medicines
          </span>
        </Link>

        {/* Action 2: My Subscriptions */}
        <Link
          href="/subscriptions"
          className="flex flex-col items-center text-center group transition-transform hover:-translate-y-1 duration-200"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecf9f0] text-[#1b5e3b] transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-emerald-900/15 border border-emerald-100 shadow-2xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 mt-2 leading-tight group-hover:text-slate-900 transition-colors">
            Subscriptions
          </span>
        </Link>

        {/* Action 3: My Orders */}
        <Link
          href="/orders"
          className="flex flex-col items-center text-center group transition-transform hover:-translate-y-1 duration-200"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#faf5ff] text-purple-500 transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-purple-500/15 border border-purple-100 shadow-2xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 mt-2 leading-tight group-hover:text-slate-900 transition-colors">
            My Orders
          </span>
        </Link>

        {/* Action 4: Address Book */}
        <Link
          href="/address-book"
          className="flex flex-col items-center text-center group transition-transform hover:-translate-y-1 duration-200"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1f2] text-rose-500 transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-rose-500/15 border border-rose-100 shadow-2xs">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 mt-2 leading-tight group-hover:text-slate-900 transition-colors">
            Address Book
          </span>
        </Link>
      </div>
    </div>
  );
}


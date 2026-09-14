"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface FooterProps {
  variant?: "dark" | "light";
}

export default function Footer({ variant }: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const pathname = usePathname();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  const isDark = variant ? variant === "dark" : (!pathname?.startsWith("/products") && !pathname?.startsWith("/help-support"));

  return (
    <footer className={isDark ? "bg-[#0c1524] text-white" : "bg-white text-slate-800 border-t border-slate-100"}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Col 1: Brand (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1b5e3b] text-white shadow-xs">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C7.03 2 3 6.03 3 11c0 3.58 2.12 6.67 5.19 8.07.41-.65.95-1.42 1.63-2.31 1.62-2.12 3.8-4.97 3.8-7.76 0-1.28-.43-2.45-1.15-3.37C12.82 5.23 13.43 5 14.1 5c2.76 0 5 2.24 5 5 0 2.51-1.02 4.41-2.47 5.76.15.52.37 1.02.66 1.49C19.34 15.68 21 13.53 21 11c0-4.97-4.03-9-9-9z" />
                </svg>
              </div>
              <span className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#1b5e3b]"}`}>
                PharmaLoop
              </span>
            </Link>

            <p className={`text-xs leading-relaxed max-w-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {isDark
                ? "Modern automated prescription refill and healthcare commerce platform."
                : "Healthier Today. Brighter Tomorrow."}
            </p>

            {isDark && (
              <div className="pt-2">
                <span className="inline-flex items-center rounded-lg bg-[#1c2738] px-2.5 py-1 text-[10px] font-semibold text-slate-400 border border-slate-700/40">
                  Phase 1 Shell Active
                </span>
              </div>
            )}
          </div>

          {/* Col 2: Shop & Refills (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>
              {isDark ? "SHOP & REFILLS" : "Shop"}
            </h3>
            <ul className={`mt-3.5 space-y-2.5 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <li>
                <Link href="/products" className="hover:text-[#1b5e3b] transition-colors">
                  Medicines
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[#1b5e3b] transition-colors">
                  Health Products
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[#1b5e3b] transition-colors">
                  Personal Care
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[#1b5e3b] transition-colors">
                  View All
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>
              {isDark ? "COMPANY" : "Company"}
            </h3>
            <ul className={`mt-3.5 space-y-2.5 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Support (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-900"}`}>
              {isDark ? "SUPPORT" : "Support"}
            </h3>
            <ul className={`mt-3.5 space-y-2.5 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <li>
                <Link href="/help-support" className="hover:text-[#1b5e3b] transition-colors">
                  Help &amp; Support
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#1b5e3b] transition-colors">
                  Returns &amp; Refunds
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Newsletter (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Subscribe to our newsletter
            </h3>
            <p className={`mt-1 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Get health tips and exclusive offers.
            </p>

            <form onSubmit={handleSubscribe} className="mt-3 flex items-center gap-1.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors ${
                  isDark
                    ? "bg-[#1c2738] border border-slate-700/60 text-white placeholder-slate-400 focus:border-emerald-500"
                    : "bg-[#f8fafc] border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500"
                }`}
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1b5e3b] text-white hover:bg-[#154c30] transition-colors shadow-xs"
              >
                <span>&rarr;</span>
              </button>
            </form>
            {subscribed && (
              <p className="mt-1.5 text-[10px] text-emerald-400 font-medium">
                Thank you for subscribing!
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`mt-10 border-t pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] ${
          isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
        }`}>
          <p>&copy; 2025 PharmaLoop. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:underline">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link href="#" className="hover:underline">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

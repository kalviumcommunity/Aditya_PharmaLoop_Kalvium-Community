"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-active");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-init");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex-1 flex flex-col justify-center bg-gradient-to-r from-[#f2f9f4] via-[#f6faf4] to-[#fbfdf7] overflow-hidden page-entrance">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Section */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center">
            
            {/* Top Pill Badge */}
            <div className="hero-enter-0 inline-flex items-center gap-1.5 rounded-full glass-card px-3 py-1 text-xs font-bold text-[#1b5e3b] self-start mb-6 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-[#1b5e3b]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
              <span>Trusted by thousands</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-enter-1 text-4xl sm:text-5xl lg:text-[58px] font-black tracking-tight text-slate-900 leading-[1.12]">
              Your health.<br />
              On schedule.<br />
              <span className="text-[#1b5e3b]">Every time.</span>
            </h1>

            {/* Supporting Description */}
            <p className="hero-enter-2 mt-6 text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl">
              PharmaLoop helps you never run out of your medicines.<br className="hidden sm:inline" />
              Auto-refill, secure payments, and timely reminders &mdash; all in one place.
            </p>

            {/* Action Buttons */}
            <div className="hero-enter-3 mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1b5e3b] px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#154c30] transition-all active:scale-[0.98]"
              >
                <span>Get Started</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href="/products"
                className="rounded-xl border-2 border-[#1b5e3b] glass-card px-6 py-3 text-sm font-bold text-[#1b5e3b] hover:bg-emerald-50/70 transition-all shadow-2xs active:scale-[0.98]"
              >
                Browse Medicines
              </Link>
            </div>

            {/* Trust / Benefit Row */}
            <div className="hero-enter-4 mt-12 sm:mt-16 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4 max-w-2xl">
              
              {/* Item 1: Secure Payments */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] shadow-2xs">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Secure Payments</h4>
                  <p className="text-[11px] text-slate-400">100% safe &amp; trusted</p>
                </div>
              </div>

              {/* Item 2: Auto Refills */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 border border-blue-100/60 text-blue-600 shadow-2xs">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.02l.478.477a7 7 0 0011.96-3.212.75.75 0 00-1.626-.632zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.48a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.02l-.478-.477a7 7 0 00-11.96 3.212.75.75 0 001.626.632z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Auto Refills</h4>
                  <p className="text-[11px] text-slate-400">Weekly, bi-weekly or monthly</p>
                </div>
              </div>

              {/* Item 3: Timely Reminders */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50/80 border border-amber-100/60 text-amber-600 shadow-2xs">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Timely Reminders</h4>
                  <p className="text-[11px] text-slate-400">Never miss a refill</p>
                </div>
              </div>

              {/* Item 4: Trusted by Thousands */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] shadow-2xs">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Trusted by Thousands</h4>
                  <p className="text-[11px] text-slate-400">For your loved ones</p>
                </div>
              </div>

            </div>

          </div>

          {/* Hero Right Visual: Decorative backdrop & 3 Floating Medicine Cards */}
          <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center">
            
            {/* Positioned Canvas */}
            <div className="hero-enter-5 relative w-full max-w-[460px] h-[520px] hidden sm:block">
              
              {/* Soft circular background wash */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[390px] h-[390px] rounded-full bg-[#dcf3e4]/80 pointer-events-none" />

              {/* Leaf graphics */}
              <div className="absolute -top-4 -left-6 w-16 h-16 text-[#8fd1a5] opacity-70 pointer-events-none">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10,90 Q90,90 90,10 Q10,10 10,90 Z" />
                </svg>
              </div>
              <div className="absolute top-44 -left-10 w-14 h-14 text-[#8fd1a5] opacity-60 pointer-events-none">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <path d="M20,80 Q80,90 90,20 Q20,30 20,80 Z" />
                </svg>
              </div>
              <div className="absolute bottom-12 right-0 w-20 h-20 text-[#8fd1a5] opacity-60 pointer-events-none">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10,90 Q90,90 90,10 Q10,10 10,90 Z" />
                </svg>
              </div>

              {/* TOP CARD: Crocin 650 */}
              <div className="absolute top-2 left-6 z-10 w-56 rounded-2xl glass-card p-3.5 shadow-xl transition-transform duration-300 hover:-translate-y-1.5 animate-float-a">
                <div className="relative flex h-28 w-full items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60">
                  <span className="absolute top-2 right-2 rounded-md bg-[#dcfce7] px-1.5 py-0.5 text-[9px] font-bold text-[#166534]">
                    11% OFF
                  </span>
                  {/* Angled Red/White Capsule Pill SVG */}
                  <svg className="h-16 w-16 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
                      <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                      <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                      <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
                    </g>
                  </svg>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-slate-800">Crocin 650</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pain Relief · 15 Tablets</p>
                  <p className="text-sm font-extrabold text-[#1b5e3b] mt-1">₹120.00</p>
                </div>
              </div>

              {/* MIDDLE CARD: Vitamin D3 1000 IU */}
              <div className="absolute top-36 right-0 z-20 w-56 rounded-2xl glass-card p-3.5 shadow-xl transition-transform duration-300 hover:-translate-y-1.5 animate-float-b">
                <div className="relative flex h-28 w-full items-center justify-center rounded-xl bg-amber-50/80 border border-amber-100/60">
                  <span className="absolute top-2 right-2 rounded-md bg-[#fef3c7] px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                    8% OFF
                  </span>
                  {/* Vitamin Bottle / Dropper SVG */}
                  <svg className="h-14 w-12 drop-shadow-xs" viewBox="0 0 48 56" fill="none">
                    <rect x="19" y="6" width="10" height="6" rx="2" fill="#fbcfe8" />
                    <rect x="21" y="12" width="6" height="4" fill="#f472b6" />
                    <rect x="17" y="16" width="14" height="4" rx="1.5" fill="#fbcfe8" />
                    <rect x="10" y="20" width="28" height="30" rx="7" fill="#f472b6" fillOpacity="0.75" />
                    <path d="M24 29c-2 2.5-3.5 4.5-3.5 6a3.5 3.5 0 007 0c0-1.5-1.5-3.5-3.5-6z" fill="#ffffff" />
                    <rect x="13" y="24" width="2.5" height="18" rx="1" fill="#ffffff" fillOpacity="0.4" />
                  </svg>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-slate-800">Vitamin D3 1000 IU</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Immunity · 60 Tablets</p>
                  <p className="text-sm font-extrabold text-[#1b5e3b] mt-1">₹349.00</p>
                </div>
              </div>

              {/* BOTTOM CARD: Amoxicillin 500mg */}
              <div className="absolute bottom-2 left-6 z-10 w-56 rounded-2xl glass-card p-3.5 shadow-xl transition-transform duration-300 hover:-translate-y-1.5 animate-float-c">
                <div className="relative flex h-28 w-full items-center justify-center rounded-xl bg-blue-50/80 border border-blue-100/60">
                  <span className="absolute top-2 right-2 rounded-md bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                    10% OFF
                  </span>
                  {/* Blue & White Capsule Pill SVG */}
                  <svg className="h-16 w-16 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="10" width="20" height="22" rx="10" fill="#3b82f6" />
                      <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                      <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                      <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
                    </g>
                  </svg>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-slate-800">Amoxicillin 500mg</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Antibiotic · 10 Capsules</p>
                  <p className="text-sm font-extrabold text-[#1b5e3b] mt-1">₹89.00</p>
                </div>
              </div>

            </div>

            {/* Mobile View: Stacked Cards */}
            <div className="sm:hidden w-full flex flex-col gap-3 mt-4">
              <div className="reveal-init flex items-center gap-3.5 rounded-2xl glass-card glass-card-interactive p-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60">
                  <svg className="h-9 w-9" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
                      <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                    </g>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">Crocin 650</h3>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">11% OFF</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Pain Relief · 15 Tablets</p>
                  <p className="text-xs font-bold text-[#1b5e3b] mt-0.5">₹120.00</p>
                </div>
              </div>

              <div className="reveal-init flex items-center gap-3.5 rounded-2xl glass-card glass-card-interactive p-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50/80 border border-amber-100/60">
                  <svg className="h-8 w-7" viewBox="0 0 48 56" fill="none">
                    <rect x="10" y="20" width="28" height="30" rx="7" fill="#f472b6" fillOpacity="0.75" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">Vitamin D3 1000 IU</h3>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">8% OFF</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Immunity · 60 Tablets</p>
                  <p className="text-xs font-bold text-[#1b5e3b] mt-0.5">₹349.00</p>
                </div>
              </div>

              <div className="reveal-init flex items-center gap-3.5 rounded-2xl glass-card glass-card-interactive p-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 border border-blue-100/60">
                  <svg className="h-9 w-9" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="10" width="20" height="22" rx="10" fill="#3b82f6" />
                      <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                    </g>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">Amoxicillin 500mg</h3>
                    <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">10% OFF</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Antibiotic · 10 Capsules</p>
                  <p className="text-xs font-bold text-[#1b5e3b] mt-0.5">₹89.00</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

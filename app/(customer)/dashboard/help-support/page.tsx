"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    question: "How do I manage my medicine subscription?",
    answer:
      "Navigate to My Subscriptions from your customer dashboard. From there you can view active refill routines, pause or resume subscriptions, adjust delivery schedules, or cancel recurring plans anytime.",
  },
  {
    id: "faq-2",
    question: "How can I check my order status?",
    answer:
      "Visit the Orders section to view all ongoing and completed shipments with real-time tracking information, estimated delivery dates, and digital invoice copies.",
  },
  {
    id: "faq-3",
    question: "How do I update my delivery address?",
    answer:
      "Head over to Address Book from the sidebar to add a new address or update your default delivery location for future orders and automated refills.",
  },
  {
    id: "faq-4",
    question: "How do I manage my payment method?",
    answer:
      "Go to Payments to review your saved payment methods, inspect billing history, and configure secure automated payments for seamless medication refills.",
  },
  {
    id: "faq-5",
    question: "How do I contact support?",
    answer:
      "You can email our customer care specialists at support@pharmaloop.com. We usually respond within 2 hours during operational hours.",
  },
  {
    id: "faq-6",
    question: "Are all medicines authentic and verified?",
    answer:
      "Yes, 100% of medicines dispensed through PharmaLoop are sourced directly from certified manufacturers and licensed wholesale distributors, with strict temperature-controlled storage and batch tracking.",
  },
];

export default function CustomerHelpSupportPage() {
  const router = useRouter();
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq-1");
  const [copied, setCopied] = useState(false);

  // Authentication check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("support@pharmaloop.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10 page-entrance">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-[#1b5e3b] transition-colors">
          Dashboard
        </Link>
        <span className="text-slate-300">&rsaquo;</span>
        <span className="text-slate-800 font-semibold">Help &amp; Support</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100/80 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            How can we help?
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 max-w-2xl">
            We&apos;re here to help with your medicines, refills, orders, payments, and account.
          </p>
        </div>

        {/* Quick Back to Dashboard */}
        <Link
          href="/dashboard"
          className="self-start md:self-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <span>&larr;</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* 4 Support Options Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Orders & Delivery */}
        <div className="glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50/80 border border-amber-100/60 text-amber-700 text-lg mb-3.5 shadow-2xs">
              📦
            </div>
            <h3 className="text-sm font-bold text-slate-900">Orders &amp; Delivery</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Questions about an order or delivery? Track shipments or inspect delivery schedules.
            </p>
          </div>
          <Link
            href="/orders"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1b5e3b] hover:underline"
          >
            <span>View Orders</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Card 2: Medicines & Refills */}
        <div className="glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] text-lg mb-3.5 shadow-2xs">
              🔄
            </div>
            <h3 className="text-sm font-bold text-slate-900">Medicines &amp; Refills</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Need help managing your medicines or refills? Pause, resume, or adjust your schedules.
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1b5e3b] hover:underline"
          >
            <span>My Subscriptions</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Card 3: Payments */}
        <div className="glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50/80 border border-sky-100/60 text-sky-700 text-lg mb-3.5 shadow-2xs">
              💳
            </div>
            <h3 className="text-sm font-bold text-slate-900">Payments</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Need help with payments or auto-pay? View your billing status and payment preferences.
            </p>
          </div>
          <Link
            href="/checkout"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1b5e3b] hover:underline"
          >
            <span>Manage Payments</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Card 4: Browse Catalog */}
        <div className="glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50/80 border border-purple-100/60 text-purple-700 text-lg mb-3.5 shadow-2xs">
              💊
            </div>
            <h3 className="text-sm font-bold text-slate-900">Find Medicines</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Looking for new prescriptions or over-the-counter healthcare products?
            </p>
          </div>
          <Link
            href="/dashboard/medicines"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1b5e3b] hover:underline"
          >
            <span>Browse Medicines</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: FAQs & Dedicated Contact Support Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* Left: Frequently Asked Questions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Frequently Asked Questions
            </h2>
            <span className="text-xs text-slate-500 font-medium">Quick Answers</span>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl glass-card overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="flex w-full items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-slate-800 hover:text-[#1b5e3b] transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span
                      className={`ml-2 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#1b5e3b]" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100/80 pt-3 bg-white/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Contact Support & Email Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl glass-card p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b] text-xl shrink-0 shadow-2xs">
                ✉️
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Support</h3>
                <p className="text-xs text-slate-500">
                  Get in touch with our healthcare care team
                </p>
              </div>
            </div>

            {/* Email Address Copy Box */}
            <div className="rounded-xl glass-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">✉</span>
                <span className="text-xs font-mono font-semibold text-slate-800 select-all">
                  support@pharmaloop.com
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="rounded-lg glass-card px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                {copied ? "Copied! ✓" : "Copy 📋"}
              </button>
            </div>

            {/* Response time info */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>We usually respond within 2 hours</span>
            </div>

            {/* Emergency Disclaimer */}
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-relaxed shadow-2xs">
              <p className="font-bold flex items-center gap-1.5 mb-0.5">
                <span>⚠️</span>
                <span>Medical Emergency Disclaimer</span>
              </p>
              <span>
                If you are experiencing a medical emergency, please call your local emergency medical service immediately.
              </span>
            </div>
          </div>

          {/* Quick Hub Links Card */}
          <div className="rounded-2xl glass-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl glass-card p-2.5 text-slate-700 hover:text-[#1b5e3b] transition-all shadow-2xs active:scale-[0.98]"
              >
                <span>📊</span>
                <span>Dashboard</span>
              </Link>
              <Link
                href="/dashboard/medicines"
                className="flex items-center gap-1.5 rounded-xl glass-card p-2.5 text-slate-700 hover:text-[#1b5e3b] transition-all shadow-2xs active:scale-[0.98]"
              >
                <span>💊</span>
                <span>Medicines</span>
              </Link>
              <Link
                href="/subscriptions"
                className="flex items-center gap-1.5 rounded-xl glass-card p-2.5 text-slate-700 hover:text-[#1b5e3b] transition-all shadow-2xs active:scale-[0.98]"
              >
                <span>🔄</span>
                <span>Subscriptions</span>
              </Link>
              <Link
                href="/address-book"
                className="flex items-center gap-1.5 rounded-xl glass-card p-2.5 text-slate-700 hover:text-[#1b5e3b] transition-all shadow-2xs active:scale-[0.98]"
              >
                <span>📍</span>
                <span>Address Book</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  // Orders & Delivery
  {
    id: "ord-1",
    category: "Orders & Delivery",
    question: "How do I track my medicine order?",
    answer:
      "Once your order has been dispatched from our certified pharmacy hub, you will receive an SMS and email with a live tracking link. You can also view real-time delivery status under your Orders dashboard.",
  },
  {
    id: "ord-2",
    category: "Orders & Delivery",
    question: "What are your standard delivery timeframes?",
    answer:
      "Express metropolitan delivery typically arrives within 4 to 8 hours. Standard regional deliveries take 24 to 48 hours. Scheduled subscription refills are dispatched 3 days ahead to ensure you never run out of essential medicines.",
  },
  {
    id: "ord-3",
    category: "Orders & Delivery",
    question: "Can I change my delivery address after an order is placed?",
    answer:
      "Address changes are possible before the order reaches the 'Packed' stage. Go to Orders > Select Order > Modify Address, or contact our support team immediately for rapid rerouting.",
  },

  // Medicines & Products
  {
    id: "faq-med-1",
    category: "Medicines & Products",
    question: "Are all medicines on PharmaLoop 100% authentic?",
    answer:
      "Yes. Every pharmaceutical product on PharmaLoop is directly sourced from FDA-approved manufacturers and licensed wholesale distributors. Each batch undergoes multi-tier tamper-evident inspection and QR verification.",
  },
  {
    id: "faq-med-2",
    category: "Medicines & Products",
    question: "Do I need a prescription to order prescription medicines?",
    answer:
      "Yes, prescription drugs (Rx) mandate a valid doctor's prescription. You can upload an image or PDF during checkout or scheduling. Over-the-counter (OTC) products and wellness supplements do not require a prescription.",
  },
  {
    id: "faq-med-3",
    category: "Medicines & Products",
    question: "How are temperature-sensitive medicines handled?",
    answer:
      "Cold-chain products (such as Insulin, Biologics, and Vaccines) are packed in medical-grade insulated thermal shippers with calibrated gel packs and temperature tracking sensors.",
  },

  // Subscriptions & Refills
  {
    id: "sub-1",
    category: "Subscriptions & Refills",
    question: "How does the automated refill subscription work?",
    answer:
      "When you subscribe to a maintenance medication, PharmaLoop calculates your dosage consumption and automatically arranges delivery 3-5 days before your supply ends. You enjoy zero-worry replenishment with 15% discount savings.",
  },
  {
    id: "sub-2",
    category: "Subscriptions & Refills",
    question: "Can I pause, skip, or change the refill frequency?",
    answer:
      "Absolutely. You can modify your refill cycle (monthly, 60 days, 90 days), pause deliveries during travel, or skip a cycle with a single click in your Subscriptions dashboard without penalty.",
  },
  {
    id: "sub-3",
    category: "Subscriptions & Refills",
    question: "When will I be notified before a scheduled refill?",
    answer:
      "We send an advance SMS, email, and app notification 4 days before processing your auto-refill, giving you ample time to adjust doses, change address, or pause if required.",
  },

  // Payments
  {
    id: "pay-1",
    category: "Payments",
    question: "What payment methods are supported for auto-refills?",
    answer:
      "We support all major credit/debit cards (Visa, Mastercard, Amex, RuPay), UPI AutoPay, NetBanking, and recurring mandate authorizations. One-time orders also support Cash on Delivery.",
  },
  {
    id: "pay-2",
    category: "Payments",
    question: "When will my card or bank account be debited for refills?",
    answer:
      "Auto-billing occurs 48 hours prior to dispatch. You will always receive an itemized electronic invoice and instant payment confirmation notification.",
  },
  {
    id: "pay-3",
    category: "Payments",
    question: "What is your refund policy for cancelled orders?",
    answer:
      "If you cancel an order before dispatch, refunds are initiated immediately to your original payment method. For UPI and cards, processing generally takes 3 to 5 business days.",
  },

  // Account & Login
  {
    id: "acc-1",
    category: "Account & Login",
    question: "How do I reset my account password?",
    answer:
      "Click 'Login / Sign Up' in the navigation, select 'Forgot Password', and enter your registered email address. A secure one-time password reset link will be emailed to you immediately.",
  },
  {
    id: "acc-2",
    category: "Account & Login",
    question: "Can I manage prescriptions for multiple family members?",
    answer:
      "Yes. PharmaLoop supports multi-profile management within a single account. You can create distinct patient profiles for parents, children, or dependents with personalized medication schedules.",
  },
];

const CATEGORIES = [
  {
    name: "Orders & Delivery",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    description: "Tracking, shipping speeds, delivery addresses",
  },
  {
    name: "Medicines & Products",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    description: "Authenticity, prescriptions, cold-storage",
  },
  {
    name: "Subscriptions & Refills",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    description: "Auto-refills, pause cycles, refill frequency",
  },
  {
    name: "Payments",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    description: "UPI AutoPay, cards, invoices, refunds",
  },
  {
    name: "Account & Login",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    description: "Password reset, family profiles, security",
  },
];

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>("ord-1");
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("support@pharmaloop.com");
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Filter FAQs based on search and selected category
  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const handleCategoryClick = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 page-entrance">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-[#f8fafc] border-b border-slate-100 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3.5 py-1 text-xs font-semibold text-[#1b5e3b] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#1b5e3b] animate-pulse" />
            24/7 Dedicated Support Center
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
            How can we help?
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            We&apos;re here to make your PharmaLoop experience simple and stress-free. Search our knowledge base or browse common topics below.
          </p>

          {/* 2. Search / Help Field */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-sm">
              <div className="absolute left-4 flex items-center pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help... (e.g. delivery time, refills, prescription, refund)"
                className="w-full rounded-2xl bg-white py-4 pl-12 pr-12 text-sm text-slate-800 placeholder-slate-400 border border-slate-200 focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all shadow-xs"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 text-xs font-semibold text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full h-6 w-6 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {searchQuery && (
              <p className="mt-2 text-xs text-slate-500 text-left px-2">
                Showing results for &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo; ({filteredFaqs.length} found)
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Common Help Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className={`flex flex-col items-start p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? "bg-[#1b5e3b] text-white border border-[#1b5e3b] shadow-md -translate-y-0.5"
                    : "glass-card glass-card-interactive text-slate-800 hover:border-emerald-300/80"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mb-3 shadow-2xs ${
                    isSelected ? "bg-white/20 text-white" : "bg-emerald-50/80 border border-emerald-100/60 text-[#1b5e3b]"
                  }`}
                >
                  {cat.icon}
                </div>
                <span className="text-sm font-bold leading-tight">{cat.name}</span>
                <span
                  className={`mt-1 text-xs line-clamp-2 leading-relaxed ${
                    isSelected ? "text-emerald-100" : "text-slate-500"
                  }`}
                >
                  {cat.description}
                </span>
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="mt-4 flex items-center justify-between glass-card bg-emerald-50/70 border-emerald-200/80 rounded-xl px-4 py-2.5 text-xs text-[#1b5e3b]">
            <span className="font-medium">
              Filtered by: <strong>{selectedCategory}</strong>
            </span>
            <button
              onClick={() => setSelectedCategory(null)}
              className="font-semibold underline hover:text-[#154c30] cursor-pointer"
            >
              Clear Category Filter
            </button>
          </div>
        )}
      </section>

      {/* 4. Expandable FAQ Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Quick answers to the most common questions about PharmaLoop services.
          </p>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 glass-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 mb-3 shadow-2xs">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No matching articles found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any help articles matching &ldquo;{searchQuery}&rdquo;. Try using different keywords or contact our 24/7 team directly.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
              className="mt-4 inline-flex items-center rounded-xl glass-card px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white transition-all active:scale-[0.98] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl glass-card overflow-hidden shadow-2xs transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <span className="rounded-md bg-emerald-50/80 border border-emerald-100/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1b5e3b] shadow-2xs">
                        {faq.category}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {faq.question}
                      </span>
                    </div>

                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-emerald-50 text-[#1b5e3b]" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100/80 bg-white/40 px-5 py-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Contact Support Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#0c1524] to-[#16253c] p-8 sm:p-12 text-white shadow-xl">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-3 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Dedicated Support
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Still need help?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Our clinical pharmacists and support specialists are standing by to assist with your prescriptions, refills, or delivery questions.
            </p>
          </div>

          {/* Redesigned Email Support Card */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-6 sm:p-8 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4 mx-auto border border-emerald-500/20 shadow-xs">
                {/* Envelope icon */}
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">Email Support</h4>
              <p className="mt-1 text-xs text-slate-300">
                Get in touch with our support team
              </p>

              {/* Email Address & Copy Box */}
              <div className="mt-6 flex items-center justify-between rounded-xl bg-[#09111c]/80 border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-mono text-xs sm:text-sm font-medium text-slate-200 truncate select-all">
                    support@pharmaloop.com
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className={`ml-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
                    copiedEmail
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white border border-white/10"
                  }`}
                  aria-label="Copy email address"
                  title="Copy email to clipboard"
                >
                  {copiedEmail ? (
                    <>
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[11px]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Response-time text */}
              <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>We usually respond within 24 hours</span>
              </p>
            </div>
          </div>

          {/* Medical emergency disclaimer */}
          <div className="mt-8 text-center text-[11px] text-slate-400 max-w-xl mx-auto border-t border-white/5 pt-6">
            Need urgent clinical assistance for adverse medicine reactions? Please contact your local emergency hospital hotline immediately.
          </div>
        </div>
      </section>
    </div>
  );
}

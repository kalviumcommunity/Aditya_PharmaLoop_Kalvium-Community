import React from "react";

interface SubscriptionSuccessCardProps {
  subscriptionId?: string;
  medicineName?: string;
  description?: string;
  frequency?: string;
  startDate?: string;
  price?: number | string;
  deliveryAddress?: string;
  deliverySlot?: string;
}

export default function SubscriptionSuccessCard({
  medicineName = "Prescription Refill",
  description = "Standard Refill Pack",
  frequency = "Monthly",
  startDate,
  price = 35.0,
  deliveryAddress = "Standard Delivery Address",
  deliverySlot = "09:00 slot",
}: SubscriptionSuccessCardProps) {
  const numPrice = typeof price === "number" ? price : parseFloat(price || "0") || 35.0;
  const formattedStart = startDate || new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const details = [
    {
      label: "Subscription Frequency",
      value: frequency,
      iconBg: "bg-[#e8f2fe]",
      iconColor: "text-[#2563eb]",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.02l.478.477a7 7 0 0011.96-3.212.75.75 0 00-1.626-.632zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.48a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.02l-.478-.477a7 7 0 00-11.96 3.212.75.75 0 001.626.632z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "Next Refill Date",
      value: formattedStart,
      iconBg: "bg-[#e8f6fa]",
      iconColor: "text-[#0284c7]",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: "Payment Status",
      value: `Paid ₹${numPrice.toFixed(2)}`,
      iconBg: "bg-[#e6f8f6]",
      iconColor: "text-[#0d9488]",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      label: "Auto-Pay Status",
      value: "Enabled",
      iconBg: "bg-[#e0f4fc]",
      iconColor: "text-[#0284c7]",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "Delivery Address",
      value: deliveryAddress,
      iconBg: "bg-[#feecee]",
      iconColor: "text-[#e11d48]",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "Delivery Time",
      value: deliverySlot,
      iconBg: "bg-[#fef7e6]",
      iconColor: "text-[#d97706]",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const nextSteps = [
    "You'll receive order notifications before every recurring refill",
    "We'll remind you 2 days before each scheduled delivery",
    "Auto-pay will process seamlessly on the scheduled refill date",
    "Track your ongoing deliveries anytime from your dashboard",
  ];

  return (
    <div className="glass-card w-full max-w-xl mx-auto rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden text-left">
      {/* Upper Mint Section */}
      <div className="bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-5 sm:p-6 flex items-center gap-4 border-b border-emerald-100/70">
        {/* White container for Pill graphic */}
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white border border-emerald-100/70 shadow-xs shrink-0">
          <svg className="h-9 w-9 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
            <g transform="rotate(-35 32 32)">
              <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
              <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
              <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
              <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
            </g>
          </svg>
        </div>

        {/* Product details */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {medicineName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {description}
          </p>
          <span className="inline-flex items-center rounded-md bg-[#1b5e3b] px-2.5 py-0.5 text-[10px] font-bold text-white mt-1.5 shadow-xs">
            Active
          </span>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 sm:gap-y-5 gap-x-6">
          {details.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor} shrink-0 mt-0.5`}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {item.label}
                </p>
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 mt-0.5 leading-snug">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* What happens next? Panel */}
        <div className="rounded-2xl bg-[#eef8f1] border border-[#d8eee0] p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">
            What happens next?
          </h3>

          <div className="space-y-2">
            {nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-xs font-bold text-[#1b5e3b] shrink-0 mt-0.5">
                  ✓
                </span>
                <span className="text-xs text-slate-600 font-medium leading-relaxed">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

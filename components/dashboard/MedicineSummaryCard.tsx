import React from "react";

interface MedicineSummaryCardProps {
  name?: string;
  description?: string;
  price?: number | string;
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
}

export default function MedicineSummaryCard({
  name,
  description,
  price,
  quantity = 1,
  onQuantityChange,
}: MedicineSummaryCardProps) {
  const displayName = name || "Prescription Medicine";
  const displayDesc = description || "Standard Refill Pack";
  const numPrice = typeof price === "number" ? price : parseFloat(price || "0") || 0;
  const lineTotal = numPrice * (quantity || 1);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Medicine Thumbnail */}
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-[#eef8dd]/80 shrink-0">
            <svg className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
              <g transform="rotate(-35 32 32)">
                <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
                <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
              </g>
            </svg>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              {displayName}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
              {displayDesc}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-[#1b5e3b]">
                ₹{lineTotal.toFixed(2)}
              </span>
              {quantity > 1 && (
                <span className="text-[11px] text-slate-400">
                  (₹{numPrice.toFixed(2)} &times; {quantity})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quantity Controls */}
        {onQuantityChange && (
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              aria-label="Decrease quantity"
            >
              &minus;
            </button>
            <span className="w-6 text-center text-xs font-bold text-slate-800">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(quantity + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Increase quantity"
            >
              &#43;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

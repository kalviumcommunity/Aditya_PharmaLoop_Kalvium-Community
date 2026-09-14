import React from "react";

export interface DeliveryInfoCardProps {
  label?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

export default function DeliveryInfoCard({
  label,
  addressLine,
  city,
  state,
  postalCode,
}: DeliveryInfoCardProps) {
  const hasAddress = Boolean(addressLine && city);

  const formatted = hasAddress
    ? [addressLine, city, state, postalCode].filter(Boolean).join(", ")
    : null;

  return (
    <div className="glass-card glass-card-interactive rounded-2xl p-5 mb-4">
      <h3 className="text-xs font-bold text-slate-900 mb-3">Delivery Info</h3>
      <div className="flex items-start gap-2.5">
        <span className="text-rose-400 text-sm mt-0.5">📍</span>
        <div>
          <h4 className="text-xs font-bold text-slate-800">
            {label?.trim() || (hasAddress ? "Delivery Address" : "No address on file")}
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
            {formatted ??
              "Add a delivery address in your address book to see it here."}
          </p>
        </div>
      </div>
    </div>
  );
}

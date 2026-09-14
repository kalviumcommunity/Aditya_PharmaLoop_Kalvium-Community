import React from "react";

export default function DeliveryInfoCard() {
  return (
    <div className="glass-card glass-card-interactive rounded-2xl p-5 mb-4">
      <h3 className="text-xs font-bold text-slate-900 mb-3">Delivery Info</h3>
      <div className="flex items-start gap-2.5">
        <span className="text-rose-400 text-sm mt-0.5">📍</span>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Home Address</h4>
          <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
            42, Green Park Colony, New Delhi - 110016
          </p>
        </div>
      </div>
    </div>
  );
}

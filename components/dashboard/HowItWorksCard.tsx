import React from "react";

export default function HowItWorksCard() {
  const items = [
    {
      icon: "🔔",
      text: "We'll send you a reminder before each refill",
    },
    {
      icon: "💳",
      text: "Payment will be processed automatically",
    },
    {
      icon: "⏸️",
      text: "You can pause, skip or cancel anytime",
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200/70 shadow-xs mt-4">
      <div className="flex items-center gap-2 mb-3.5">
        <span className="text-blue-500 text-sm">🛡️</span>
        <h3 className="text-xs font-bold text-slate-900">How it works</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <span className="text-xs mt-0.5 shrink-0">{item.icon}</span>
            <span className="text-[11px] text-slate-500 leading-tight font-medium">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

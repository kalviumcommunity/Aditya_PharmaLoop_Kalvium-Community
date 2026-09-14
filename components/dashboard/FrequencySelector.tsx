"use client";

import React from "react";

export type SupportedFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

interface FrequencySelectorProps {
  value?: SupportedFrequency;
  onChange?: (freq: SupportedFrequency) => void;
  title?: string;
  subtitle?: string;
}

export default function FrequencySelector({
  value = "WEEKLY",
  onChange,
  title = "2. Choose Frequency",
  subtitle = "How often would you like to receive this medicine?",
}: FrequencySelectorProps) {
  const options: Array<{
    id: SupportedFrequency;
    title: string;
    desc: string;
  }> = [
    {
      id: "WEEKLY",
      title: "Weekly",
      desc: "Receive medicine every 7 days",
    },
    {
      id: "BIWEEKLY",
      title: "Every 2 Weeks",
      desc: "Receive medicine every 14 days",
    },
    {
      id: "MONTHLY",
      title: "Monthly",
      desc: "Receive medicine every month",
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200/70 shadow-xs">
      <div>
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => onChange && onChange(opt.id)}
              className={`flex items-center justify-between rounded-xl p-3 border transition-all cursor-pointer ${
                isSelected
                  ? "border-2 border-[#1b5e3b] bg-[#f4fbf6] shadow-2xs"
                  : "border-slate-200/80 bg-white/80 backdrop-blur-xs hover:bg-slate-50/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 shrink-0">
                  <span className="text-xs">🗓️</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{opt.title}</h4>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </div>
              </div>

              {/* Radio Circle */}
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  isSelected ? "border-[#1b5e3b]" : "border-slate-300"
                }`}
              >
                {isSelected && (
                  <div className="h-2 w-2 rounded-full bg-[#1b5e3b]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

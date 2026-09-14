"use client";

import React from "react";

interface RefillTimeSelectorProps {
  value?: string;
  onChange?: (time: string) => void;
  title?: string;
  subtitle?: string;
}

export default function RefillTimeSelector({
  value = "09:00",
  onChange,
  title = "3. Preferred Refill Time",
  subtitle = "Choose the time you prefer for automatic refills.",
}: RefillTimeSelectorProps) {
  const times = [
    {
      id: "morning",
      timeValue: "09:00",
      label: "Morning",
      hours: "6 AM – 12 PM (9:00 AM)",
      icon: "🌅",
    },
    {
      id: "afternoon",
      timeValue: "14:00",
      label: "Afternoon",
      hours: "12 PM – 5 PM (2:00 PM)",
      icon: "☀️",
    },
    {
      id: "evening",
      timeValue: "18:00",
      label: "Evening",
      hours: "5 PM – 9 PM (6:00 PM)",
      icon: "🌆",
    },
    {
      id: "night",
      timeValue: "21:00",
      label: "Night",
      hours: "9 PM – 6 AM (9:00 PM)",
      icon: "🌙",
    },
  ];

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-xs mt-4">
      <div>
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {times.map((item) => {
          const isSelected = value === item.timeValue;
          return (
            <div
              key={item.id}
              onClick={() => onChange && onChange(item.timeValue)}
              className={`rounded-xl p-3 border transition-colors cursor-pointer text-left ${
                isSelected
                  ? "border-2 border-[#1b5e3b] bg-[#f4fbf6]"
                  : "border-slate-200 bg-white hover:bg-slate-50/50"
              }`}
            >
              <span className="text-sm block mb-1">{item.icon}</span>
              <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.hours}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

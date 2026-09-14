"use client";

import React, { useMemo } from "react";

interface UpcomingRefillPreviewProps {
  baseDate?: string | Date;
  frequency?: string;
  refillTime?: string;
  title?: string;
  subtitle?: string;
}

export default function UpcomingRefillPreview({
  baseDate,
  frequency = "WEEKLY",
  refillTime = "9:00 AM",
  title = "4. Upcoming Refill Preview",
  subtitle = "Here's how your upcoming refills will look.",
}: UpcomingRefillPreviewProps) {
  const dates = useMemo(() => {
    const start = baseDate ? new Date(baseDate) : new Date();

    const formatTimeDisplay = (timeStr?: string) => {
      if (!timeStr) return "9:00 AM";
      const [hStr, mStr] = timeStr.split(":");
      const h = parseInt(hStr, 10);
      if (isNaN(h)) return timeStr;
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 || 12;
      return `${displayH}:${mStr || "00"} ${ampm}`;
    };

    const formattedTime = formatTimeDisplay(refillTime);
    const result = [];
    const current = new Date(start);

    for (let i = 0; i < 5; i++) {
      const dayName = current.toLocaleDateString("en-US", { weekday: "long" });
      const formattedDate = current.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      result.push({
        date: formattedDate,
        time: `${dayName} · ${formattedTime}`,
        isFirst: i === 0,
      });

      // Advance by exact backend scheduling rules
      if (frequency === "MONTHLY") {
        current.setMonth(current.getMonth() + 1);
      } else if (frequency === "BIWEEKLY") {
        current.setDate(current.getDate() + 14);
      } else {
        // Default WEEKLY
        current.setDate(current.getDate() + 7);
      }
    }

    return result;
  }, [baseDate, frequency, refillTime]);

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200/70 shadow-xs">
      <div>
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Timeline items */}
      <div className="mt-4 space-y-4">
        {dates.map((item, index) => {
          const isLast = index === dates.length - 1;

          return (
            <div key={item.date} className="relative flex items-start gap-3">
              {/* Connecting line */}
              {!isLast && (
                <div className="absolute left-[5px] top-3 bottom-0 w-[1.5px] bg-slate-100" />
              )}

              {/* Indicator Dot */}
              <div className="mt-0.5 z-10 shrink-0">
                {item.isFirst ? (
                  <div className="h-3 w-3 rounded-full bg-[#1b5e3b] ring-2 ring-emerald-100" />
                ) : (
                  <div className="h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {item.date}
                  </span>
                  {item.isFirst && (
                    <span className="rounded-full bg-[#ecf9f0] px-2 py-0.5 text-[9px] font-bold text-[#1b5e3b]">
                      First refill
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Link */}
      <div className="mt-5 border-t border-slate-50 pt-3">
        <span className="text-xs font-bold text-[#1b5e3b] inline-flex items-center gap-1">
          <span>Automated refill cycle active</span>
        </span>
      </div>
    </div>
  );
}

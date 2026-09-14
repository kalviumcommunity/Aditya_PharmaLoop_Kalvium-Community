"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface StartDateCalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  title?: string;
  subtitle?: string;
}

export default function StartDateCalendar({
  value,
  onChange,
  title = "1. Choose Start Date",
  subtitle = "Select the date for your first refill order.",
}: StartDateCalendarProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Default to tomorrow for recurring deliveries
  const selectedDate = useMemo(() => {
    if (value) return new Date(value);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, [value]);

  const [viewDate, setViewDate] = useState(() => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });

  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Build calendar matrix
  const { monthLabel, rows } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const monthLabel = viewDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: Array<{
      day: number;
      date: Date;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isPast: boolean;
    }> = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = lastDayPrevMonth - i;
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      cells.push({
        day,
        date,
        isCurrentMonth: false,
        isSelected: false,
        isPast: date < today,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDayCurrentMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const isSelected =
        date.getFullYear() === selectedDate.getFullYear() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getDate() === selectedDate.getDate();

      cells.push({
        day,
        date,
        isCurrentMonth: true,
        isSelected,
        isPast: date < today,
      });
    }

    // Next month filler days to complete 35 or 42 grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      date.setHours(0, 0, 0, 0);
      cells.push({
        day,
        date,
        isCurrentMonth: false,
        isSelected: false,
        isPast: false,
      });
    }

    // Group into 7-day rows
    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return { monthLabel, rows };
  }, [viewDate, selectedDate]);

  const formattedSelected = selectedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-xs">
      <div>
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Calendar Header with Month and Arrows */}
      <div className="mt-4 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="Previous month"
          className="text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
        >
          &lsaquo;
        </button>
        <span className="text-xs font-bold text-slate-800">{monthLabel}</span>
        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Next month"
          className="text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
        >
          &rsaquo;
        </button>
      </div>

      {/* Days of week header */}
      <div className="mt-3 grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 tracking-wider">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="mt-1 space-y-1">
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-7 text-center text-xs">
            {row.map((item, cIdx) => {
              if (item.isSelected && isMounted) {
                return (
                  <div key={cIdx} className="py-1 flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b5e3b] text-white font-bold text-xs shadow-xs">
                      {item.day}
                    </span>
                  </div>
                );
              }

              if (item.isPast || !item.isCurrentMonth) {
                return (
                  <div key={cIdx} className="py-1 flex items-center justify-center">
                    <span className="text-xs text-slate-300 select-none">
                      {item.day}
                    </span>
                  </div>
                );
              }

              return (
                <div key={cIdx} className="py-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => onChange && onChange(item.date)}
                    className="h-7 w-7 rounded-full text-xs text-slate-700 font-medium hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {item.day}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Summary */}
      <div className="mt-4 border-t border-slate-100 pt-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <span>🗓️</span>
        <span className="text-[11px] text-[#1b5e3b]">
          First refill on {formattedSelected}
        </span>
      </div>
    </div>
  );
}

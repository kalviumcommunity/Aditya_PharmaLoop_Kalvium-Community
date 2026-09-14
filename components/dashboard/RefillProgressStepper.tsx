import React from "react";
import Link from "next/link";

interface RefillProgressStepperProps {
  currentStep?: number;
  entityId?: string;
}

export default function RefillProgressStepper({
  currentStep = 1,
  entityId,
}: RefillProgressStepperProps) {
  const idSegment = entityId || "";
  const steps = [
    {
      number: 1,
      label: "Schedule",
      href: idSegment ? `/subscriptions/${idSegment}/schedule` : "#",
    },
    {
      number: 2,
      label: "Payment",
      href: idSegment ? `/subscriptions/${idSegment}/payment` : "#",
    },
    { number: 3, label: "Review & Confirm", href: "#" },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const isLast = index === steps.length - 1;

        const content = (
          <div className="flex items-center gap-2 group cursor-pointer">
            <div
              className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                isCompleted
                  ? "bg-[#1b5e3b] text-white shadow-xs"
                  : isCurrent
                  ? "bg-[#1b5e3b] text-white shadow-xs ring-2 ring-emerald-100"
                  : "bg-[#f1f5f9] border border-slate-200 text-slate-400 group-hover:border-slate-300"
              }`}
            >
              {isCompleted ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-xs ${
                isCurrent
                  ? "font-bold text-slate-900"
                  : isCompleted
                  ? "font-medium text-slate-800"
                  : "font-medium text-slate-400 group-hover:text-slate-600"
              } hidden sm:inline`}
            >
              {step.label}
            </span>
          </div>
        );

        return (
          <React.Fragment key={step.number}>
            {step.href !== "#" ? (
              <Link href={step.href}>
                {content}
              </Link>
            ) : (
              content
            )}

            {!isLast && (
              <div className="w-6 sm:w-10 h-[1.5px] bg-slate-200" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

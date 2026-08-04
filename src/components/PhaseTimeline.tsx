import React from 'react';
import { Check, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn, Phase, PHASES, PHASE_TIMELINE_ORDER } from '../lib/utils';

interface PhaseTimelineProps {
  /** Phase to highlight as "current". Pass 'design' while phase is 'changes_requested' — it's a detour back to Design, not a step of its own. */
  displayPhase: Phase;
  isChangesRequested: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function PhaseTimeline({ displayPhase, isChangesRequested, canGoBack, canGoNext, onPrev, onNext }: PhaseTimelineProps) {
  const currentIndex = PHASE_TIMELINE_ORDER.indexOf(displayPhase);

  return (
    <div className="flex items-center gap-1.5 w-full overflow-x-auto scrollbar-hide py-1">
      {canGoBack && (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Volver a la fase anterior"
          title="Volver a la fase anterior"
          className="shrink-0 p-1 rounded-full text-gray-400 hover:text-app-accent hover:bg-app-accent/10 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {PHASE_TIMELINE_ORDER.map((phase, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isClickablePrev = isCurrent === false && idx === currentIndex - 1 && canGoBack;
        const isClickableNext = isCurrent === false && idx === currentIndex + 1 && canGoNext;
        const isClickable = isClickablePrev || isClickableNext;

        return (
          <React.Fragment key={phase}>
            {idx > 0 && (
              <div className={cn("h-0.5 flex-1 min-w-[16px] rounded-full transition-colors", idx <= currentIndex ? "bg-app-accent" : "bg-gray-200")} />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => (isClickablePrev ? onPrev() : isClickableNext ? onNext() : undefined)}
              title={isClickable ? `Mover a ${PHASES[phase].shortLabel}` : PHASES[phase].shortLabel}
              className={cn(
                "shrink-0 flex flex-col items-center gap-1 transition-all",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <span className={cn(
                "relative w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all",
                isCurrent
                  ? "bg-app-accent border-app-accent text-white shadow-sm shadow-app-accent/30 scale-110"
                  : isDone
                    ? "bg-app-accent/10 border-app-accent text-app-accent"
                    : "bg-white border-gray-200 text-gray-300",
                isClickable && "hover:scale-110 hover:border-app-accent"
              )}>
                {isDone ? <Check size={13} /> : idx + 1}
                {isCurrent && isChangesRequested && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                    <AlertTriangle size={9} />
                  </span>
                )}
              </span>
              <span className={cn(
                "text-[10px] font-bold whitespace-nowrap",
                isCurrent ? "text-app-accent" : isDone ? "text-gray-500" : "text-gray-300"
              )}>
                {PHASES[phase].shortLabel}
              </span>
            </button>
          </React.Fragment>
        );
      })}

      {canGoNext && (
        <button
          type="button"
          onClick={onNext}
          aria-label="Avanzar a la siguiente fase"
          title="Avanzar a la siguiente fase"
          className="shrink-0 p-1 rounded-full text-gray-400 hover:text-app-accent hover:bg-app-accent/10 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

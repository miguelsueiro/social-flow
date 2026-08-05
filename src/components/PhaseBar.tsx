import React from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn, Phase, PHASES, PHASE_TIMELINE_ORDER } from '../lib/utils';

interface PhaseBarProps {
  /** Phase to highlight as "current". Pass 'design' while phase is 'changes_requested' — it's a detour back to Design, not a step of its own. */
  displayPhase: Phase;
  isChangesRequested: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function PhaseBar({ displayPhase, isChangesRequested, canGoBack, canGoNext, onPrev, onNext }: PhaseBarProps) {
  const currentIndex = PHASE_TIMELINE_ORDER.indexOf(displayPhase);
  const total = PHASE_TIMELINE_ORDER.length;
  const prevLabel = currentIndex > 0 ? PHASES[PHASE_TIMELINE_ORDER[currentIndex - 1]].shortLabel : null;
  const nextLabel = currentIndex > -1 && currentIndex + 1 < total ? PHASES[PHASE_TIMELINE_ORDER[currentIndex + 1]].shortLabel : null;

  return (
    <div className="flex items-center gap-3">
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0",
        isChangesRequested ? PHASES.changes_requested.color : PHASES[displayPhase].color
      )}>
        {isChangesRequested && <AlertTriangle size={12} />}
        {isChangesRequested ? PHASES.changes_requested.shortLabel : PHASES[displayPhase].shortLabel}
        <span className="opacity-50 font-semibold tabular-nums">{currentIndex + 1}/{total}</span>
      </span>

      {/* Progress track: purely glanceable, deliberately not clickable — phase changes
          go through the labelled buttons, which have a real hit area. */}
      <div className="hidden sm:flex items-center gap-1 flex-1 min-w-[60px]" aria-hidden="true">
        {PHASE_TIMELINE_ORDER.map((phase, idx) => (
          <span
            key={phase}
            className={cn("h-1 flex-1 rounded-full transition-colors", idx <= currentIndex ? "bg-app-accent" : "bg-gray-200")}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
        {canGoBack && (
          <button
            type="button"
            onClick={onPrev}
            title={`Devolver a ${prevLabel}`}
            className="flex items-center gap-1 min-h-9 px-3 py-2 rounded-lg border border-divider bg-white text-ink-secondary hover:text-ink hover:border-outline hover:bg-gray-50 text-xs font-bold transition-colors"
          >
            <ChevronLeft size={14} />
            <span className="hidden md:inline">{prevLabel}</span>
            <span className="md:hidden">Atrás</span>
          </button>
        )}
        {canGoNext && (
          <button
            type="button"
            onClick={onNext}
            title={`Avanzar a ${nextLabel}`}
            className="flex items-center gap-1 min-h-9 px-3.5 py-2 rounded-lg bg-app-accent text-white hover:bg-app-accent-hover text-xs font-bold shadow-sm transition-colors"
          >
            <span className="hidden md:inline">{nextLabel}</span>
            <span className="md:hidden">Avanzar</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

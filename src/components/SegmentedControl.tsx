import { ComponentType } from 'react';
import { cn } from '../lib/utils';

interface SegmentedOption {
  value: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  /** Segments fill the container's width equally (the feed sidebars' case) by
   *  default; set false for an inline, content-width control (the Calendar/
   *  Board view switcher, which sits in a toolbar next to other controls). */
  fullWidth?: boolean;
  className?: string;
}

/** Consolidates the app's 5 hand-rolled "pick one of two/three" pill toggles
 *  (filter-phase and device-mode in each of the 3 feed sidebars, the Calendar/
 *  Board view switcher) — same idea, previously reimplemented per call site
 *  with a one-shade track-color mismatch (gray-50 vs gray-100) and a
 *  different active-text color (plain ink vs the accent). Both are now fixed
 *  as a single choice: gray-100 track, accent-colored active label. */
export default function SegmentedControl({ options, value, onChange, fullWidth = true, className, ...rest }: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn(
        'p-1 bg-gray-100 rounded-xl border border-divider',
        fullWidth ? 'grid gap-1.5' : 'inline-flex gap-1',
        className
      )}
      style={fullWidth ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all',
              fullWidth ? 'py-1.5' : 'px-4 py-2',
              isActive ? 'bg-white text-app-accent shadow-sm' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {opt.icon && <opt.icon size={14} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

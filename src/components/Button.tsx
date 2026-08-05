import { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner in place of the button's own content and sets aria-busy,
   *  without changing the button's width (children stay mounted, just hidden). */
  loading?: boolean;
}

// ink-secondary/ink for text rather than ink-muted: an actionable label reads
// as a control, not as metadata, so it gets the stronger of the two role tones.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-app-accent hover:bg-app-accent-hover text-white shadow-sm hover:shadow-md',
  secondary: 'bg-white border border-outline text-ink-secondary hover:bg-gray-50 hover:text-ink hover:shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
  ghost: 'text-ink-secondary hover:text-ink hover:bg-gray-50'
};

// min-h-* guarantees the touch target regardless of label length/wrapping —
// 40px (sm) / 48px (md), matching the design system's target. Reviewed all
// 11 existing call sites individually before applying this (see Phase 4b):
// none pin a conflicting fixed height, and the couple of className="py-2"
// overrides matched the old default exactly (i.e. were already no-ops).
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-10 text-xs px-3 rounded-md gap-1.5',
  md: 'min-h-12 text-sm px-4 rounded-md gap-2'
};

/** Shared button treatment (variant + size) — the app had ~7 divergent
 * primary-button styles across components before this existed. Not every
 * button in the app has been migrated yet; this establishes the pattern for
 * new buttons and for gradually converting the rest. Keyboard focus is
 * handled globally (index.css's button:focus-visible rule) — no per-variant
 * focus ring needed here. */
export default function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center font-bold transition-all duration-200 ease-out active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="absolute animate-spin" aria-hidden="true" />}
      {/* Content dims rather than the whole button, so a disabled control still
          reads as "the same control" rather than losing its shape — WCAG 1.4.3
          exempts disabled content from contrast requirements, this is a
          legibility choice, not a compliance one. */}
      <span className={cn('inline-flex items-center gap-2', isDisabled && 'opacity-40', loading && 'opacity-0')}>
        {children}
      </span>
    </button>
  );
}

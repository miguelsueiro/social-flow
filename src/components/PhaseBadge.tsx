import { Phase, PHASES } from '../lib/utils';
import Chip from './Chip';

interface PhaseBadgeProps {
  phase: Phase;
  /** 'short' uses PHASES[].shortLabel (e.g. "Diseño") for tight spaces —
   *  feed cards, search results. 'full' uses the descriptive label (e.g.
   *  "Fase 3: Diseño") for contexts with more room, like the post modal
   *  header. */
  variant?: 'short' | 'full';
  size?: 'sm' | 'md';
  className?: string;
}

/** Reads phase label/color from the single PHASES source of truth in
 *  lib/utils.ts — replaces 4 call sites that each independently decided how
 *  to render "the phase of this post" (different padding, and one read the
 *  label but not through PHASES at all). Never hardcode a phase color
 *  outside PHASES; add it there so every consumer, including this one,
 *  stays in sync. */
export default function PhaseBadge({ phase, variant = 'short', size = 'sm', className }: PhaseBadgeProps) {
  const info = PHASES[phase];
  return (
    <Chip size={size} className={`${info.color} ${className || ''}`}>
      {variant === 'short' ? info.shortLabel : info.label}
    </Chip>
  );
}

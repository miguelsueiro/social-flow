import { ReactNode } from 'react';
import { cn } from '../lib/utils';

type ChipSize = 'sm' | 'md';

const SIZE_CLASSES: Record<ChipSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

interface ChipProps {
  children: ReactNode;
  size?: ChipSize;
  /** Tailwind color classes for text + background (e.g. "text-emerald-700
   *  bg-emerald-100"). Chip doesn't own a color palette — the app already has
   *  several deliberate categorical ones (phase, notification type, tutorial
   *  step) that must stay distinct from each other, so forcing a single
   *  "chip color" token here would fight that rather than support it. */
  className?: string;
}

/** Consolidates the app's ~19 pill/badge elements down to one shape (rounded-full,
 *  inline-flex, font-bold) with 2 sizes — the audit found 6 different padding
 *  combinations for what all render as "small labeled pill". */
export default function Chip({ children, size = 'md', className }: ChipProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full font-bold', SIZE_CLASSES[size], className)}>
      {children}
    </span>
  );
}

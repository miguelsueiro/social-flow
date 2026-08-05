import { ComponentType } from 'react';
import { cn } from '../lib/utils';

type EmptyStateSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<EmptyStateSize, { wrap: string; icon: number; title: string; description: string }> = {
  sm: { wrap: 'py-6', icon: 28, title: 'text-xs font-medium text-gray-400', description: 'text-caption text-ink-muted' },
  md: { wrap: 'py-16', icon: 40, title: 'text-sm font-bold text-gray-600', description: 'text-caption text-ink-muted mt-1' },
  lg: { wrap: 'py-20', icon: 48, title: 'text-sm font-bold text-gray-600', description: 'text-caption text-ink-muted mt-1' },
};

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  size?: EmptyStateSize;
  /** Adds the dashed-border card treatment used for "drop zone"-like empty
   *  states (feeds, boards). Off by default — several existing call sites
   *  (inline lists, comment threads) are empty states without a card. */
  bordered?: boolean;
  className?: string;
}

/** Consolidates the app's ~12 "nothing here" messages, which the audit found
 *  in 5 different text colors and 2 different weight/size combinations for
 *  what's structurally the same message: an icon, a title, an optional
 *  supporting line. */
export default function EmptyState({ icon: Icon, title, description, size = 'md', bordered = false, className }: EmptyStateProps) {
  const s = SIZE_CLASSES[size];
  return (
    <div className={cn(
      'text-center',
      s.wrap,
      bordered && 'bg-gray-50 rounded-2xl border border-dashed border-gray-200',
      className
    )}>
      {Icon && <Icon size={s.icon} className="mx-auto text-gray-300 mb-2" />}
      <p className={s.title}>{title}</p>
      {description && <p className={s.description}>{description}</p>}
    </div>
  );
}

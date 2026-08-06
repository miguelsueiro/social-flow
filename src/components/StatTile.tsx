import { ComponentType } from 'react';
import { cn } from '../lib/utils';

interface StatTileProps {
  label: string;
  value: number | string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Colors the icon chip only — the value stays neutral ink. The two stat
   *  surfaces this replaces each colored BOTH the icon chip and the value
   *  text with the same semantic color, which doubled up the signal without
   *  adding hierarchy; a count is not more or less "orange" than another. */
  tone?: 'default' | 'accent' | 'warning' | 'success';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatTileProps['tone']>, string> = {
  default: 'bg-gray-100 text-ink-secondary',
  accent: 'bg-app-accent/10 text-app-accent',
  warning: 'bg-orange-50 text-orange-600',
  success: 'bg-emerald-50 text-emerald-600',
};

/** Consolidates the app's 2 stat-tile visual languages (project-card totals:
 *  label+value only; Calendar's stats bar: same data plus an oversized
 *  colored icon chip duplicating the value's own color) into one. */
export default function StatTile({ label, value, icon: Icon, tone = 'default', className }: StatTileProps) {
  return (
    <div className={cn('bg-white p-4 rounded-2xl border border-divider shadow-sm flex items-center gap-4', className)}>
      {Icon && (
        <div className={cn('p-3 rounded-xl shrink-0', TONE_CLASSES[tone])}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-caption text-ink-muted leading-none mb-1 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-black text-ink">{value}</p>
      </div>
    </div>
  );
}

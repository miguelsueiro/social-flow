import { cn } from '../lib/utils';

interface ProjectTagProps {
  name: string;
  color: string;
  /** 'subtle' for secondary/inline context (search suggestions), 'default'
   *  for a standalone label (sidebar footer), 'strong' for a badge that needs
   *  to hold its own next to a title (PostModal's header). */
  emphasis?: 'subtle' | 'default' | 'strong';
  className?: string;
}

/** Consolidates the app's 4 divergent "which project is this" markers — a
 *  color dot, a solid contrast-derived pill, a raw-color-tinted chip, and an
 *  initial-letter avatar square — into one Linear-style dot. Unlike the pill/
 *  chip variants it replaces, the project's raw color only ever paints a
 *  small decorative dot here; the label stays on neutral ink, which sidesteps
 *  the contrast problem those variants each had to solve on their own
 *  (an arbitrary brand color has no guaranteed contrast as text or a fill
 *  behind white text) rather than fixing it per call site. */
export default function ProjectTag({ name, color, emphasis = 'default', className }: ProjectTagProps) {
  const dot = (
    <span
      className={cn('rounded-full shrink-0', emphasis === 'default' ? 'w-3.5 h-3.5' : 'w-2 h-2')}
      style={{ backgroundColor: color }}
    />
  );

  if (emphasis === 'strong') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-divider shrink-0', className)}>
        {dot}
        <span className="text-[11px] font-bold text-ink truncate">{name}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2 min-w-0', className)}>
      {dot}
      <span className={cn('truncate', emphasis === 'subtle' ? 'text-xs font-medium text-ink-secondary' : 'text-xs font-bold text-ink')}>
        {name}
      </span>
    </span>
  );
}

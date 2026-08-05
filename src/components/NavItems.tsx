import { ComponentType } from 'react';
import { cn } from '../lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  /** Brand color for platform icons (Instagram/LinkedIn/TikTok) — worn on the
   *  icon itself even when the item isn't active, unlike the plain ink-muted
   *  every other icon defaults to. */
  iconColor?: string;
}

interface NavItemsProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  orientation: 'vertical' | 'horizontal';
  className?: string;
}

/** Consolidates the sidebar's and mobile bottom bar's nav lists, which used to
 *  be two independently hand-copied item arrays with two different active-state
 *  languages (a filled pill on desktop, plain text-color on mobile) — the same
 *  "this is where you are" signal read as two different systems depending on
 *  screen size. Both orientations now share one active-state treatment: a
 *  pill, sized to fit each layout (full-width row vertically, a compact chip
 *  behind the icon horizontally). */
export default function NavItems({ items, activeId, onSelect, orientation, className }: NavItemsProps) {
  if (orientation === 'horizontal') {
    return (
      <nav className={cn('flex items-center justify-around', className)}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-0.5 text-[11px] font-extrabold transition-all"
            >
              <span className={cn('flex items-center justify-center w-8 h-6 rounded-full transition-all', isActive && 'bg-app-accent/10')}>
                <item.icon
                  size={18}
                  className={cn('transition-all', !item.iconColor && (isActive ? 'text-app-accent' : 'text-ink-muted'))}
                  style={item.iconColor ? { color: item.iconColor } : undefined}
                />
              </span>
              <span className={cn('truncate transition-all', isActive ? 'text-app-accent font-black' : 'text-ink-muted')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={cn('space-y-1', className)}>
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group',
              isActive ? 'bg-app-accent/10 text-app-accent' : 'text-ink-muted hover:text-ink-secondary hover:bg-gray-50'
            )}
          >
            <item.icon
              size={18}
              className={cn('transition-all shrink-0', !item.iconColor && (isActive ? 'text-app-accent' : 'text-ink-muted'))}
              style={item.iconColor ? { color: item.iconColor } : undefined}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

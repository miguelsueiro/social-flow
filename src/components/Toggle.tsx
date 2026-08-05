import { cn } from '../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Required, not optional — used as the switch's aria-label. The app's 8
   *  existing copies all pass one already; this just makes it structural. */
  label: string;
  className?: string;
}

/** Consolidates the app's 8 hand-built role="switch" toggles (3 slightly
 *  different variants, 3 copies with no type="button" — a real bug inside a
 *  <form>, since a typeless button submits it) into one control. Same
 *  geometry as all 8 originals (h-6 w-11 track, h-4 w-4 thumb) so migrating
 *  a call site is a drop-in replacement, not a visual change. Keyboard focus
 *  is handled globally (index.css's [role="switch"]:focus-visible rule). */
export default function Toggle({ checked, onChange, disabled, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-app-accent' : 'bg-gray-200',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
